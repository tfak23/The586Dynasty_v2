import { getSleeperSeasonStats } from './sleeperStats';
import { quickEstimate } from './contractCalculations';
import type { ContractRating } from './contractCalculations';
import {
  determineContractRating,
  eliteMarketFloor,
  weightedComparablesValue,
} from './marketValue';
import { RATINGS } from './constants';
import type { Contract } from '../types';

// Season to use for stats (most recent completed NFL season)
const STATS_SEASON = '2025';

/** Display / sort order for contract ratings (best → worst, rookies grouped before busts). */
export const RATING_ORDER: ContractRating[] = [
  RATINGS.LEGENDARY,
  RATINGS.CORNERSTONE,
  RATINGS.STEAL,
  RATINGS.GOOD,
  RATINGS.ROOKIE,
  RATINGS.BUST,
];

export function ratingSortIndex(rating: ContractRating | undefined): number {
  if (!rating) return RATING_ORDER.length;
  const idx = RATING_ORDER.indexOf(rating);
  return idx === -1 ? RATING_ORDER.length : idx;
}

interface Entry {
  contractId: string;
  ppg: number;
  salary: number;
}

/**
 * Compute contract ratings (LEGENDARY / CORNERSTONE / STEAL / GOOD / ROOKIE / BUST)
 * for an entire list of contracts in one pass — no per-contract DB calls.
 *
 * Uses cached Sleeper season stats for PPG, position rank among signed
 * players, and a comparables-based market estimate.
 *
 * Returns a map of contract id → rating.
 */
export async function computeBulkRatings(
  contracts: Contract[]
): Promise<Record<string, ContractRating>> {
  const stats = await getSleeperSeasonStats(STATS_SEASON);

  // Per-position pools with PPG + salary
  const byPosition: Record<string, Entry[]> = {};
  contracts.forEach((c) => {
    const p = c.player;
    if (!p) return;
    const ppg = stats[p.id]?.ppg_ppr ?? 0;
    if (!byPosition[p.position]) byPosition[p.position] = [];
    byPosition[p.position].push({ contractId: c.id, ppg, salary: c.salary });
  });

  // Position ranks by PPG among signed players
  const rankByContract: Record<string, number> = {};
  Object.values(byPosition).forEach((list) => {
    [...list]
      .sort((a, b) => b.ppg - a.ppg)
      .forEach((entry, i) => {
        rankByContract[entry.contractId] = i + 1;
      });
  });

  const ratings: Record<string, ContractRating> = {};
  contracts.forEach((c) => {
    const p = c.player;
    if (!p) return;
    const ppg = stats[p.id]?.ppg_ppr ?? 0;
    const gamesPlayed = stats[p.id]?.gp ?? 0;
    const pool = byPosition[p.position] ?? [];
    const positionRank = rankByContract[c.id] ?? null;

    // Market value: weighted 5-nearest-PPG comps (excluding self), with an
    // elite floor for top-5 producers so cheap comps don't drag them down.
    let marketValue =
      weightedComparablesValue(
        ppg,
        pool.map((e) => ({ id: e.contractId, ppg: e.ppg, salary: e.salary })),
        c.id
      ) ?? quickEstimate(p.position, ppg, p.age ?? 26);
    const floor = eliteMarketFloor(
      positionRank,
      ppg,
      pool.filter((e) => e.contractId !== c.id).map((e) => e.salary)
    );
    if (floor !== null) marketValue = Math.max(marketValue, floor);

    // True rookie: rookie contract, <2 years exp, no meaningful production yet
    const isRookie =
      c.contract_type === 'rookie' &&
      (p.years_exp ?? 0) < 2 &&
      !(gamesPlayed >= 6 && ppg >= 5);

    ratings[c.id] = determineContractRating({
      salary: c.salary,
      estimated: marketValue,
      ppg,
      positionRank,
      isRookie,
    });
  });

  return ratings;
}
