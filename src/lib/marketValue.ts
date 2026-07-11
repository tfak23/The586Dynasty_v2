import { POSITION_RANGES, RATINGS } from './constants';

export type Rating = typeof RATINGS[keyof typeof RATINGS];

// ─── Positional aging curves ─────────────────────────────────────────────────
//
// Derived from historical fantasy production aging studies:
// • RB — peak 22–25; production drops ~10%/yr from 26 and falls off a cliff
//   after 28 (historically <5% of RBs post a top-12 season after age 29).
// • WR — peak 24–27; gradual decline (~6%/yr) from 28, steep after 30.
// • TE — develop late, peak 25–28; decline ~5%/yr from 29, steep after 31.
// • QB — hold value deep into their 30s; mild decline (~5%/yr) from 35,
//   steep after 38.
//
// These curves drive two things:
// 1. A mild adjustment to single-year market value (half-weighted, since
//    current PPG already reflects the player's age).
// 2. Contract-length discounting: a multi-year deal for an aging player is
//    priced at the average of his projected value over every year of the
//    deal — e.g. a 29-year-old RB is worth far less per year on a 4-year
//    contract than on a 1-year contract.

interface AgeCurve {
  peakEnd: number;      // last age of peak production (multiplier = 1.0)
  declineRate: number;  // per-year value loss after peak
  cliffAge: number;     // age after which decline steepens
  cliffRate: number;    // per-year value loss past the cliff
  youngBoostMaxAge: number; // small upside premium at or below this age
}

const AGE_CURVES: Record<string, AgeCurve> = {
  QB: { peakEnd: 34, declineRate: 0.05, cliffAge: 38, cliffRate: 0.15, youngBoostMaxAge: 24 },
  RB: { peakEnd: 25, declineRate: 0.10, cliffAge: 28, cliffRate: 0.20, youngBoostMaxAge: 23 },
  WR: { peakEnd: 27, declineRate: 0.06, cliffAge: 30, cliffRate: 0.15, youngBoostMaxAge: 23 },
  TE: { peakEnd: 28, declineRate: 0.05, cliffAge: 31, cliffRate: 0.15, youngBoostMaxAge: 24 },
};

/** Projected value multiplier for a player of this position at this age (1.0 = peak). */
export function ageMultiplier(position: string, age: number): number {
  const curve = AGE_CURVES[position] ?? AGE_CURVES.WR;
  if (age <= curve.youngBoostMaxAge) return 1.05;
  if (age <= curve.peakEnd) return 1.0;
  let mult = 1.0;
  for (let a = curve.peakEnd + 1; a <= age; a++) {
    mult *= a > curve.cliffAge ? 1 - curve.cliffRate : 1 - curve.declineRate;
  }
  return Math.max(0.1, mult);
}

/**
 * Average projected value over an N-year contract, relative to the player's
 * value today. 1.0 for players who won't decline during the deal; lower for
 * aging players on longer deals.
 */
export function contractLengthFactor(position: string, age: number, years: number): number {
  const now = ageMultiplier(position, age);
  if (now <= 0 || years <= 1) return 1;
  let sum = 0;
  for (let k = 0; k < years; k++) {
    sum += Math.min(1, ageMultiplier(position, age + k) / now);
  }
  return sum / years;
}

/** Per-year salary for an N-year deal, discounted by the aging curve. */
export function lengthAdjustedSalary(
  baseSalary: number,
  position: string,
  age: number,
  years: number
): number {
  return Math.max(1, Math.round(baseSalary * contractLengthFactor(position, age, years)));
}

export interface YearsSalary {
  years: number;
  salary: number;
}

/** Suggested per-year salary for each contract length 1..maxYears. */
export function salaryByContractLength(
  baseSalary: number,
  position: string,
  age: number,
  maxYears = 5
): YearsSalary[] {
  return Array.from({ length: maxYears }, (_, i) => ({
    years: i + 1,
    salary: lengthAdjustedSalary(baseSalary, position, age, i + 1),
  }));
}

// ─── Comparables-based market value ──────────────────────────────────────────

export interface MarketComp {
  id?: string;
  ppg: number;
  salary: number;
}

/**
 * Weighted average salary of the `count` nearest-PPG contracts in the pool.
 * Weight = 1 / (1 + |ppg diff|). Returns null with fewer than 2 usable comps.
 */
export function weightedComparablesValue(
  selfPpg: number,
  pool: MarketComp[],
  excludeId?: string,
  count = 5
): number | null {
  const comps = pool
    .filter((e) => e.id !== excludeId && e.ppg > 0)
    .sort((a, b) => Math.abs(a.ppg - selfPpg) - Math.abs(b.ppg - selfPpg))
    .slice(0, count);
  if (comps.length < 2) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const comp of comps) {
    const w = 1 / (1 + Math.abs(comp.ppg - selfPpg));
    weightedSum += comp.salary * w;
    totalWeight += w;
  }
  return Math.round(weightedSum / totalWeight);
}

