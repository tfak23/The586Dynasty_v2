import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { readSheet } from '../_shared/google-sheets.ts';
import { getSpreadsheetId } from '../_shared/sheet-operations.ts';
import {
  getLeagueUsers,
  getLeagueRosters,
  getLeagueTransactions,
} from '../_shared/sleeper-client.ts';

// ─── Types (mirrors src/lib/tradeHistory.ts HistoricalTrade) ─────────────────
interface HistoricalTrade {
  id: string;
  season: number;
  team1: string;
  team1Receives: string[];
  team2: string;
  team2Receives: string[];
  notes?: string;
}

interface SleeperTradeSummary {
  transaction_id: string;
  week: number;
  teams: string[];
  playerCount: number;
  pickCount: number;
  created: number;
}

// ─── Sheet "Trades" tab parser ───────────────────────────────────────────────
// The tab has two side-by-side blocks: a "Current Year" block (cols B–K) and a
// "Past Years" block (cols Q–Z). Each trade spans one header row (with the
// trade number) plus continuation rows for extra assets. Salary/Yrs live in
// their own columns; picks and cap lines sit in the "Received" column with no
// salary.
interface Offsets {
  num: number; t1: number; t1r: number; t1s: number; t1y: number;
  t2: number; t2r: number; t2s: number; t2y: number;
}
const CURRENT: Offsets = { num: 1, t1: 2, t1r: 3, t1s: 4, t1y: 5, t2: 7, t2r: 8, t2s: 9, t2y: 10 };
const PAST: Offsets = { num: 16, t1: 17, t1r: 18, t1s: 19, t1y: 20, t2: 22, t2r: 23, t2s: 24, t2y: 25 };

function cell(row: string[], i: number): string {
  return (row[i] ?? '').toString().trim();
}

function formatAsset(name: string, salary: string, yrs: string): string | null {
  if (!name) return null;
  if (salary) {
    const y = parseInt(yrs || '0', 10) || 0;
    return `${name} ($${salary}, ${y}${y === 1 ? 'yr' : 'yrs'})`;
  }
  return name; // draft pick or "$X cap YYYY"
}

function parseSection(rows: string[][], o: Offsets): HistoricalTrade[] {
  const out: HistoricalTrade[] = [];
  let cur: HistoricalTrade | null = null;

  for (const row of rows) {
    const num = cell(row, o.num);
    if (num && /^\d+\.\d+/.test(num)) {
      if (cur) out.push(cur);
      const season = 2000 + parseInt(num.split('.')[0], 10);
      cur = {
        id: num,
        season,
        team1: cell(row, o.t1),
        team1Receives: [],
        team2: cell(row, o.t2),
        team2Receives: [],
      };
    }
    if (!cur) continue;

    const a1 = formatAsset(cell(row, o.t1r), cell(row, o.t1s), cell(row, o.t1y));
    if (a1) cur.team1Receives.push(a1);
    const a2 = formatAsset(cell(row, o.t2r), cell(row, o.t2s), cell(row, o.t2y));
    if (a2) cur.team2Receives.push(a2);
  }
  if (cur) out.push(cur);

  for (const t of out) {
    // Drop a leading "Nothing" placeholder if real assets exist, else keep one.
    t.team1Receives = t.team1Receives.filter((x) => x.toLowerCase() !== 'nothing');
    t.team2Receives = t.team2Receives.filter((x) => x.toLowerCase() !== 'nothing');
    if (t.team1Receives.length === 0) t.team1Receives = ['Nothing'];
    if (t.team2Receives.length === 0) t.team2Receives = ['Nothing'];
  }
  return out.filter((t) => t.team1 && t.team2);
}

function parseTrades(rows: string[][]): HistoricalTrade[] {
  const current = parseSection(rows, CURRENT);
  const past = parseSection(rows, PAST);
  const all = [...current, ...past];
  // De-dupe by id (guard against overlap), newest season first.
  const byId = new Map<string, HistoricalTrade>();
  for (const t of all) if (!byId.has(t.id)) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => b.season - a.season || a.id.localeCompare(b.id));
}

