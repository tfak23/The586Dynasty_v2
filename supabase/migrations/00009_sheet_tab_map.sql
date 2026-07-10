-- Sheet tab mapping: replaces hardcoded OWNER_MAP in edge functions.
-- Maps each team to its Google Sheet tab, editable by commissioners
-- so ownership changes (e.g. Karl -> Tyler, Vinny -> Tony) never
-- silently break sheet sync again.

CREATE TABLE IF NOT EXISTS sheet_tab_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  sleeper_username TEXT NOT NULL,
  tab_name TEXT NOT NULL,
  owner_full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, sleeper_username),
  UNIQUE(league_id, tab_name)
);

CREATE INDEX idx_sheet_tab_map_league ON sheet_tab_map(league_id);

CREATE TRIGGER sheet_tab_map_updated_at
  BEFORE UPDATE ON sheet_tab_map
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE sheet_tab_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sheet tab map"
  ON sheet_tab_map FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = sheet_tab_map.league_id
      AND league_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Commissioners can manage sheet tab map"
  ON sheet_tab_map FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = sheet_tab_map.league_id
      AND league_members.user_id = auth.uid()
      AND league_members.role IN ('commissioner', 'co-commissioner')
    )
  );

-- Seed current owners (2026). Tab names match the Google Sheet tabs.
-- league_id is filled at seed time by joining on the league row.
-- This INSERT is written to be safe to run after initialize-league.
INSERT INTO sheet_tab_map (league_id, sleeper_username, tab_name, owner_full_name)
SELECT l.id, v.sleeper_username, v.tab_name, v.owner_full_name
FROM leagues l
CROSS JOIN (VALUES
  ('abhanot11',  'Akshay', 'Akshay Bhanot'),
  ('brcarnag',   'Brian',  'Brian Carnaghi'),
  ('CanThePan',  'Dan',    'Dan Carnaghi'),
  ('DomDuhBomb', 'Dom',    'Dominic Puzzuoli'),
  ('Gazarato',   'Jamie',  'James Gazarato'),
  ('tloslice',   'Tyler',  'Tyler Lofton'),
  ('NickDnof',   'Nick',   'Nick D''Onofrio'),
  ('TonyFF',     'Tony',   'Tony Fakhouri'),
  ('TrevorH42',  'Trevor', 'Trevor Hurd'),
  ('miket1326',  'Trudy',  'Mike Trudel'),
  ('bigwily57',  'Willy',  'Jimmy Wilson'),
  ('zachg1313',  'Zach',   'Zach Gravatas')
) AS v(sleeper_username, tab_name, owner_full_name)
WHERE l.sleeper_league_id = '1315789488873553920'
ON CONFLICT (league_id, sleeper_username) DO UPDATE
  SET tab_name = EXCLUDED.tab_name,
      owner_full_name = EXCLUDED.owner_full_name,
      is_active = TRUE;
