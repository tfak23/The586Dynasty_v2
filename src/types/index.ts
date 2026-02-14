// Core app types

export interface League {
  id: string;
  sleeper_league_id: string;
  name: string;
  salary_cap: number;
  current_season: number;
  trade_approval_mode: 'auto' | 'commissioner' | 'league_vote';
  scoring_settings: Record<string, number>;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Team {
  id: string;
  league_id: string;
  sleeper_roster_id: number;
  sleeper_user_id: string;
  team_name: string;
  owner_name: string;
  avatar_url: string | null;
  division: string | null;
  user_id: string | null;
}

export interface Player {
  id: string;
  sleeper_player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE';
  team: string | null;
  age: number | null;
  years_exp: number | null;
  search_full_name: string;
  search_last_name: string;
  status: string;
}

export type ContractType = 'standard' | 'rookie' | 'extension' | 'free_agent' | 'tag';
export type ContractStatus = 'active' | 'released' | 'traded' | 'expired' | 'voided';
export type AcquisitionType = 'draft' | 'trade' | 'free_agent' | 'auction' | 'waiver';

export interface Contract {
  id: string;
  league_id: string;
  team_id: string;
  player_id: string;
  salary: number;
  years_total: number;
  years_remaining: number;
  start_season: number;
  end_season: number;
  contract_type: ContractType;
  status: ContractStatus;
  acquisition_type: AcquisitionType;
  dead_cap_hit: number;
  acquisition_details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  player?: Player;
  team?: Team;
}

export interface ExpiredContract {
  id: string;
  league_id: string;
  player_id: string;
  team_id: string;
  previous_salary: number;
  eligible_for_franchise_tag: boolean;
  season: number;
}

export type TradeStatus = 'pending' | 'accepted' | 'approved' | 'completed' | 'rejected' | 'expired' | 'cancelled';

export interface Trade {
  id: string;
  league_id: string;
  proposer_team_id: string;
  status: TradeStatus;
  votes_for: number;
  votes_against: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  // Joined
  proposer_team?: Team;
  trade_teams?: TradeTeam[];
  trade_assets?: TradeAsset[];
}

export interface TradeTeam {
  id: string;
  trade_id: string;
  team_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  team?: Team;
}

export type TradeAssetType = 'contract' | 'draft_pick' | 'cap_space';

export interface TradeAsset {
  id: string;
  trade_id: string;
  asset_type: TradeAssetType;
  from_team_id: string;
  to_team_id: string;
  contract_id: string | null;
  draft_pick_id: string | null;
  cap_amount: number | null;
  // Joined
  contract?: Contract;
  draft_pick?: DraftPick;
}

export interface TradeVote {
  id: string;
  trade_id: string;
  team_id: string;
  vote: 'approve' | 'veto';
  created_at: string;
}

export interface DraftPick {
  id: string;
  league_id: string;
  season: number;
  round: number;
  pick_number: number | null;
  original_team_id: string;
  current_team_id: string;
  is_used: boolean;
  player_id: string | null;
  salary: number | null;
  // Joined
  original_team?: Team;
  current_team?: Team;
}

export interface FranchiseTag {
  id: string;
  league_id: string;
  season: number;
  position: string;
  tag_salary: number;
  pool_size: number;
  top_players: Record<string, unknown>[];
}

export interface CapAdjustment {
  id: string;
  league_id: string;
  team_id: string;
  adjustment_type: string;
  amount_2026: number;
  amount_2027: number;
  amount_2028: number;
  amount_2029: number;
  amount_2030: number;
  player_name: string | null;
  description: string;
  trade_id: string | null;
  created_at: string;
}

export interface TeamCapSummary {
  team_id: string;
  team_name: string;
  owner_name: string;
  total_salary: number;
  cap_room: number;
  contract_count: number;
  dead_cap: number;
  salary_cap: number;
}

export interface TradeHistory {
  id: string;
  league_id: string;
  trade_number: string;
  trade_year: number;
  team1_id: string;
  team2_id: string;
  team1_received: Record<string, unknown>[];
  team2_received: Record<string, unknown>[];
  created_at: string;
  // Joined
  team1?: Team;
  team2?: Team;
}

export interface BuyIn {
  id: string;
  league_id: string;
  team_id: string;
  season: number;
  amount_due: number;
  amount_paid: number;
  status: 'paid' | 'partial' | 'unpaid';
  team?: Team;
}

export interface UserProfile {
  id: string;
  sleeper_username: string | null;
  sleeper_user_id: string | null;
  display_name: string | null;
  onboarding_completed: boolean;
}

export interface SyncLog {
  id: string;
  league_id: string;
  sync_type: string;
  status: 'success' | 'partial' | 'failed';
  details: Record<string, unknown>;
  created_at: string;
}

// Settings stored in Zustand
export interface AppSettings {
  rookieDraftRounds: 3 | 4 | 5;
  rookiePickValues: Record<number, number>;
  isOffseason: boolean;
  commissionerTeamIds: string[];
}
