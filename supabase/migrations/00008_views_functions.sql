-- Team cap summary view
CREATE OR REPLACE VIEW team_cap_summary AS
SELECT
  t.id AS team_id,
  t.league_id,
  t.team_name,
  t.owner_name,
  l.salary_cap,
  COALESCE(SUM(c.salary) FILTER (WHERE c.status = 'active'), 0) AS total_salary,
  l.salary_cap - COALESCE(SUM(c.salary) FILTER (WHERE c.status = 'active'), 0)
    - COALESCE(adj.total_dead_cap, 0) AS cap_room,
  COUNT(c.id) FILTER (WHERE c.status = 'active') AS contract_count,
  COALESCE(adj.total_dead_cap, 0) AS dead_cap
FROM teams t
JOIN leagues l ON l.id = t.league_id
LEFT JOIN contracts c ON c.team_id = t.id AND c.status = 'active'
LEFT JOIN (
  SELECT
    ca.team_id,
    SUM(ca.amount_2026) AS total_dead_cap
  FROM cap_adjustments ca
  GROUP BY ca.team_id
) adj ON adj.team_id = t.id
GROUP BY t.id, t.league_id, t.team_name, t.owner_name, l.salary_cap, adj.total_dead_cap;

-- Team contract years validation view
CREATE OR REPLACE VIEW team_contract_years AS
SELECT
  t.id AS team_id,
  t.team_name,
  c.player_id,
  p.full_name,
  c.salary,
  c.years_remaining,
  c.end_season,
  c.contract_type,
  c.status
FROM teams t
JOIN contracts c ON c.team_id = t.id AND c.status = 'active'
JOIN players p ON p.id = c.player_id
ORDER BY t.team_name, c.salary DESC;

