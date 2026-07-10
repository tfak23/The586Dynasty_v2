-- Fix get_team_cap_projection:
-- 1. It skipped the CURRENT season (series started at current_season + 1)
-- 2. Off-by-one in the cap_adjustments year mapping (yr - current_season = 1
--    mapped to amount_2026, i.e. 2027 got 2026's adjustments)
-- The amount_20XX columns are absolute years (2026-2030), so map them directly.

CREATE OR REPLACE FUNCTION get_team_cap_projection(p_team_id UUID)
RETURNS TABLE (
  season INTEGER,
  guaranteed_salary BIGINT,
  contract_count BIGINT,
  dead_cap BIGINT,
  total_committed BIGINT,
  cap_room BIGINT
) AS $$
DECLARE
  v_league_id UUID;
  v_salary_cap INTEGER;
  v_current_season INTEGER;
BEGIN
  SELECT t.league_id, l.salary_cap, l.current_season
  INTO v_league_id, v_salary_cap, v_current_season
  FROM teams t
  JOIN leagues l ON l.id = t.league_id
  WHERE t.id = p_team_id;

  RETURN QUERY
  WITH years AS (
    SELECT generate_series(v_current_season, v_current_season + 4) AS yr
  ),
  contract_projections AS (
    SELECT
      y.yr,
      COALESCE(SUM(c.salary) FILTER (WHERE c.end_season >= y.yr), 0) AS sal,
      COUNT(c.id) FILTER (WHERE c.end_season >= y.yr) AS cnt
    FROM years y
    LEFT JOIN contracts c ON c.team_id = p_team_id AND c.status = 'active'
    GROUP BY y.yr
  ),
  dead_cap_projections AS (
    SELECT
      y.yr,
      COALESCE(
        SUM(
          CASE y.yr
            WHEN 2026 THEN ca.amount_2026
            WHEN 2027 THEN ca.amount_2027
            WHEN 2028 THEN ca.amount_2028
            WHEN 2029 THEN ca.amount_2029
            WHEN 2030 THEN ca.amount_2030
            ELSE 0
          END
        ), 0
      ) AS dc
    FROM years y
    LEFT JOIN cap_adjustments ca ON ca.team_id = p_team_id
    GROUP BY y.yr
  )
  SELECT
    cp.yr AS season,
    cp.sal AS guaranteed_salary,
    cp.cnt AS contract_count,
    dcp.dc AS dead_cap,
    cp.sal + dcp.dc AS total_committed,
    v_salary_cap::BIGINT - cp.sal - dcp.dc AS cap_room
  FROM contract_projections cp
  JOIN dead_cap_projections dcp ON dcp.yr = cp.yr
  ORDER BY cp.yr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