// ─── Sleeper cross-check ─────────────────────────────────────────────────────
async function getSleeperTrades(leagueId: string): Promise<SleeperTradeSummary[]> {
  const [users, rosters] = await Promise.all([
    getLeagueUsers(leagueId),
    getLeagueRosters(leagueId),
  ]);
  const nameByUser: Record<string, string> = {};
  for (const u of users) nameByUser[u.user_id] = u.display_name || u.username;
  const ownerByRoster: Record<number, string> = {};
  for (const r of rosters) ownerByRoster[r.roster_id] = nameByUser[r.owner_id] ?? `Roster ${r.roster_id}`;

  const trades: SleeperTradeSummary[] = [];
  for (let week = 1; week <= 18; week++) {
    let txns;
    try {
      txns = await getLeagueTransactions(leagueId, week);
    } catch {
      continue;
    }
    for (const t of txns ?? []) {
      if (t.type !== 'trade' || t.status !== 'complete') continue;
      trades.push({
        transaction_id: t.transaction_id,
        week,
        teams: (t.roster_ids ?? []).map((id) => ownerByRoster[id]).filter(Boolean),
        playerCount: Object.keys(t.adds ?? {}).length,
        pickCount: (t.draft_picks ?? []).length,
        created: t.created,
      });
    }
  }
  return trades;
}

// Loose reconciliation: a Sleeper trade is "matched" if some sheet trade in the
// current season involves the same set of owners (case-insensitive, matched on
// the sheet's short name being contained in the Sleeper display name or vice
// versa). Unmatched trades are surfaced so the commissioner can record them.
function flagUnmatched(
  sleeperTrades: SleeperTradeSummary[],
  sheetTrades: HistoricalTrade[],
  currentSeason: number
): SleeperTradeSummary[] {
  const seasonSheet = sheetTrades.filter((t) => t.season === currentSeason);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const involves = (t: HistoricalTrade, owner: string) => {
    const o = norm(owner);
    const a = norm(t.team1); const b = norm(t.team2);
    return o.includes(a) || a.includes(o) || o.includes(b) || b.includes(o);
  };
  return sleeperTrades.filter((st) => {
    if (st.teams.length < 2) return false;
    const matched = seasonSheet.some((t) => st.teams.every((owner) => involves(t, owner)));
    return !matched;
  });
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'get-trades';
    const sheetId = body.spreadsheet_id ?? getSpreadsheetId();
    const range = body.range ?? "'Trades'!A1:AC400";

    // 1. Parse the sheet (always).
    const rows = await readSheet(sheetId, range);
    const trades = parseTrades(rows);

    if (action === 'preview') {
      return new Response(
        JSON.stringify({
          success: true,
          tradeCount: trades.length,
          seasons: [...new Set(trades.map((t) => t.season))].sort((a, b) => b - a),
          sample: trades.slice(0, 3),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Sleeper cross-check (best-effort — never block sheet trades on it).
    let sleeperTrades: SleeperTradeSummary[] = [];
    let unmatched: SleeperTradeSummary[] = [];
    const sleeperLeagueId = body.sleeper_league_id ?? Deno.env.get('SLEEPER_LEAGUE_ID');
    const currentSeason = body.current_season ?? Math.max(...trades.map((t) => t.season), 2026);
    if (sleeperLeagueId && body.include_sleeper !== false) {
      try {
        sleeperTrades = await getSleeperTrades(sleeperLeagueId);
        unmatched = flagUnmatched(sleeperTrades, trades, currentSeason);
      } catch (e) {
        // Surface the error but still return sheet trades.
        sleeperTrades = [];
        unmatched = [];
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        source: 'sheet',
        trades,
        sleeperTradeCount: sleeperTrades.length,
        unmatchedSleeperTrades: unmatched,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
