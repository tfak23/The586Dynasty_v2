import { SUPABASE_URL, SUPABASE_ANON_KEY, SLEEPER_LEAGUE_ID } from './constants';
import { supabase } from './supabase';
import { TRADE_HISTORY, type HistoricalTrade } from './tradeHistory';

export interface SleeperTradeSummary {
  transaction_id: string;
  week: number;
  teams: string[];
  playerCount: number;
  pickCount: number;
  created: number;
}

export interface TradeSyncResult {
  trades: HistoricalTrade[];
  unmatchedSleeperTrades: SleeperTradeSummary[];
  /** 'sheet' when live data came from the sync-trades function, 'fallback' when
   *  we used the bundled TRADE_HISTORY (function unavailable or errored). */
  source: 'sheet' | 'fallback';
}

/**
 * Live trade history: pulls the sheet's Trades tab (parsed + Sleeper-checked)
 * via the sync-trades edge function, falling back to the bundled TRADE_HISTORY
 * so the Trades tab always renders even if the function isn't deployed yet.
 */
export async function fetchTradeHistory(currentSeason?: number): Promise<TradeSyncResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-trades`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'get-trades',
        sleeper_league_id: SLEEPER_LEAGUE_ID,
        current_season: currentSeason,
      }),
    });

    if (!res.ok) throw new Error(`sync-trades ${res.status}`);
    const data = await res.json();
    if (!data?.trades || !Array.isArray(data.trades) || data.trades.length === 0) {
      throw new Error('sync-trades returned no trades');
    }

    return {
      trades: data.trades as HistoricalTrade[],
      unmatchedSleeperTrades: (data.unmatchedSleeperTrades ?? []) as SleeperTradeSummary[],
      source: 'sheet',
    };
  } catch {
    return { trades: TRADE_HISTORY, unmatchedSleeperTrades: [], source: 'fallback' };
  }
}
