import { supabase } from './supabase';
import { POSITION_RANGES } from './constants';
import { getSleeperSeasonStats, type PlayerSeasonStats } from './sleeperStats';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ComparablePlayer {
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  salary: number;
  ppg: number;
  total_points: number;
  games_played: number;
  years_remaining: number;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ContractEstimate {
  estimated_salary: number;
  salary_range: { min: number; max: number };
  confidence: ConfidenceLevel;
  comparable_players: ComparablePlayer[];
  reasoning: string;
}

// ─── Position defaults ───────────────────────────────────────────────────────

const POSITION_AVERAGES: Record<string, { min: number; max: number; avg: number }> = {
  QB: { min: 1, max: 100, avg: 55 },
  RB: { min: 1, max: 60, avg: 25 },
  WR: { min: 1, max: 70, avg: 30 },
  TE: { min: 1, max: 50, avg: 22 },
};

// PPG matching window: QB has wider variance, so a wider search window
const PPG_RANGE: Record<string, number> = { QB: 3, RB: 2, WR: 2, TE: 2 };

// Position multipliers for quick estimate
const QUICK_MULTIPLIER: Record<string, number> = { QB: 3.5, RB: 2.5, WR: 2.5, TE: 2.5 };

// Franchise tag pool sizes by position
const TAG_POOL_SIZE: Record<string, number> = { QB: 10, RB: 20, WR: 20, TE: 10 };

// Season to use for stats (most recent completed NFL season)
const STATS_SEASON = '2025';

// ─── Helper: resolve player PPR stats ────────────────────────────────────────

/**
 * Get PPR stats for a player. Tries Sleeper API first (cached), falls back to DB.
 */
async function resolvePlayerStats(
  playerId: string,
  dbPpg?: number | null,
  dbGp?: number | null,
  dbPts?: number | null
): Promise<{ ppg: number; gamesPlayed: number; totalPoints: number }> {
  // Try Sleeper API (cached) — this has the real PPR stats
  const allStats = await getSleeperSeasonStats(STATS_SEASON);
  const sleeperStats = allStats[playerId];

  if (sleeperStats && sleeperStats.gp > 0) {
    return {
      ppg: sleeperStats.ppg_ppr,
      gamesPlayed: sleeperStats.gp,
      totalPoints: sleeperStats.pts_ppr,
    };
  }

  // Fall back to DB values if Sleeper didn't have stats
  if (dbPpg && dbPpg > 0) {
    return {
      ppg: dbPpg,
      gamesPlayed: dbGp ?? 0,
      totalPoints: dbPts ?? 0,
    };
  }

  return { ppg: 0, gamesPlayed: 0, totalPoints: 0 };
}

// ─── Main estimation function ────────────────────────────────────────────────

/**
 * Estimate a fair contract value for a player by finding comparable contracts
 * in the league and applying age/games/previous-salary adjustments.
 *
 * Uses PPR points from Sleeper API (cached) for accurate stats.
 */
export async function estimateContract(
  leagueId: string,
  playerId: string,
  position: string,
  age: number | null,
  previousSalary: number | null,
  season: number
): Promise<ContractEstimate> {
  const posDefaults = POSITION_AVERAGES[position] ?? POSITION_AVERAGES.WR;
  const reasons: string[] = [];

  // ── 1. Fetch the target player's info from DB + Sleeper stats ──────────
  const { data: player } = await supabase
    .from('players')
    .select('id, full_name, position, team, age, years_exp, ppg_2025, games_played_2025, fantasy_points_2025')
    .eq('id', playerId)
    .single();

  const stats = await resolvePlayerStats(
    playerId,
    player?.ppg_2025,
    player?.games_played_2025,
    player?.fantasy_points_2025
  );

  const ppg = stats.ppg;
  const gamesPlayed = stats.gamesPlayed;
  const totalPoints = stats.totalPoints;
  const playerAge = age ?? player?.age ?? 26;

  reasons.push(`${player?.full_name ?? 'Player'} (${position}) — ${ppg.toFixed(1)} PPG, ${gamesPlayed} GP, age ${playerAge}`);

  // ── 2. Find comparable players ─────────────────────────────────────────
  // Get all active contracts at this position, then filter by PPG using Sleeper stats
  const { data: allContracts } = await supabase
    .from('contracts')
    .select(`
      salary,
      years_remaining,
      player_id,
      player:players!inner(
        id, full_name, position, team, age
      )
    `)
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .neq('player_id', playerId)
    .eq('player.position', position)
    .order('salary', { ascending: false });

  // Get Sleeper stats for all players (already cached from above call)
  const sleeperStats = await getSleeperSeasonStats(STATS_SEASON);

  // Filter to players with similar PPG
  const ppgWindow = PPG_RANGE[position] ?? 2;
  const ppgLow = ppg - ppgWindow;
  const ppgHigh = ppg + ppgWindow;

  const comparables: ComparablePlayer[] = (allContracts ?? [])
    .map((c: any) => {
      const compStats = sleeperStats[c.player.id];
      const compPpg = compStats?.ppg_ppr ?? 0;
      const compGp = compStats?.gp ?? 0;
      const compPts = compStats?.pts_ppr ?? 0;

      return {
        player_id: c.player.id,
        full_name: c.player.full_name,
        position: c.player.position,
        team: c.player.team,
        age: c.player.age,
        salary: c.salary,
        ppg: compPpg,
        total_points: compPts,
        games_played: compGp,
        years_remaining: c.years_remaining,
      };
    })
    .filter((comp: ComparablePlayer) => comp.ppg >= ppgLow && comp.ppg <= ppgHigh)
    .sort((a: ComparablePlayer, b: ComparablePlayer) =>
      Math.abs(a.ppg - ppg) - Math.abs(b.ppg - ppg)
    )
    .slice(0, 5);

  // ── 3. Weighted average from comparables ───────────────────────────────
  let estimate: number;

  if (comparables.length > 0) {
    // Weight: closer PPG → higher weight.  w = 1 / (1 + |ppgDiff|)
    let weightedSum = 0;
    let totalWeight = 0;
    for (const comp of comparables) {
      const w = 1 / (1 + Math.abs(comp.ppg - ppg));
      weightedSum += comp.salary * w;
      totalWeight += w;
    }
    estimate = Math.round(weightedSum / totalWeight);
    reasons.push(
      `Weighted avg of ${comparables.length} comparable${comparables.length > 1 ? 's' : ''}: $${estimate}`
    );
  } else {
    // No comps — fall back to position average adjusted by PPG difference
    const avgPpg = posDefaults.avg / (QUICK_MULTIPLIER[position] ?? 2.5);
    const ppgDelta = ppg - avgPpg;
    estimate = Math.round(posDefaults.avg + ppgDelta * 2);
    reasons.push(`No comparables found — estimated from position average: $${estimate}`);
  }

  // ── 4. Adjustments ─────────────────────────────────────────────────────

  // Age adjustment: +$3 for prime (24-26), -$2/yr for 29+
  if (playerAge >= 24 && playerAge <= 26) {
    estimate += 3;
    reasons.push('Prime age bonus (24-26): +$3');
  } else if (playerAge > 28) {
    const penalty = (playerAge - 28) * 2;
    estimate -= penalty;
    reasons.push(`Age decline (${playerAge}): -$${penalty}`);
  }

  // Games-played adjustment: -$1.5 per game below 14
  if (gamesPlayed > 0 && gamesPlayed < 14) {
    const gpPenalty = Math.round((14 - gamesPlayed) * 1.5);
    estimate -= gpPenalty;
    reasons.push(`Availability (${gamesPlayed} GP): -$${gpPenalty}`);
  }

  // Previous salary anchor: 30% pull toward previous salary
  if (previousSalary && previousSalary > 3) {
    const before = estimate;
    estimate = Math.round(estimate * 0.7 + previousSalary * 0.3);
    if (estimate !== before) {
      reasons.push(`Previous salary anchor ($${previousSalary}): adjusted to $${estimate}`);
    }
  }

  // ── 5. Clamp to position range ─────────────────────────────────────────
  estimate = Math.max(posDefaults.min, Math.min(estimate, posDefaults.max));

  // Build salary range: ±10%, minimum $5 spread
  const spread = Math.max(5, Math.round(estimate * 0.1));
  const salaryRange = {
    min: Math.max(posDefaults.min, estimate - spread),
    max: Math.min(posDefaults.max, estimate + spread),
  };

  // ── 6. Confidence level ────────────────────────────────────────────────
  let confidence: ConfidenceLevel;
  if (comparables.length >= 3 && gamesPlayed >= 10) {
    confidence = 'high';
  } else if (comparables.length >= 1 || gamesPlayed >= 6) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  reasons.push(`Confidence: ${confidence} (${comparables.length} comps, ${gamesPlayed} GP)`);
  reasons.push(`Final estimate: $${estimate} (range $${salaryRange.min}–$${salaryRange.max})`);

  return {
    estimated_salary: estimate,
    salary_range: salaryRange,
    confidence,
    comparable_players: comparables.slice(0, 3), // Return top 3
    reasoning: reasons.join('\n'),
  };
}

// ─── Quick estimate (no DB lookups) ──────────────────────────────────────────

/**
 * Fast salary estimate for bulk operations.
 * Uses PPG × position_multiplier with age + previous salary adjustments.
 * No database calls — pure calculation.
 */
export function quickEstimate(
  position: string,
  ppg: number,
  age: number,
  previousSalary?: number
): number {
  const multiplier = QUICK_MULTIPLIER[position] ?? 2.5;
  let estimate = Math.round(ppg * multiplier);

  // Age: +$3 for prime, -$2/yr past 28
  if (age >= 24 && age <= 26) {
    estimate += 3;
  } else if (age > 28) {
    estimate -= (age - 28) * 2;
  }

  // Previous salary pull (30%)
  if (previousSalary && previousSalary > 3) {
    estimate = Math.round(estimate * 0.7 + previousSalary * 0.3);
  }

  // Clamp
  const posDefaults = POSITION_AVERAGES[position] ?? POSITION_AVERAGES.WR;
  return Math.max(posDefaults.min, Math.min(estimate, posDefaults.max));
}

// ─── Franchise tag calculator ────────────────────────────────────────────────

export interface FranchiseTagResult {
  tag_salary: number;
  pool_size: number;
  explanation: string;
  top_salaries: { full_name: string; salary: number }[];
}

/**
 * Calculate franchise tag cost for a position.
 *
 * QB/TE: average of top 10 salaries at that position (previous season contracts)
 * RB/WR: average of top 20 salaries at that position
 *
 * Only active contracts from the previous season are considered.
 */
export async function calculateFranchiseTagCost(
  leagueId: string,
  position: string,
  season: number
): Promise<FranchiseTagResult | null> {
  const poolSize = TAG_POOL_SIZE[position];
  if (!poolSize) return null; // Not a valid taggable position

  // Fetch top N salaries at this position from previous season's contracts
  const { data } = await supabase
    .from('contracts')
    .select('salary, player:players!inner(full_name, position)')
    .eq('league_id', leagueId)
    .eq('status', 'active')
    .eq('player.position', position)
    .lte('start_season', season - 1)
    .order('salary', { ascending: false })
    .limit(poolSize);

  if (!data || data.length === 0) {
    return {
      tag_salary: POSITION_AVERAGES[position]?.avg ?? 25,
      pool_size: poolSize,
      explanation: `No contracts found — using position average.`,
      top_salaries: [],
    };
  }

  const topSalaries = data.map((d: any) => ({
    full_name: d.player.full_name,
    salary: d.salary,
  }));

  const totalSalary = topSalaries.reduce((sum, s) => sum + s.salary, 0);
  const tagSalary = Math.ceil(totalSalary / topSalaries.length);

  return {
    tag_salary: tagSalary,
    pool_size: poolSize,
    explanation:
      `Average of top ${topSalaries.length} ${position} salaries` +
      ` ($${totalSalary} / ${topSalaries.length} = $${tagSalary}).` +
      ` Pool size: ${poolSize}.`,
    top_salaries: topSalaries,
  };
}
