import { supabase } from './supabase';
import { RATINGS } from './constants';
import { estimateContract, type ComparablePlayer } from './contractEstimation';
import type { ContractRating } from './contractCalculations';

// ─── Thresholds (easily adjustable) ──────────────────────────────────────────

const LEGENDARY_TOP_N = 10;          // Top N contracts by value score
const LEGENDARY_MIN_PPG = 10;        // Minimum PPG for LEGENDARY
const CORNERSTONE_TOP_N = 5;         // Top N at position by PPG
const STEAL_THRESHOLD = 0.25;        // 25%+ savings
const BUST_THRESHOLD = -0.25;        // 25%+ overpay
const ROOKIE_MIN_PPG = 2;            // Minimum PPG to be flagged as rookie
const ROOKIE_LOOKBACK_SEASONS = 3;   // Check last N seasons for stats

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FullContractEvaluation {
  rating: ContractRating;
  value_score: number;              // ((estimated - actual) / estimated) * 100
  actual_salary: number;
  estimated_salary: number;
  salary_difference: number;        // estimated - actual
  league_rank: number | null;       // Rank among all contracts (best deal = 1)
  position_rank: number | null;     // Rank at position by PPG
  total_contracts: number;
  comparable_contracts: ComparablePlayer[];
  reasoning: string;
  player_stats: { ppg: number; games_played: number };
}

// ─── Value score calculation ─────────────────────────────────────────────────

/**
 * Calculate value score: positive = paying below market, negative = overpaying.
 * Formula: ((estimated - actual) / estimated) * 100
 * Guards against division by zero.
 */
function valueScore(estimated: number, actual: number): number {
  if (estimated === 0) return 0;
  return ((estimated - actual) / estimated) * 100;
}

// ─── Main evaluation function ────────────────────────────────────────────────

/**
 * Evaluate a single contract: estimate market value, calculate value score,
 * determine position rank, and assign a rating.
 */
export async function evaluateContract(
  contractId: string,
  leagueId: string
): Promise<FullContractEvaluation | null> {
  // 1. Fetch the contract with player info
  const { data: contract } = await supabase
    .from('contracts')
    .select('*, player:players!inner(id, full_name, position, team, age, ppg_2025, games_played_2025)')
    .eq('id', contractId)
    .single();

  if (!contract || !contract.player) return null;

  const actualSalary = contract.salary;
  const player = contract.player as any;
  const position = player.position as string;
  const ppg = player.ppg_2025 ?? 0;
  const gamesPlayed = player.games_played_2025 ?? 0;

  // Skip $0 salary contracts (pending franchise tag/release)
  if (actualSalary === 0) return null;

  // 2. Check if player is a true rookie (no stats in last 3 seasons)
  const isRookie = await checkIsRookie(player.id, ppg);

  // 3. Get market value estimate (no previous salary → unbiased comparison)
  const estimate = await estimateContract(
    leagueId,
    player.id,
    position,
    player.age,
    null, // Don't pass previous salary for fair market comparison
    2025
  );

  const estimatedSalary = estimate.estimated_salary;
  const vScore = valueScore(estimatedSalary, actualSalary);
  const salaryDifference = estimatedSalary - actualSalary;

  // 4. Get position rank by PPG
  const posRank = await getPlayerPositionRank(leagueId, player.id, position);

  // 5. Determine rating
  const rating = determineRating(
    vScore,
    ppg,
    gamesPlayed,
    posRank,
    isRookie
  );

  // 6. Build reasoning
  const reasoning = buildReasoning(
    rating,
    player.full_name,
    position,
    actualSalary,
    estimatedSalary,
    vScore,
    ppg,
    gamesPlayed,
    posRank,
    isRookie
  );

  return {
    rating,
    value_score: Math.round(vScore * 10) / 10,
    actual_salary: actualSalary,
    estimated_salary: estimatedSalary,
    salary_difference: salaryDifference,
    league_rank: null, // Filled in by getLeagueContractRankings
    position_rank: posRank,
    total_contracts: 0, // Filled in by getLeagueContractRankings
    comparable_contracts: estimate.comparable_players,
    reasoning,
    player_stats: { ppg, games_played: gamesPlayed },
  };
}

// ─── League-wide contract rankings ───────────────────────────────────────────

/**
 * Rank all active contracts in a league by value score.
 * Highest value score (best deal) = rank 1.
 */
export async function getLeagueContractRankings(
  leagueId: string
): Promise<FullContractEvaluation[]> {
  // Get all active contracts with salary > 0
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, salary')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .gt('salary', 0);

  if (!contracts || contracts.length === 0) return [];

  // Evaluate each contract
  const evaluations: FullContractEvaluation[] = [];
  for (const c of contracts) {
    const evaluation = await evaluateContract(c.id, leagueId);
    if (evaluation) evaluations.push(evaluation);
  }

  // Sort by value score descending (best deals first), treat NaN as 0
  evaluations.sort((a, b) => {
    const aScore = isNaN(a.value_score) ? 0 : a.value_score;
    const bScore = isNaN(b.value_score) ? 0 : b.value_score;
    return bScore - aScore;
  });

  // Assign ranks and totals
  const total = evaluations.length;
  evaluations.forEach((e, i) => {
    e.league_rank = i + 1;
    e.total_contracts = total;
  });

  // Upgrade top N to LEGENDARY if eligible
  for (let i = 0; i < Math.min(LEGENDARY_TOP_N, evaluations.length); i++) {
    const e = evaluations[i];
    if (e.player_stats.ppg > LEGENDARY_MIN_PPG && e.rating !== RATINGS.ROOKIE) {
      e.rating = RATINGS.LEGENDARY;
      e.reasoning = `LEGENDARY — Top ${i + 1} contract in the league by value. ` + e.reasoning;
    }
  }

  return evaluations;
}

