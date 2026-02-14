-- Draft picks
CREATE TABLE IF NOT EXISTS draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 5),
  pick_number INTEGER, -- Set after draft order determined
  original_team_id UUID NOT NULL REFERENCES teams(id),
  current_team_id UUID NOT NULL REFERENCES teams(id),
  is_used BOOLEAN DEFAULT FALSE,
  player_id TEXT REFERENCES players(id),
  salary INTEGER, -- Cap value assigned to pick
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, season, round, original_team_id)
);

CREATE INDEX idx_draft_picks_league ON draft_picks(league_id, season);
CREATE INDEX idx_draft_picks_current ON draft_picks(current_team_id);
CREATE INDEX idx_draft_picks_original ON draft_picks(original_team_id);

CREATE TRIGGER draft_picks_updated_at
  BEFORE UPDATE ON draft_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add FK from trade_assets to draft_picks
ALTER TABLE trade_assets
  ADD CONSTRAINT fk_trade_assets_draft_pick
  FOREIGN KEY (draft_pick_id) REFERENCES draft_picks(id);

-- Franchise tags (calculated per position per season)
CREATE TABLE IF NOT EXISTS franchise_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  position TEXT NOT NULL,
  tag_salary INTEGER NOT NULL,
  pool_size INTEGER NOT NULL,
  top_players JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, season, position)
);

-- Franchise tag usage (1 per team per season)
CREATE TABLE IF NOT EXISTS franchise_tag_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  player_id TEXT NOT NULL REFERENCES players(id),
  season INTEGER NOT NULL,
  tag_salary INTEGER NOT NULL,
  contract_id UUID REFERENCES contracts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id, season)
);

-- RLS
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_tag_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view draft picks"
  ON draft_picks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = draft_picks.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view franchise tags"
  ON franchise_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = franchise_tags.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view tag usage"
  ON franchise_tag_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = franchise_tag_usage.league_id
      AND league_members.user_id = auth.uid()
    )
  );
