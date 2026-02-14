-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sleeper_league_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  salary_cap INTEGER DEFAULT 500,
  current_season INTEGER DEFAULT 2025,
  trade_approval_mode TEXT DEFAULT 'commissioner' CHECK (trade_approval_mode IN ('auto', 'commissioner', 'league_vote')),
  scoring_settings JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER leagues_updated_at
  BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Teams
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  sleeper_roster_id INTEGER,
  sleeper_user_id TEXT,
  team_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  avatar_url TEXT,
  division TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, sleeper_roster_id)
);

CREATE INDEX idx_teams_league ON teams(league_id);
CREATE INDEX idx_teams_user ON teams(user_id);
CREATE INDEX idx_teams_sleeper_user ON teams(sleeper_user_id);

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- League commissioners
CREATE TABLE IF NOT EXISTS league_commissioners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id)
);

-- League members (links users to leagues)
CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('commissioner', 'co-commissioner', 'member')),
  permissions JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- League registration
CREATE TABLE IF NOT EXISTS league_registration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  registered_by UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id)
);

-- RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_commissioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_registration ENABLE ROW LEVEL SECURITY;

-- League members can read their league data
CREATE POLICY "Members can view own league"
  ON leagues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = leagues.id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view league teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = teams.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view commissioners"
  ON league_commissioners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = league_commissioners.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view own membership"
  ON league_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Members can view registration"
  ON league_registration FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = league_registration.league_id
      AND league_members.user_id = auth.uid()
    )
  );

-- Deferred from 00001 (needs league_members to exist)
CREATE POLICY "Users can view profiles in same league"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members lm1
      JOIN league_members lm2 ON lm1.league_id = lm2.league_id
      WHERE lm1.user_id = auth.uid() AND lm2.user_id = user_profiles.id
    )
  );
