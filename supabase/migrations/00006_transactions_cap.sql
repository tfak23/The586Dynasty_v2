-- Cap transactions log
CREATE TABLE IF NOT EXISTS cap_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  transaction_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  reference_id UUID, -- trade_id, contract_id, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cap_transactions_team ON cap_transactions(team_id);

-- Cap adjustments (dead money, credits, manual adjustments)
CREATE TABLE IF NOT EXISTS cap_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  adjustment_type TEXT NOT NULL, -- 'dead_cap', 'credit', 'penalty', 'manual'
  amount_2026 INTEGER DEFAULT 0,
  amount_2027 INTEGER DEFAULT 0,
  amount_2028 INTEGER DEFAULT 0,
  amount_2029 INTEGER DEFAULT 0,
  amount_2030 INTEGER DEFAULT 0,
  player_name TEXT,
  description TEXT,
  trade_id UUID REFERENCES trades(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cap_adjustments_team ON cap_adjustments(team_id);
CREATE INDEX idx_cap_adjustments_league ON cap_adjustments(league_id);

-- Sync log
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'sleeper_rosters', 'sleeper_league', 'players', 'stats', 'sheet_sync'
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  details JSONB DEFAULT '{}',
  rows_affected INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_log_league ON sync_log(league_id, sync_type);

-- RLS
ALTER TABLE cap_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view cap transactions"
  ON cap_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = cap_transactions.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view cap adjustments"
  ON cap_adjustments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = cap_adjustments.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view sync log"
  ON sync_log FOR SELECT
  USING (
    league_id IS NULL OR EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = sync_log.league_id
      AND league_members.user_id = auth.uid()
    )
  );