-- RPC: Get league cap summary for all teams
CREATE OR REPLACE FUNCTION get_league_cap_detailed(p_league_id UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  owner_name TEXT,
  salary_cap INTEGER,
  total_salary BIGINT,
  cap_room BIGINT,
  contract_count BIGINT,
  dead_cap BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tcs.team_id,
    tcs.team_name,
    tcs.owner_name,
    tcs.salary_cap,
    tcs.total_salary,
    tcs.cap_room,
    tcs.contract_count,
    tcs.dead_cap
  FROM team_cap_summary tcs
  WHERE tcs.league_id = p_league_id
  ORDER BY tcs.cap_room DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get team cap projection (5 years)
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
    SELECT generate_series(v_current_season + 1, v_current_season + 5) AS yr
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
          CASE y.yr - v_current_season
            WHEN 1 THEN ca.amount_2026
            WHEN 2 THEN ca.amount_2027
            WHEN 3 THEN ca.amount_2028
            WHEN 4 THEN ca.amount_2029
            WHEN 5 THEN ca.amount_2030
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

-- RPC: Release a contract (with dead cap generation)
CREATE OR REPLACE FUNCTION release_contract(
  p_contract_id UUID,
  p_reason TEXT DEFAULT 'Released'
)
RETURNS VOID AS $$
DECLARE
  v_contract RECORD;
  v_dead_pcts NUMERIC[];
  v_i INTEGER;
  v_dead_amounts INTEGER[];
  v_year_cols TEXT[] := ARRAY['amount_2026','amount_2027','amount_2028','amount_2029','amount_2030'];
  v_current_season INTEGER;
BEGIN
  -- Get contract details
  SELECT c.*, l.current_season
  INTO v_contract
  FROM contracts c
  JOIN leagues l ON l.id = c.league_id
  WHERE c.id = p_contract_id AND c.status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contract not found or not active';
  END IF;

  v_current_season := v_contract.current_season;

  -- Mark contract as released
  UPDATE contracts
  SET status = 'released', updated_at = NOW()
  WHERE id = p_contract_id;

  -- Calculate dead cap based on years remaining
  -- $1 contracts: 100% dead cap year 1
  IF v_contract.salary <= 1 THEN
    INSERT INTO cap_adjustments (
      league_id, team_id, adjustment_type,
      amount_2026, player_name, description
    ) VALUES (
      v_contract.league_id, v_contract.team_id, 'dead_cap',
      1,
      (SELECT full_name FROM players WHERE id = v_contract.player_id),
      p_reason
    );
  ELSE
    -- Standard dead cap schedule
    CASE v_contract.years_remaining
      WHEN 5 THEN v_dead_pcts := ARRAY[0.75, 0.50, 0.25, 0.10, 0.10];
      WHEN 4 THEN v_dead_pcts := ARRAY[0.75, 0.50, 0.25, 0.10];
      WHEN 3 THEN v_dead_pcts := ARRAY[0.50, 0.25, 0.10];
      WHEN 2 THEN v_dead_pcts := ARRAY[0.50, 0.25];
      WHEN 1 THEN v_dead_pcts := ARRAY[0.50];
      ELSE v_dead_pcts := ARRAY[0.50];
    END CASE;

    INSERT INTO cap_adjustments (
      league_id, team_id, adjustment_type,
      amount_2026, amount_2027, amount_2028, amount_2029, amount_2030,
      player_name, description
    ) VALUES (
      v_contract.league_id, v_contract.team_id, 'dead_cap',
      CASE WHEN array_length(v_dead_pcts, 1) >= 1 THEN CEIL(v_contract.salary * v_dead_pcts[1]) ELSE 0 END,
      CASE WHEN array_length(v_dead_pcts, 1) >= 2 THEN CEIL(v_contract.salary * v_dead_pcts[2]) ELSE 0 END,
      CASE WHEN array_length(v_dead_pcts, 1) >= 3 THEN CEIL(v_contract.salary * v_dead_pcts[3]) ELSE 0 END,
      CASE WHEN array_length(v_dead_pcts, 1) >= 4 THEN CEIL(v_contract.salary * v_dead_pcts[4]) ELSE 0 END,
      CASE WHEN array_length(v_dead_pcts, 1) >= 5 THEN CEIL(v_contract.salary * v_dead_pcts[5]) ELSE 0 END,
      (SELECT full_name FROM players WHERE id = v_contract.player_id),
      p_reason
    );
  END IF;

  -- Create expired contract record for franchise tag eligibility
  INSERT INTO expired_contracts (
    league_id, player_id, team_id, previous_salary, season
  ) VALUES (
    v_contract.league_id, v_contract.player_id, v_contract.team_id,
    v_contract.salary, v_current_season
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Calculate franchise tag values
CREATE OR REPLACE FUNCTION calculate_franchise_tags(
  p_league_id UUID,
  p_season INTEGER
)
RETURNS TABLE (
  pos TEXT,
  tag_salary INTEGER,
  pool_size INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH position_pools AS (
    SELECT
      p.position AS pos,
      c.salary,
      ROW_NUMBER() OVER (PARTITION BY p.position ORDER BY c.salary DESC) AS rn,
      CASE p.position
        WHEN 'QB' THEN 10
        WHEN 'TE' THEN 10
        WHEN 'RB' THEN 20
        WHEN 'WR' THEN 20
        ELSE 10
      END AS pool
    FROM contracts c
    JOIN players p ON p.id = c.player_id
    WHERE c.league_id = p_league_id
    AND c.status = 'active'
    AND p.position IN ('QB', 'RB', 'WR', 'TE')
  )
  SELECT
    pp.pos,
    CEIL(AVG(pp.salary))::INTEGER AS tag_salary,
    pp.pool AS pool_size
  FROM position_pools pp
  WHERE pp.rn <= pp.pool
  GROUP BY pp.pos, pp.pool;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Advance season
CREATE OR REPLACE FUNCTION advance_season(
  p_league_id UUID,
  p_commissioner_team_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_league RECORD;
BEGIN
  -- Verify commissioner
  IF NOT EXISTS (
    SELECT 1 FROM league_commissioners
    WHERE league_id = p_league_id AND team_id = p_commissioner_team_id
  ) THEN
    RAISE EXCEPTION 'Not authorized as commissioner';
  END IF;

  SELECT * INTO v_league FROM leagues WHERE id = p_league_id;

  -- Decrement years remaining on all active contracts
  UPDATE contracts
  SET years_remaining = years_remaining - 1,
      updated_at = NOW()
  WHERE league_id = p_league_id
  AND status = 'active'
  AND years_remaining > 0;

  -- Mark expired contracts
  UPDATE contracts
  SET status = 'expired', updated_at = NOW()
  WHERE league_id = p_league_id
  AND status = 'active'
  AND years_remaining <= 0;

  -- Shift cap adjustments (2027->2026, 2028->2027, etc.)
  UPDATE cap_adjustments
  SET
    amount_2026 = amount_2027,
    amount_2027 = amount_2028,
    amount_2028 = amount_2029,
    amount_2029 = amount_2030,
    amount_2030 = 0
  WHERE league_id = p_league_id;

  -- Clean up zero adjustments
  DELETE FROM cap_adjustments
  WHERE league_id = p_league_id
  AND amount_2026 = 0 AND amount_2027 = 0 AND amount_2028 = 0
  AND amount_2029 = 0 AND amount_2030 = 0;

  -- Advance league season
  UPDATE leagues
  SET current_season = current_season + 1,
      updated_at = NOW()
  WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