// ─── Position rankings by PPG ────────────────────────────────────────────────

/**
 * Rank players at a given position by PPG for the given season.
 * Returns array of { player_id, full_name, ppg, rank }.
 */
export async function getPositionRankings(
  leagueId: string,
  position: string,
  _season: number
): Promise<{ player_id: string; full_name: string; ppg: number; rank: number }[]> {
  const { data } = await supabase
    .from('contracts')
    .select('player:players!inner(id, full_name, position, ppg_2025)')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .eq('player.position', position)
    .order('player.ppg_2025', { ascending: false });

  if (!data) return [];

  return data
    .map((d: any) => ({
      player_id: d.player.id,
      full_name: d.player.full_name,
      ppg: d.player.ppg_2025 ?? 0,
      rank: 0,
    }))
    .sort((a, b) => b.ppg - a.ppg)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a player is a true rookie:
 *  - No stats in last 3 seasons (ppg_2025 is the only stat column right now)
 *  - PPG >= ROOKIE_MIN_PPG (prevents injured veterans from being flagged)
 */
async function checkIsRookie(playerId: string, ppg: number): Promise<boolean> {
  // Currently the DB only tracks ppg_2025. If a player has stats, they're not a rookie.
  // True rookies have ppg_2025 null or 0 (haven't played yet) AND we expect >= ROOKIE_MIN_PPG
  // from draft projection. Since we only have one season of stats, check if they have
  // an active contract of type 'rookie'.
  if (ppg > 0) return false; // Has stats → not a true rookie

  const { data } = await supabase
    .from('contracts')
    .select('contract_type')
    .eq('player_id', playerId)
    .eq('status', 'active')
    .eq('contract_type', 'rookie')
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Get a player's rank at their position by PPG within the league.
 */
async function getPlayerPositionRank(
  leagueId: string,
  playerId: string,
  position: string
): Promise<number | null> {
  const { data } = await supabase
    .from('contracts')
    .select('player_id, player:players!inner(id, ppg_2025, position)')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .eq('player.position', position);

  if (!data) return null;

  const sorted = data
    .map((d: any) => ({ id: d.player.id, ppg: d.player.ppg_2025 ?? 0 }))
    .sort((a, b) => b.ppg - a.ppg);

  const idx = sorted.findIndex((p) => p.id === playerId);
  return idx >= 0 ? idx + 1 : null;
}

/**
 * Determine contract rating based on value score, stats, and position rank.
 *
 * Priority: ROOKIE → LEGENDARY check → CORNERSTONE check → value-based
 */
function determineRating(
  vScore: number,
  ppg: number,
  gamesPlayed: number,
  positionRank: number | null,
  isRookie: boolean
): ContractRating {
  // Rookies with no stats
  if (isRookie && ppg >= ROOKIE_MIN_PPG) return RATINGS.ROOKIE;
  if (isRookie) return RATINGS.ROOKIE;

  // CORNERSTONE: Top 5 at position by PPG (if not already a steal/legendary)
  if (positionRank !== null && positionRank <= CORNERSTONE_TOP_N && ppg > 0) {
    // Cornerstones must not be massive overpays
    if (vScore >= BUST_THRESHOLD * 100) {
      return RATINGS.CORNERSTONE;
    }
  }

  // Value-based ratings
  const vPct = vScore / 100;
  if (vPct >= STEAL_THRESHOLD) return RATINGS.STEAL;
  if (vPct >= BUST_THRESHOLD) return RATINGS.GOOD;
  return RATINGS.BUST;
}

/**
 * Build a human-readable reasoning string explaining the rating.
 */
function buildReasoning(
  rating: ContractRating,
  playerName: string,
  position: string,
  actualSalary: number,
  estimatedSalary: number,
  vScore: number,
  ppg: number,
  gamesPlayed: number,
  positionRank: number | null,
  isRookie: boolean
): string {
  const diff = estimatedSalary - actualSalary;
  const direction = diff >= 0 ? 'below' : 'above';
  const absDiff = Math.abs(diff);

  const parts: string[] = [];

  parts.push(`${playerName} (${position}) — $${actualSalary} salary, estimated market value $${estimatedSalary}.`);

  if (diff !== 0) {
    parts.push(`Paying $${absDiff} ${direction} market (${Math.abs(Math.round(vScore))}% ${diff >= 0 ? 'savings' : 'premium'}).`);
  } else {
    parts.push('Paying exactly at market value.');
  }

  if (ppg > 0) {
    parts.push(`${ppg.toFixed(1)} PPG in ${gamesPlayed} games.`);
  }

  if (positionRank !== null) {
    parts.push(`Ranked #${positionRank} at ${position} by PPG.`);
  }

  switch (rating) {
    case RATINGS.LEGENDARY:
      parts.push('LEGENDARY — Elite production at an exceptional value. One of the best contracts in the league.');
      break;
    case RATINGS.CORNERSTONE:
      parts.push(`CORNERSTONE — Top ${CORNERSTONE_TOP_N} ${position} by production. A franchise-caliber player.`);
      break;
    case RATINGS.STEAL:
      parts.push(`STEAL — Saving ${Math.round(vScore)}% vs market value. Outstanding deal.`);
      break;
    case RATINGS.GOOD:
      parts.push('GOOD — Fairly valued contract near market price.');
      break;
    case RATINGS.BUST:
      parts.push(`BUST — Overpaying by ${Math.abs(Math.round(vScore))}% vs market value. Consider restructuring.`);
      break;
    case RATINGS.ROOKIE:
      parts.push('ROOKIE — First contract, no established stats yet.');
      break;
  }

  return parts.join(' ');
}