// ─── Elite market floor ──────────────────────────────────────────────────────

export const ELITE_RANK = 5;

/**
 * Top-5 producers at a position command top-of-market money regardless of
 * what a few underpaid comps suggest. Floors the market estimate at the
 * 5th-highest salary at the position. Returns null if not applicable.
 */
export function eliteMarketFloor(
  positionRank: number | null,
  ppg: number,
  salariesAtPosition: number[]
): number | null {
  if (positionRank === null || positionRank > ELITE_RANK) return null;
  if (ppg < 8 || salariesAtPosition.length === 0) return null;
  const desc = [...salariesAtPosition].sort((a, b) => b - a);
  return desc[Math.min(ELITE_RANK - 1, desc.length - 1)];
}

// ─── Unified contract rating scheme ──────────────────────────────────────────
//
// ROOKIE      — first contract, no meaningful stats yet.
// LEGENDARY   — top-5 positional scorer AND 25%+ below market: elite player,
//               bargain price. The best of both worlds.
// CORNERSTONE — top-5 positional scorer at any price. These players are
//               franchise pieces and will almost always carry a premium.
// STEAL       — 25%+ below market with at least $5 of real savings.
// GOOD        — within ±25% of market (fair deal).
// BUST        — 25%+ over market AND at least $8 of real overpay (dollar
//               guard keeps small contracts from flagging as busts).

export const RATING_THRESHOLDS = {
  STEAL_PCT: 0.25,
  STEAL_MIN_DOLLARS: 5,
  BUST_PCT: -0.25,
  BUST_MIN_DOLLARS: 8,
  CORNERSTONE_RANK: ELITE_RANK,
  CORNERSTONE_MIN_PPG: 8,
  LEGENDARY_MIN_PPG: 10,
} as const;

export function determineContractRating(params: {
  salary: number;
  estimated: number;
  ppg: number;
  positionRank: number | null;
  isRookie: boolean;
}): Rating {
  const { salary, estimated, ppg, positionRank, isRookie } = params;
  const T = RATING_THRESHOLDS;

  if (isRookie) return RATINGS.ROOKIE;

  const vPct = estimated > 0 ? (estimated - salary) / estimated : 0;
  const dollarDiff = estimated - salary;

  const isTopScorer =
    positionRank !== null &&
    positionRank <= T.CORNERSTONE_RANK &&
    ppg >= T.CORNERSTONE_MIN_PPG;

  // Elite production at a bargain price
  if (
    isTopScorer &&
    ppg >= T.LEGENDARY_MIN_PPG &&
    vPct >= T.STEAL_PCT &&
    dollarDiff >= T.STEAL_MIN_DOLLARS
  ) {
    return RATINGS.LEGENDARY;
  }

  // Top-5 scorers are cornerstones no matter what they cost
  if (isTopScorer) return RATINGS.CORNERSTONE;

  if (vPct >= T.STEAL_PCT && dollarDiff >= T.STEAL_MIN_DOLLARS) return RATINGS.STEAL;
  if (vPct <= T.BUST_PCT && -dollarDiff >= T.BUST_MIN_DOLLARS) return RATINGS.BUST;
  return RATINGS.GOOD;
}

// ─── Free-agent value (bulk, in-memory) ──────────────────────────────────────

const FALLBACK_MULTIPLIER: Record<string, number> = { QB: 3.5, RB: 2.5, WR: 2.5, TE: 2.5 };

/**
 * Market value for an unsigned player using the same comparables logic as the
 * free-agent profile page: weighted 5-nearest-PPG signed contracts at the
 * position, elite floor for top-5 producers, half-weighted age adjustment.
 * Pure calculation — pool is built by the caller from signed contracts.
 */
export function estimateFreeAgentValue(
  position: string,
  ppg: number,
  age: number,
  pool: MarketComp[]
): number {
  let estimate =
    weightedComparablesValue(ppg, pool) ??
    Math.round(ppg * (FALLBACK_MULTIPLIER[position] ?? 2.5));

  // Elite floor: top-5 PPG among signed players at the position
  const rank = pool.filter((e) => e.ppg > ppg).length + 1;
  const floor = eliteMarketFloor(rank, ppg, pool.map((e) => e.salary));
  if (floor !== null) estimate = Math.max(estimate, floor);

  // Half-weighted age adjustment (current PPG already reflects age)
  estimate = Math.round((estimate * (1 + ageMultiplier(position, age))) / 2);

  const range = POSITION_RANGES[position] ?? { min: 1, max: 70 };
  return Math.max(range.min, Math.min(estimate, range.max));
}
