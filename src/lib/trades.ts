import { supabase } from './supabase';
import type { TradeStatus } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TradeAssetType = 'contract' | 'draft_pick' | 'cap_space';

export interface TradeAssetInput {
  asset_type: TradeAssetType;
  from_team_id: string;
  to_team_id: string;
  contract_id?: string;
  draft_pick_id?: string;
  cap_amount?: number;
}

export interface TradeTeamDetail {
  id: string;
  team_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  team: { id: string; team_name: string; owner_name: string } | null;
}

export interface TradeAssetDetail {
  id: string;
  asset_type: TradeAssetType;
  from_team_id: string;
  to_team_id: string;
  cap_amount: number | null;
  contract: {
    id: string;
    salary: number;
    years_remaining: number;
    player: { id: string; full_name: string; position: string; team: string | null } | null;
  } | null;
  draft_pick: {
    id: string;
    season: number;
    round: number;
    pick_number: number | null;
    original_team: { team_name: string } | null;
  } | null;
}

export interface TradeDetail {
  id: string;
  league_id: string;
  proposer_team_id: string;
  status: TradeStatus;
  notes: string | null;
  created_at: string;
  expires_at: string | null;
  completed_at: string | null;
  trade_teams: TradeTeamDetail[];
  trade_assets: TradeAssetDetail[];
}

const TRADE_SELECT = `
  id, league_id, proposer_team_id, status, notes, created_at, expires_at, completed_at,
  trade_teams (
    id, team_id, status,
    team:teams ( id, team_name, owner_name )
  ),
  trade_assets (
    id, asset_type, from_team_id, to_team_id, cap_amount,
    contract:contracts (
      id, salary, years_remaining,
      player:players ( id, full_name, position, team )
    ),
    draft_pick:draft_picks (
      id, season, round, pick_number,
      original_team:teams!draft_picks_original_team_id_fkey ( team_name )
    )
  )
`;

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function fetchTrades(leagueId: string): Promise<TradeDetail[]> {
  const { data, error } = await supabase
    .from('trades')
    .select(TRADE_SELECT)
    .eq('league_id', leagueId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TradeDetail[];
}

export async function fetchTrade(tradeId: string): Promise<TradeDetail | null> {
  const { data, error } = await supabase
    .from('trades')
    .select(TRADE_SELECT)
    .eq('id', tradeId)
    .single();
  if (error) return null;
  return data as unknown as TradeDetail;
}

// ─── Mutations (via SECURITY DEFINER RPCs) ───────────────────────────────────

export async function proposeTrade(params: {
  leagueId: string;
  teamIds: string[];
  assets: TradeAssetInput[];
  notes?: string;
  expiresHours?: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc('propose_trade', {
    p_league_id: params.leagueId,
    p_team_ids: params.teamIds,
    p_assets: params.assets,
    p_notes: params.notes ?? null,
    p_expires_hours: params.expiresHours ?? 72,
  });
  if (error) throw error;
  return data as string;
}

/** Returns the resulting state: 'accepted' | 'rejected' | 'completed' | 'expired' */
export async function respondToTrade(
  tradeId: string,
  response: 'accept' | 'reject'
): Promise<string> {
  const { data, error } = await supabase.rpc('respond_to_trade', {
    p_trade_id: tradeId,
    p_response: response,
  });
  if (error) throw error;
  return data as string;
}

export async function cancelTrade(tradeId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_trade', { p_trade_id: tradeId });
  if (error) throw error;
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export function describeAsset(asset: TradeAssetDetail): string {
  if (asset.asset_type === 'contract' && asset.contract) {
    const p = asset.contract.player;
    return `${p?.full_name ?? 'Unknown'} (${p?.position ?? '?'}) — $${asset.contract.salary}/yr, ${asset.contract.years_remaining}yr left`;
  }
  if (asset.asset_type === 'draft_pick' && asset.draft_pick) {
    const pk = asset.draft_pick;
    const rd = pk.round;
    const suffix = rd === 1 ? 'st' : rd === 2 ? 'nd' : rd === 3 ? 'rd' : 'th';
    const via = pk.original_team?.team_name ? ` (${pk.original_team.team_name})` : '';
    return `${pk.season} ${rd}${suffix} Round Pick${via}`;
  }
  if (asset.asset_type === 'cap_space') {
    return `$${asset.cap_amount} Cap Space`;
  }
  return 'Unknown asset';
}

export const TRADE_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#10B981',
  approved: '#10B981',
  completed: '#10B981',
  rejected: '#EF4444',
  expired: '#6B7280',
  cancelled: '#6B7280',
};
