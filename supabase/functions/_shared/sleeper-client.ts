const SLEEPER_API = 'https://api.sleeper.app/v1';

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  total_rosters: number;
  season: string;
  status: string;
  settings: Record<string, unknown>;
  scoring_settings: Record<string, number>;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
  reserve: string[];
  taxi: string[];
  settings: Record<string, unknown>;
}

export interface SleeperTradedPick {
  season: string;
  round: number;
  roster_id: number;
  previous_owner_id: number;
  owner_id: number;
}

export interface SleeperPlayer {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  age: number;
  years_exp: number;
  status: string;
  search_full_name: string;
  search_last_name: string;
}

async function fetchSleeper<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_API}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText} for ${path}`);
  }
  return res.json();
}

export async function getUser(username: string): Promise<SleeperUser> {
  return fetchSleeper(`/user/${username}`);
}

export async function getUserById(userId: string): Promise<SleeperUser> {
  return fetchSleeper(`/user/${userId}`);
}

export async function getLeague(leagueId: string): Promise<SleeperLeague> {
  return fetchSleeper(`/league/${leagueId}`);
}

export async function getLeagueRosters(leagueId: string): Promise<SleeperRoster[]> {
  return fetchSleeper(`/league/${leagueId}/rosters`);
}

export async function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  return fetchSleeper(`/league/${leagueId}/users`);
}

export async function getTradedPicks(leagueId: string): Promise<SleeperTradedPick[]> {
  return fetchSleeper(`/league/${leagueId}/traded_picks`);
}

export async function getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
  return fetchSleeper(`/user/${userId}/leagues/nfl/${season}`);
}

export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  return fetchSleeper('/players/nfl');
}

export async function getPlayerStats(season: string, week?: number): Promise<Record<string, Record<string, number>>> {
  const weekPath = week ? `/${week}` : '';
  return fetchSleeper(`/stats/nfl/regular/${season}${weekPath}`);
}

export async function getPlayerProjections(season: string, week?: number): Promise<Record<string, Record<string, number>>> {
  const weekPath = week ? `/${week}` : '';
  return fetchSleeper(`/projections/nfl/regular/${season}${weekPath}`);
}

export interface SleeperTransaction {
  transaction_id: string;
  type: string; // 'trade' | 'waiver' | 'free_agent'
  status: string; // 'complete' | 'pending' | 'failed'
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  draft_picks: { season: string; round: number; roster_id: number; owner_id: number; previous_owner_id: number }[];
  leg: number;
  created: number;
}

// All transactions for a given week (Sleeper records trades under a scoring leg/week).
export async function getLeagueTransactions(
  leagueId: string,
  week: number
): Promise<SleeperTransaction[]> {
  return fetchSleeper(`/league/${leagueId}/transactions/${week}`);
}
