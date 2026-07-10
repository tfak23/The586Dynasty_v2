// AI bidder logic for the mock auction draft.
// Each bot values players from the quick market estimate × a seeded
// per-bot-per-player aggressiveness × a positional-need multiplier.

import type { AuctionPlayer, AuctionState, AuctionTeam } from './mockAuction';
import { canBid, maxBid } from './mockAuction';

// Roster construction targets used for need weighting (mock wins only,
// weighted against how many the bot has already won at the position).
const POSITION_TARGETS: Record<string, number> = { QB: 2, RB: 3, WR: 4, TE: 1 };

/** Deterministic hash → [0, 1) (mulberry32 over a string seed). */
function seededRandom(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^= h >>> 16) >>> 0) / 4294967296;
}

/** Per-bot-per-player aggressiveness in [0.85, 1.2]. */
function aggressiveness(teamId: string, playerId: string): number {
  return 0.85 + seededRandom(`${teamId}:${playerId}`) * 0.35;
}

function needMultiplier(team: AuctionTeam, position: string): number {
  const target = POSITION_TARGETS[position] ?? 2;
  const have = team.wins.filter((w) => w.player.position === position).length;
  if (have < target) return 1.15;
  if (have === target) return 0.95;
  return 0.6;
}

/** The most a bot is willing to pay for a player (before affordability caps). */
export function botValuation(team: AuctionTeam, player: AuctionPlayer): number {
  const base = Math.max(1, player.projected);
  return Math.round(base * aggressiveness(team.teamId, player.id) * needMultiplier(team, player.position));
}

export interface BotBid {
  teamId: string;
  amount: number;
}

/**
 * Decide whether a bot bids this tick. Paced probabilistically so lots
 * develop naturally instead of instantly maxing out.
 */
export function pickBotBid(state: AuctionState): BotBid | null {
  const lot = state.lot;
  if (!lot || state.phase !== 'bidding' || state.paused) return null;

  // Pace: more likely to act as the clock runs down.
  const urgency = 1 - lot.secondsLeft / Math.max(1, state.settings.bidSecs);
  if (Math.random() > 0.25 + urgency * 0.55) return null;

  const inc = state.settings.minIncrement;
  const candidates = state.teams
    .filter((t) => !t.isUser && t.teamId !== lot.highBidderId)
    .map((t) => ({ team: t, value: Math.min(botValuation(t, lot.player), maxBid(t, state.settings)) }))
    .filter(({ team, value }) => {
      const nextBid = lot.currentBid + inc;
      return value >= nextBid && canBid(state, team.teamId, nextBid).ok;
    })
    .sort((a, b) => b.value - a.value);

  if (candidates.length === 0) return null;
  const { team, value } = candidates[0];

  // Mostly minimum raises; occasional jump bid to shake out rivals.
  const jump = Math.random() < 0.2 ? inc * (2 + Math.floor(Math.random() * 3)) : inc;
  const amount = Math.min(lot.currentBid + jump, value);
  return { teamId: team.teamId, amount };
}

/** Pick the player a bot nominates: best available at a position of need. */
export function pickBotNomination(
  team: AuctionTeam,
  pool: AuctionPlayer[]
): { player: AuctionPlayer; openingBid: number } | null {
  if (pool.length === 0) return null;
  const scored = pool
    .map((p) => ({ p, score: p.projected * needMultiplier(team, p.position) * (0.9 + seededRandom(`${team.teamId}:nom:${p.id}`) * 0.2) }))
    .sort((a, b) => b.score - a.score);
  // Nominate from the top handful so bots don't all march down one list
  const pickIdx = Math.floor(Math.random() * Math.min(4, scored.length));
  return { player: scored[pickIdx].p, openingBid: 1 };
}

/** Best available by raw projection — used for auto-nomination on timeout. */
export function bestAvailable(pool: AuctionPlayer[]): AuctionPlayer | null {
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => b.projected - a.projected)[0];
}
