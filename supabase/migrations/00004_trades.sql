-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  proposer_team_id UUID NOT NULL REFERENCES teams(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'approved', 'completed', 'rejected', 'expired', 'cancelled')),
  votes_for INTEGER DEFAULT 0,
  votes_against INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_league ON trades(league_id);
CREATE INDEX idx_trades_status ON trades(league_id, status);
CREATE INDEX idx_trades_proposer ON trades(proposer_team_id);

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trade teams (participants)
CREATE TABLE IF NOT EXISTS trade_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id, team_id)
);

CREATE INDEX idx_trade_teams_trade ON trade_teams(trade_id);

-- Trade assets
CREATE TABLE IF NOT EXISTS trade_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('contract', 'draft_pick', 'cap_space')),
  from_team_id UUID NOT NULL REFERENCES teams(id),
  to_team_id UUID NOT NULL REFERENCES teams(id),
  contract_id UUID REFERENCES contracts(id),
  draft_pick_id UUID, -- FK added after draft_picks table
  cap_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trade_assets_trade ON trade_assets(trade_id);

-- Trade votes
CREATE TABLE IF NOT EXISTS trade_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'veto')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id, team_id)
);

CREATE INDEX idx_trade_votes_trade ON trade_votes(trade_id);

-- Trade history (archive)
CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  trade_id UUID REFERENCES trades(id),
  trade_number TEXT, -- e.g. "26.01"
  trade_year INTEGER,
  team1_id UUID REFERENCES teams(id),
  team2_id UUID REFERENCES teams(id),
  team1_received JSONB DEFAULT '[]',
  team2_received JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trade_history_league ON trade_history(league_id, trade_year);

-- RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

-- Members can view trades in their league
CREATE POLICY "Members can view trades"
  ON trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = trades.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view trade teams"
  ON trade_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trades
      JOIN league_members ON league_members.league_id = trades.league_id
      WHERE trades.id = trade_teams.trade_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view trade assets"
  ON trade_assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trades
      JOIN league_members ON league_members.league_id = trades.league_id
      WHERE trades.id = trade_assets.trade_id
      AND league_members.user_id = auth.uid()
    )
  );

-- Users can only insert their own team's votes
CREATE POLICY "Users can view trade votes"
  ON trade_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trades
      JOIN league_members ON league_members.league_id = trades.league_id
      WHERE trades.id = trade_votes.trade_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own vote"
  ON trade_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = trade_votes.team_id
      AND teams.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view trade history"
  ON trade_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = trade_history.league_id
      AND league_members.user_id = auth.uid()
    )
  );
