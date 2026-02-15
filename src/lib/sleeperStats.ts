import { SLEEPER_API_BASE } from './constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerSeasonStats {
  pts_ppr: number;
  gp: number;
  ppg_ppr: number;
}

// ─── In-memory cache ─────────────────────────────────────────────────────────

let cachedSeason: string | null = null;
let cachedStats: Record<string, PlayerSeasonStats> = {};
let cachePromise: Promise<Record<string, PlayerSeasonStats>> | null = null;

/**
 * Fetch PPR season stats from Sleeper API for all players.
 * Results are cached in memory — subsequent calls return instantly.
 */
export async function getSleeperSeasonStats(
  season: string = '2025'
): Promise<Record<string, PlayerSeasonStats>> {
  // Return cache if we already have it for this season
  if (cachedSeason === season && Object.keys(cachedStats).length > 0) {
    return cachedStats;
  }

  // Deduplicate concurrent requests
  if (cachePromise && cachedSeason === season) {
    return cachePromise;
  }

  cachedSeason = season;
  cachePromise = fetchAndProcessStats(season);

  try {
    cachedStats = await cachePromise;
    return cachedStats;
  } finally {
    cachePromise = null;
  }
}

async function fetchAndProcessStats(
  season: string
): Promise<Record<string, PlayerSeasonStats>> {
  const res = await fetch(`${SLEEPER_API_BASE}/stats/nfl/regular/${season}`);
  if (!res.ok) {
    console.warn(`Sleeper stats API error: ${res.status}`);
    return {};
  }

  const raw: Record<string, Record<string, number>> = await res.json();
  const result: Record<string, PlayerSeasonStats> = {};

  for (const [playerId, stats] of Object.entries(raw)) {
    const ptsPpr = stats.pts_ppr ?? 0;
    const gp = stats.gp ?? stats.gms_active ?? 0;

    // Only include players who actually played
    if (gp > 0 && ptsPpr > 0) {
      result[playerId] = {
        pts_ppr: Math.round(ptsPpr * 100) / 100,
        gp,
        ppg_ppr: Math.round((ptsPpr / gp) * 100) / 100,
      };
    }
  }

  return result;
}

/**
 * Get a single player's PPR stats for a season.
 * Returns null if no stats found.
 */
export async function getPlayerPprStats(
  playerId: string,
  season: string = '2024'
): Promise<PlayerSeasonStats | null> {
  const allStats = await getSleeperSeasonStats(season);
  return allStats[playerId] ?? null;
}

/**
 * Clear the cache (useful for refreshing).
 */
export function clearStatsCache(): void {
  cachedSeason = null;
  cachedStats = {};
  cachePromise = null;
}
