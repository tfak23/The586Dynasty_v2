import { getSleeperSeasonStats } from './sleeperStats';
import { quickEstimate, evaluateContractRating } from './contractCalculations';
import type { ContractRating } from './contractCalculations';
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
 * Market value from comparable signed contracts: weighted average of the 5
 * nearest-PPG contracts at the same position (excluding the player himself).
 * Mirrors the comparables logic on the contract detail page, but fully
 * in-memory — no absolute position-max clamp, so elite contracts are judged
 * against other elite salaries rather than a fixed ceiling.
 */
function comparablesMarketValue(self: Entry, positionPool: Entry[]): number | null {
  const comps = positionPool
    .filter((e) => e.contractId !== self.contractId && e.ppg > 0)
    .sort((a, b) => Math.abs(a.ppg - self.ppg) - Math.abs(b.ppg - self.ppg))
    .slice(0, 5);
  if (comps.length < 2) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const comp of comps) {
    const w = 1 / (1 + Math.abs(comp.ppg - self.ppg));
    weightedSum += comp.salary * w;
    totalWeight += w;
  }
  return Math.round(weightedSum / totalWeight);
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
    const pool = byPosition[p.position] ?? [];
    const self: Entry = { contractId: c.id, ppg, salary: c.salary };
    const marketValue =
      comparablesMarketValue(self, pool) ?? quickEstimate(p.position, ppg, p.age ?? 26);
    ratings[c.id] = evaluateContractRating(
      c.salary,
      marketValue,
      rankByContract[c.id] ?? null,
      ppg,
      c.contract_type === 'rookie'
    );
  });

  return ratings;
}
