-- Buy-ins tracking
CREATE TABLE IF NOT EXISTS buy_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  season INTEGER NOT NULL,
  amount_due NUMERIC(10,2) DEFAULT 100,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN amount_paid >= amount_due THEN 'paid'
      WHEN amount_paid > 0 THEN 'partial'
      ELSE 'unpaid'
    END
  ) STORED,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id, season)
);

CREATE INDEX idx_buy_ins_league ON buy_ins(league_id, season);

CREATE TRIGGER buy_ins_updated_at
  BEFORE UPDATE ON buy_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- League history / owner stats
CREATE TABLE IF NOT EXISTS league_owner_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  owner_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  titles INTEGER DEFAULT 0,
  runner_up INTEGER DEFAULT 0,
  playoff_appearances INTEGER DEFAULT 0,
  division_titles INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_ties INTEGER DEFAULT 0,
  total_points_for NUMERIC(10,2) DEFAULT 0,
  total_winnings NUMERIC(10,2) DEFAULT 0,
  total_buy_ins NUMERIC(10,2) DEFAULT 0,
  legacy_score NUMERIC(10,2) DEFAULT 0,
  season_history JSONB DEFAULT '[]', -- Array of season records
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id)
);

CREATE TRIGGER league_owner_stats_updated_at
  BEFORE UPDATE ON league_owner_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- League rules
CREATE TABLE IF NOT EXISTS league_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  buy_in_amount NUMERIC(10,2) DEFAULT 100,
  salary_cap_hard INTEGER DEFAULT 500,
  min_contract_years INTEGER DEFAULT 1,
  max_contract_years INTEGER DEFAULT 5,
  rules_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id)
);

CREATE TRIGGER league_rules_updated_at
  BEFORE UPDATE ON league_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE buy_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_owner_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view buy-ins"
  ON buy_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = buy_ins.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view owner stats"
  ON league_owner_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = league_owner_stats.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view rules"
  ON league_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = league_rules.league_id
      AND league_members.user_id = auth.uid()
    )
  );
