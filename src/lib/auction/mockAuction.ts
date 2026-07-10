// Mock auction draft engine — pure reducer state machine.
// Local-only (no network); designed so the same shapes/rules can back the
// live Supabase Realtime auction later (docs/INTEGRATION_AND_AUCTION_PLAN.md §4).
//
// League rules: winning bid = annual salary; winner picks contract length,
// with minimum salaries by years (1yr/$1, 2yr/$4, 3yr/$8, 4yr/$12, 5yr/$15).

import { MIN_SALARIES } from '../constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuctionPlayer {
  id: string;
  name: string;
  position: string;
  nflTeam: string | null;
  age: number | null;
  projected: number; // quick market estimate shown in UI + used by bots
}

export interface AuctionTeam {
  teamId: string;
  name: string;
  owner: string;
  budget: number;
  spent: number;
  isUser: boolean;
  wins: WonLot[];
}

export interface WonLot {
  lotNumber: number;
  player: AuctionPlayer;
  price: number;
  years: number;
  teamId: string;
  nominatedById: string;
}

export interface Bid {
  teamId: string;
  amount: number;
}

export interface CurrentLot {
  player: AuctionPlayer;
  nominatedById: string;
  currentBid: number;
  highBidderId: string;
  secondsLeft: number;
  bids: Bid[];
}

export interface AuctionSettings {
  nominationSecs: number; // time each team has to nominate
  bidSecs: number;        // countdown, resets on every bid
  minIncrement: number;
  maxWins: number;        // max players each team may win in this draft
  autoNominateOnTimeout: boolean; // true: nominate best available; false: skip turn
}

export const DEFAULT_SETTINGS: AuctionSettings = {
  nominationSecs: 30,
  bidSecs: 10,
  minIncrement: 1,
  maxWins: 10,
  autoNominateOnTimeout: true,
};

export type Phase = 'setup' | 'nomination' | 'bidding' | 'years' | 'complete';

export interface AuctionState {
  phase: Phase;
  paused: boolean;
  teams: AuctionTeam[]; // in nomination order
  nomPointer: number;   // index of team currently on the clock to nominate
  nomTurn: number;      // increments every time the clock moves — unique key per turn
  nomSecondsLeft: number;
  lot: CurrentLot | null;
  /** Set when a lot was won and years must be chosen (user prompt; bots auto). */
  pendingSale: { lot: CurrentLot; winnerId: string } | null;
  results: WonLot[];
  log: string[];
  settings: AuctionSettings;
  lotCounter: number;
}

export type AuctionAction =
  | { type: 'INIT'; teams: AuctionTeam[]; settings: AuctionSettings }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TICK' }
  | { type: 'NOMINATE'; byTeamId: string; player: AuctionPlayer; openingBid: number }
  | { type: 'BID'; teamId: string; amount: number }
  | { type: 'SKIP_NOMINATION' } // skip the team currently on the clock
  | { type: 'MOVE_TEAM'; teamId: string; direction: 'up' | 'down' }
  | { type: 'RANDOMIZE_ORDER' }
  | { type: 'SET_BUDGET'; teamId: string; budget: number }
  | { type: 'SET_SETTINGS'; settings: Partial<AuctionSettings> }
  | { type: 'ASSIGN_YEARS'; years: number }
  | { type: 'UNDO_LAST_SALE' }
  | { type: 'END_DRAFT' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** $1 must be reserved for every remaining roster slot beyond the current lot. */
export function maxBid(team: AuctionTeam, settings: AuctionSettings): number {
  const remainingSlotsAfterThis = Math.max(0, settings.maxWins - team.wins.length - 1);
  return team.budget - team.spent - remainingSlotsAfterThis;
}

export function canBid(
  state: AuctionState,
  teamId: string,
  amount: number
): { ok: boolean; reason?: string } {
  const team = state.teams.find((t) => t.teamId === teamId);
  const lot = state.lot;
  if (!team || !lot) return { ok: false, reason: 'No open lot' };
  if (state.phase !== 'bidding') return { ok: false, reason: 'Bidding is closed' };
  if (state.paused) return { ok: false, reason: 'Draft is paused' };
  if (team.wins.length >= state.settings.maxWins) return { ok: false, reason: 'Roster full' };
  if (lot.highBidderId === teamId) return { ok: false, reason: 'Already high bidder' };
  if (amount < lot.currentBid + state.settings.minIncrement)
    return { ok: false, reason: `Minimum bid is $${lot.currentBid + state.settings.minIncrement}` };
  if (amount > maxBid(team, state.settings))
    return { ok: false, reason: `Max bid is $${maxBid(team, state.settings)}` };
  return { ok: true };
}

/** Years allowed for a given winning price (min salary rule). */
export function allowedYears(price: number): number[] {
  return [1, 2, 3, 4, 5].filter((y) => (MIN_SALARIES[y] ?? 1) <= price);
}

/** Bot heuristic: longer deals for young + expensive players. */
export function autoPickYears(price: number, age: number | null): number {
  const allowed = allowedYears(price);
  const longest = allowed[allowed.length - 1] ?? 1;
  const a = age ?? 26;
  if (a >= 30) return Math.min(longest, 1);
  if (a >= 28) return Math.min(longest, 2);
  if (a >= 26) return Math.min(longest, 3);
  return longest;
}

function teamCanParticipate(team: AuctionTeam, settings: AuctionSettings): boolean {
  return team.wins.length < settings.maxWins && team.budget - team.spent >= 1;
}

/** Advance the nomination pointer to the next team able to nominate. */
function advanceNomination(state: AuctionState, fromIndex: number): AuctionState {
  const n = state.teams.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (teamCanParticipate(state.teams[idx], state.settings)) {
      return {
        ...state,
        phase: 'nomination',
        nomPointer: idx,
        nomTurn: state.nomTurn + 1,
        nomSecondsLeft: state.settings.nominationSecs,
        lot: null,
        pendingSale: null,
      };
    }
  }
  return { ...state, phase: 'complete', lot: null, pendingSale: null };
}

