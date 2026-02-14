-- NFL Players (synced from Sleeper)
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY, -- sleeper_player_id as text
  sleeper_player_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  position TEXT CHECK (position IN ('QB', 'RB', 'WR', 'TE')),
  team TEXT, -- NFL team abbreviation
  age INTEGER,
  years_exp INTEGER,
  status TEXT DEFAULT 'Active',
  search_full_name TEXT, -- lowercase for search
  search_last_name TEXT, -- lowercase for search
  fantasy_points_2025 NUMERIC(8,2),
  games_played_2025 INTEGER,
  ppg_2025 NUMERIC(6,2),
  sleeper_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_position ON players(position);
CREATE INDEX idx_players_team ON players(team);
CREATE INDEX idx_players_search ON players(search_full_name);
CREATE INDEX idx_players_sleeper ON players(sleeper_player_id);

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id),
  salary INTEGER NOT NULL CHECK (salary >= 0),
  years_total INTEGER NOT NULL CHECK (years_total BETWEEN 1 AND 5),
  years_remaining INTEGER NOT NULL CHECK (years_remaining >= 0),
  start_season INTEGER NOT NULL,
  end_season INTEGER NOT NULL,
  contract_type TEXT DEFAULT 'standard' CHECK (contract_type IN ('standard', 'rookie', 'extension', 'free_agent', 'tag')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released', 'traded', 'expired', 'voided')),
  acquisition_type TEXT CHECK (acquisition_type IN ('draft', 'trade', 'free_agent', 'auction', 'waiver')),
  dead_cap_hit INTEGER DEFAULT 0,
  acquisition_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_league ON contracts(league_id);
CREATE INDEX idx_contracts_team ON contracts(team_id);
CREATE INDEX idx_contracts_player ON contracts(player_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_active ON contracts(league_id, team_id) WHERE status = 'active';

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Expired contracts (for franchise tag eligibility)
CREATE TABLE IF NOT EXISTS expired_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  previous_salary INTEGER NOT NULL,
  eligible_for_franchise_tag BOOLEAN DEFAULT TRUE,
  season INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expired_contracts_league ON expired_contracts(league_id, season);

-- RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expired_contracts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read players (public data)
CREATE POLICY "Authenticated users can read players"
  ON players FOR SELECT
  TO authenticated
  USING (true);

-- League members can view contracts
CREATE POLICY "Members can view contracts"
  ON contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = contracts.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view expired contracts"
  ON expired_contracts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = expired_contracts.league_id
      AND league_members.user_id = auth.uid()
    )
  );
