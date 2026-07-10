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

/**
 * Compute contract ratings (LEGENDARY / CORNERSTONE / STEAL / GOOD / ROOKIE / BUST)
 * for an entire list of contracts in one pass — no per-contract DB calls.
 *
 * Uses the cached Sleeper season stats for PPG, position rank among signed
 * players, and a quick market estimate. Mirrors the logic used on the
 * contract detail page, in a bulk-friendly form.
 *
 * Returns a map of contract id → rating.
 */
export async function computeBulkRatings(
  contracts: Contract[]
): Promise<Record<string, ContractRating>> {
  const stats = await getSleeperSeasonStats(STATS_SEASON);

  // Position ranks by PPG among signed players
  const byPosition: Record<string, { contractId: string; ppg: number }[]> = {};
  contracts.forEach((c) => {
    const p = c.player;
    if (!p) return;
    const ppg = stats[p.id]?.ppg_ppr ?? 0;
    if (!byPosition[p.position]) byPosition[p.position] = [];
    byPosition[p.position].push({ contractId: c.id, ppg });
  });

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
    const marketValue = quickEstimate(p.position, ppg, p.age ?? 26);
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