function addLog(state: AuctionState, msg: string): string[] {
  return [msg, ...state.log].slice(0, 100);
}

/** Finalize a sale once years are known. */
function settleSale(state: AuctionState, winnerId: string, lot: CurrentLot, years: number): AuctionState {
  const won: WonLot = {
    lotNumber: state.lotCounter,
    player: lot.player,
    price: lot.currentBid,
    years,
    teamId: winnerId,
    nominatedById: lot.nominatedById,
  };
  const teams = state.teams.map((t) =>
    t.teamId === winnerId
      ? { ...t, spent: t.spent + lot.currentBid, wins: [...t.wins, won] }
      : t
  );
  const winner = teams.find((t) => t.teamId === winnerId)!;
  const next: AuctionState = {
    ...state,
    teams,
    results: [won, ...state.results],
    lotCounter: state.lotCounter + 1,
    log: addLog(
      state,
      `${winner.name} won ${lot.player.name} — $${lot.currentBid} / ${years}yr${years > 1 ? 's' : ''}`
    ),
  };
  return advanceNomination(next, next.nomPointer);
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export const initialAuctionState: AuctionState = {
  phase: 'setup',
  paused: false,
  teams: [],
  nomPointer: 0,
  nomTurn: 0,
  nomSecondsLeft: DEFAULT_SETTINGS.nominationSecs,
  lot: null,
  pendingSale: null,
  results: [],
  log: [],
  settings: DEFAULT_SETTINGS,
  lotCounter: 1,
};

export function auctionReducer(state: AuctionState, action: AuctionAction): AuctionState {
  switch (action.type) {
    case 'INIT':
      return {
        ...initialAuctionState,
        teams: action.teams,
        settings: action.settings,
        nomSecondsLeft: action.settings.nominationSecs,
      };

    case 'START': {
      if (state.phase !== 'setup' || state.teams.length === 0) return state;
      const first = state.teams.findIndex((t) => teamCanParticipate(t, state.settings));
      if (first === -1) return { ...state, phase: 'complete' };
      return {
        ...state,
        phase: 'nomination',
        paused: false,
        nomPointer: first,
        nomTurn: state.nomTurn + 1,
        nomSecondsLeft: state.settings.nominationSecs,
        log: addLog(state, 'Draft started'),
      };
    }

    case 'PAUSE':
      if (state.phase === 'setup' || state.phase === 'complete') return state;
      return { ...state, paused: true, log: addLog(state, 'Draft paused') };

    case 'RESUME':
      return { ...state, paused: false, log: addLog(state, 'Draft resumed') };

    case 'TICK': {
      if (state.paused) return state;
      if (state.phase === 'bidding' && state.lot) {
        const secondsLeft = state.lot.secondsLeft - 1;
        if (secondsLeft > 0) return { ...state, lot: { ...state.lot, secondsLeft } };
        // Timer expired → lot sold to high bidder
        const lot = state.lot;
        const winner = state.teams.find((t) => t.teamId === lot.highBidderId)!;
        if (winner.isUser) {
          // User picks years (unless only one option)
          const options = allowedYears(lot.currentBid);
          if (options.length <= 1) return settleSale(state, winner.teamId, lot, options[0] ?? 1);
          return { ...state, phase: 'years', pendingSale: { lot, winnerId: winner.teamId } };
        }
        return settleSale(state, winner.teamId, lot, autoPickYears(lot.currentBid, lot.player.age));
      }
      if (state.phase === 'nomination') {
        const nomSecondsLeft = state.nomSecondsLeft - 1;
        if (nomSecondsLeft > 0) return { ...state, nomSecondsLeft };
        // Nomination clock expired — the screen decides (auto-nominate or skip)
        // by watching nomSecondsLeft === 0; freeze at 0 until acted upon.
        return { ...state, nomSecondsLeft: 0 };
      }
      return state;
    }

    case 'NOMINATE': {
      if (state.phase !== 'nomination' || state.paused) return state;
      const nominator = state.teams.find((t) => t.teamId === action.byTeamId);
      if (!nominator) return state;
      const opening = Math.max(1, Math.floor(action.openingBid));
      if (opening > maxBid(nominator, state.settings)) return state;
      return {
        ...state,
        phase: 'bidding',
        lot: {
          player: action.player,
          nominatedById: action.byTeamId,
          currentBid: opening,
          highBidderId: action.byTeamId,
          secondsLeft: state.settings.bidSecs,
          bids: [{ teamId: action.byTeamId, amount: opening }],
        },
        log: addLog(state, `${nominator.name} nominated ${action.player.name} at $${opening}`),
      };
    }

    case 'BID': {
      const check = canBid(state, action.teamId, action.amount);
      if (!check.ok || !state.lot) return state;
      const bidder = state.teams.find((t) => t.teamId === action.teamId)!;
      return {
        ...state,
        lot: {
          ...state.lot,
          currentBid: action.amount,
          highBidderId: action.teamId,
          secondsLeft: state.settings.bidSecs,
          bids: [...state.lot.bids, { teamId: action.teamId, amount: action.amount }],
        },
        log: addLog(state, `${bidder.name} bid $${action.amount} on ${state.lot.player.name}`),
      };
    }

    case 'SKIP_NOMINATION': {
      if (state.phase !== 'nomination') return state;
      const skipped = state.teams[state.nomPointer];
      const next = advanceNomination(state, state.nomPointer);
      return { ...next, log: addLog(state, `${skipped.name} skipped their nomination`) };
    }

    case 'MOVE_TEAM': {
      const idx = state.teams.findIndex((t) => t.teamId === action.teamId);
      const swap = action.direction === 'up' ? idx - 1 : idx + 1;
      if (idx === -1 || swap < 0 || swap >= state.teams.length) return state;
      const teams = [...state.teams];
      [teams[idx], teams[swap]] = [teams[swap], teams[idx]];
      // keep the on-clock team on the clock
      let nomPointer = state.nomPointer;
      if (nomPointer === idx) nomPointer = swap;
      else if (nomPointer === swap) nomPointer = idx;
      return { ...state, teams, nomPointer };
    }

    case 'RANDOMIZE_ORDER': {
      if (state.phase !== 'setup') return state;
      const teams = [...state.teams];
      for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
      }
      return { ...state, teams };
    }

    case 'SET_BUDGET': {
      const budget = Math.max(0, Math.floor(action.budget));
      return {
        ...state,
        teams: state.teams.map((t) => (t.teamId === action.teamId ? { ...t, budget } : t)),
      };
    }

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'ASSIGN_YEARS': {
      if (state.phase !== 'years' || !state.pendingSale) return state;
      const { lot, winnerId } = state.pendingSale;
      const allowed = allowedYears(lot.currentBid);
      const years = allowed.includes(action.years) ? action.years : allowed[0] ?? 1;
      return settleSale({ ...state, phase: 'bidding' }, winnerId, lot, years);
    }

    case 'UNDO_LAST_SALE': {
      const last = state.results[0];
      if (!last) return state;
      const teams = state.teams.map((t) =>
        t.teamId === last.teamId
          ? {
              ...t,
              spent: t.spent - last.price,
              wins: t.wins.filter((w) => w.lotNumber !== last.lotNumber),
            }
          : t
      );
      const base: AuctionState = {
        ...state,
        teams,
        results: state.results.slice(1),
        log: addLog(state, `Voided: ${last.player.name} ($${last.price}) — back in the pool`),
      };
      // If the draft had completed, reopen nominations
      if (base.phase === 'complete') return advanceNomination(base, base.nomPointer);
      return base;
    }

    case 'END_DRAFT':
      return { ...state, phase: 'complete', lot: null, pendingSale: null, log: addLog(state, 'Draft ended by commissioner') };

    default:
      return state;
  }
}
