import { DEAD_CAP_PERCENTAGES, MIN_SALARIES, POSITION_RANGES, RATINGS } from './constants';

export type ContractRating = typeof RATINGS[keyof typeof RATINGS];

export interface ContractEvaluation {
  rating: ContractRating;
  marketValue: number;
  valueDifference: number;
  valuePct: number;
  reasoning: string;
  comparables: ComparableContract[];
  stats: PlayerStats | null;
}

export interface ComparableContract {
  playerName: string;
  salary: number;
  position: string;
  ppg: number;
}

export interface PlayerStats {
  ppg: number;
  gamesPlayed: number;
  totalPoints: number;
  positionRank: number;
}

/**
 * Calculate dead cap schedule when releasing a player
 */
export function calculateDeadCap(
  salary: number,
  yearsRemaining: number
): { year: number; percentage: number; amount: number }[] {
  // $1 contracts retain 100% dead cap
  if (salary <= 1) {
    return [{ year: 1, percentage: 1, amount: 1 }];
  }

  const percentages = DEAD_CAP_PERCENTAGES[yearsRemaining] ?? [0.5];
  return percentages.map((pct, i) => ({
    year: i + 1,
    percentage: pct,
    amount: Math.ceil(salary * pct),
  }));
}

/**
 * Calculate total dead cap hit from releasing a contract
 */
export function totalDeadCap(salary: number, yearsRemaining: number): number {
  const schedule = calculateDeadCap(salary, yearsRemaining);
  return schedule.reduce((sum, s) => sum + s.amount, 0);
}

/**
 * Get minimum salary for a contract length
 */
export function getMinSalary(years: number): number {
  return MIN_SALARIES[years] ?? 1;
}

/**
 * Validate a salary against position range
 */
export function validateSalary(
  position: string,
  salary: number,
  years: number
): { valid: boolean; reason?: string } {
  const range = POSITION_RANGES[position];
  if (!range) return { valid: true };

  const min = getMinSalary(years);
  if (salary < min) {
    return { valid: false, reason: `Minimum salary for ${years}-year contract is $${min}` };
  }
  if (salary > range.max) {
    return { valid: false, reason: `Maximum ${position} salary is $${range.max}` };
  }
  return { valid: true };
}

/**
 * Quick estimate of contract value based on PPG, position, and age
 */
export function quickEstimate(
  position: string,
  ppg: number,
  age: number,
  prevSalary?: number
): number {
  // PPG multipliers by position
  const multipliers: Record<string, number> = {
    QB: 4.5,
    RB: 3.5,
    WR: 3.8,
    TE: 3.5,
  };

  const multiplier = multipliers[position] ?? 3.5;
  let estimate = Math.round(ppg * multiplier);

  // Age adjustment
  if (position === 'RB' && age >= 28) {
    estimate = Math.round(estimate * 0.8);
  } else if (age >= 30) {
    estimate = Math.round(estimate * 0.85);
  } else if (age <= 23) {
    estimate = Math.round(estimate * 1.1);
  }

  // Previous salary anchor (if available, pulls estimate toward previous value)
  if (prevSalary && prevSalary > 0) {
    estimate = Math.round(estimate * 0.7 + prevSalary * 0.3);
  }

  // Clamp to position range
  const range = POSITION_RANGES[position];
  if (range) {
    estimate = Math.max(1, Math.min(estimate, range.max));
  }

  return estimate;
}

/**
 * Evaluate a contract and assign a rating
 */
export function evaluateContractRating(
  salary: number,
  marketValue: number,
  positionRank: number | null,
  ppg: number | null,
  isRookie: boolean
): ContractRating {
  if (isRookie) return RATINGS.ROOKIE;

  const valueDiff = (marketValue - salary) / salary;

  // LEGENDARY: top 3 position rank, >10 PPG, >25% value
  if (positionRank !== null && positionRank <= 3 && ppg !== null && ppg > 10 && valueDiff > 0.25) {
    return RATINGS.LEGENDARY;
  }

  // CORNERSTONE: top 10 rank with positive value
  if (positionRank !== null && positionRank <= 10 && valueDiff > 0) {
    return RATINGS.CORNERSTONE;
  }

  if (valueDiff > 0.25) return RATINGS.STEAL;
  if (valueDiff >= -0.25) return RATINGS.GOOD;
  return RATINGS.BUST;
}

/**
 * Calculate cap savings from releasing a player
 */
export function calculateCapSavings(
  salary: number,
  yearsRemaining: number
): number {
  const deadCapFirstYear = calculateDeadCap(salary, yearsRemaining)[0]?.amount ?? 0;
  return salary - deadCapFirstYear;
}
