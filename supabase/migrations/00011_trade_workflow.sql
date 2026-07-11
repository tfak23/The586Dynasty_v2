-- Trade workflow: propose / respond / cancel RPCs.
-- All mutations go through SECURITY DEFINER functions so no extra RLS
-- INSERT/UPDATE policies are needed on trades / trade_teams / trade_assets.
-- A trade auto-executes (contracts + picks move, cap space becomes
-- cap_adjustments) the moment every participating team has accepted.

-- ─── Helper: the team owned by the calling user in a league ─────────────────
CREATE OR REPLACE FUNCTION caller_team_id(p_league_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM teams
  WHERE league_id = p_league_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- ─── Propose a trade (supports 2+ teams) ─────────────────────────────────────
-- p_team_ids: every participating team (must include the caller's team)
-- p_assets: jsonb array of
--   { "asset_type": "contract"|"draft_pick"|"cap_space",
--     "from_team_id": uuid, "to_team_id": uuid,
--     "contract_id": uuid?, "draft_pick_id": uuid?, "cap_amount": int? }
CREATE OR REPLACE FUNCTION propose_trade(
  p_league_id UUID,
  p_team_ids UUID[],
  p_assets JSONB,
  p_notes TEXT DEFAULT NULL,
  p_expires_hours INTEGER DEFAULT 72
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_team UUID;
  v_trade_id UUID;
  v_team UUID;
  v_asset JSONB;
  v_type TEXT;
  v_from UUID;
  v_to UUID;
BEGIN
  v_my_team := caller_team_id(p_league_id);
  IF v_my_team IS NULL THEN
    RAISE EXCEPTION 'You do not own a team in this league';
  END IF;
  IF NOT (v_my_team = ANY(p_team_ids)) THEN
    RAISE EXCEPTION 'Your team must be part of the trade';
  END IF;
  IF array_length(p_team_ids, 1) < 2 THEN
    RAISE EXCEPTION 'A trade needs at least two teams';
  END IF;
  IF p_assets IS NULL OR jsonb_array_length(p_assets) = 0 THEN
    RAISE EXCEPTION 'A trade needs at least one asset';
  END IF;

  INSERT INTO trades (league_id, proposer_team_id, status, notes, expires_at)
  VALUES (
    p_league_id, v_my_team, 'pending', p_notes,
    NOW() + make_interval(hours => GREATEST(1, p_expires_hours))
  )
  RETURNING id INTO v_trade_id;

  -- Participants: proposer auto-accepts, everyone else pending
  FOREACH v_team IN ARRAY p_team_ids LOOP
    INSERT INTO trade_teams (trade_id, team_id, status)
    VALUES (v_trade_id, v_team, CASE WHEN v_team = v_my_team THEN 'accepted' ELSE 'pending' END);
  END LOOP;

  -- Assets, with ownership validation
  FOR v_asset IN SELECT * FROM jsonb_array_elements(p_assets) LOOP
    v_type := v_asset->>'asset_type';
    v_from := (v_asset->>'from_team_id')::UUID;
    v_to := (v_asset->>'to_team_id')::UUID;

    IF NOT (v_from = ANY(p_team_ids)) OR NOT (v_to = ANY(p_team_ids)) OR v_from = v_to THEN
      RAISE EXCEPTION 'Asset must move between two distinct participating teams';
    END IF;

    IF v_type = 'contract' THEN
      IF NOT EXISTS (
        SELECT 1 FROM contracts
        WHERE id = (v_asset->>'contract_id')::UUID
          AND team_id = v_from AND status = 'active'
      ) THEN
        RAISE EXCEPTION 'Contract does not belong to the sending team';
      END IF;
      INSERT INTO trade_assets (trade_id, asset_type, from_team_id, to_team_id, contract_id)
      VALUES (v_trade_id, 'contract', v_from, v_to, (v_asset->>'contract_id')::UUID);

    ELSIF v_type = 'draft_pick' THEN
      IF NOT EXISTS (
        SELECT 1 FROM draft_picks
        WHERE id = (v_asset->>'draft_pick_id')::UUID
          AND current_team_id = v_from AND is_used = FALSE
      ) THEN
        RAISE EXCEPTION 'Draft pick does not belong to the sending team';
      END IF;
      INSERT INTO trade_assets (trade_id, asset_type, from_team_id, to_team_id, draft_pick_id)
      VALUES (v_trade_id, 'draft_pick', v_from, v_to, (v_asset->>'draft_pick_id')::UUID);

    ELSIF v_type = 'cap_space' THEN
      IF COALESCE((v_asset->>'cap_amount')::INT, 0) <= 0 THEN
        RAISE EXCEPTION 'Cap space amount must be positive';
      END IF;
      INSERT INTO trade_assets (trade_id, asset_type, from_team_id, to_team_id, cap_amount)
      VALUES (v_trade_id, 'cap_space', v_from, v_to, (v_asset->>'cap_amount')::INT);

    ELSE
      RAISE EXCEPTION 'Unknown asset type: %', v_type;
    END IF;
  END LOOP;

  RETURN v_trade_id;
END;
$$;

-- ─── Execute a fully-accepted trade (internal) ───────────────────────────────
CREATE OR REPLACE FUNCTION execute_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade trades%ROWTYPE;
  v_asset RECORD;
  v_season INTEGER;
  v_col TEXT;
BEGIN
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id FOR UPDATE;
  IF v_trade.status <> 'pending' THEN
    RAISE EXCEPTION 'Trade is not pending';
  END IF;

  SELECT current_season INTO v_season FROM leagues WHERE id = v_trade.league_id;
  v_season := COALESCE(v_season, 2026);
  IF v_season < 2026 OR v_season > 2030 THEN
    v_season := 2026;
  END IF;
  v_col := 'amount_' || v_season;

  FOR v_asset IN SELECT * FROM trade_assets WHERE trade_id = p_trade_id LOOP
    IF v_asset.asset_type = 'contract' THEN
      UPDATE contracts SET team_id = v_asset.to_team_id
      WHERE id = v_asset.contract_id AND team_id = v_asset.from_team_id;

    ELSIF v_asset.asset_type = 'draft_pick' THEN
      UPDATE draft_picks SET current_team_id = v_asset.to_team_id
      WHERE id = v_asset.draft_pick_id AND current_team_id = v_asset.from_team_id;

    ELSIF v_asset.asset_type = 'cap_space' THEN
      -- Sender takes a positive hit, receiver gets a credit, current season
      EXECUTE format(
        'INSERT INTO cap_adjustments (league_id, team_id, adjustment_type, %I, description, trade_id)
         VALUES ($1, $2, ''dead_cap'', $3, $4, $5)', v_col
      ) USING v_trade.league_id, v_asset.from_team_id, v_asset.cap_amount,
              'Trade: cap space sent', p_trade_id;
      EXECUTE format(
        'INSERT INTO cap_adjustments (league_id, team_id, adjustment_type, %I, description, trade_id)
         VALUES ($1, $2, ''credit'', $3, $4, $5)', v_col
      ) USING v_trade.league_id, v_asset.to_team_id, -v_asset.cap_amount,
              'Trade: cap space received', p_trade_id;
    END IF;
  END LOOP;

  UPDATE trades SET status = 'completed', completed_at = NOW() WHERE id = p_trade_id;
END;
$$;

-- ─── Respond to a trade: accept or reject ────────────────────────────────────
-- Accept from every team executes the trade automatically.
CREATE OR REPLACE FUNCTION respond_to_trade(
  p_trade_id UUID,
  p_response TEXT  -- 'accept' | 'reject'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade trades%ROWTYPE;
  v_my_team UUID;
  v_pending INTEGER;
BEGIN
  IF p_response NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'Response must be accept or reject';
  END IF;

  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id FOR UPDATE;
  IF v_trade.id IS NULL THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;
  IF v_trade.status <> 'pending' THEN
    RAISE EXCEPTION 'Trade is no longer pending (status: %)', v_trade.status;
  END IF;
  IF v_trade.expires_at IS NOT NULL AND v_trade.expires_at < NOW() THEN
    UPDATE trades SET status = 'expired' WHERE id = p_trade_id;
    RETURN 'expired';
  END IF;

  v_my_team := caller_team_id(v_trade.league_id);
  IF v_my_team IS NULL OR NOT EXISTS (
    SELECT 1 FROM trade_teams WHERE trade_id = p_trade_id AND team_id = v_my_team
  ) THEN
    RAISE EXCEPTION 'Your team is not part of this trade';
  END IF;

  IF p_response = 'reject' THEN
    UPDATE trade_teams SET status = 'rejected'
    WHERE trade_id = p_trade_id AND team_id = v_my_team;
    UPDATE trades SET status = 'rejected' WHERE id = p_trade_id;
    RETURN 'rejected';
  END IF;

  UPDATE trade_teams SET status = 'accepted'
  WHERE trade_id = p_trade_id AND team_id = v_my_team;

  SELECT COUNT(*) INTO v_pending
  FROM trade_teams WHERE trade_id = p_trade_id AND status <> 'accepted';

  IF v_pending = 0 THEN
    PERFORM execute_trade(p_trade_id);
    RETURN 'completed';
  END IF;

  RETURN 'accepted';
END;
$$;

-- ─── Cancel a pending trade (proposer only) ──────────────────────────────────
CREATE OR REPLACE FUNCTION cancel_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade trades%ROWTYPE;
  v_my_team UUID;
BEGIN
  SELECT * INTO v_trade FROM trades WHERE id = p_trade_id FOR UPDATE;
  IF v_trade.id IS NULL THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;
  v_my_team := caller_team_id(v_trade.league_id);
  IF v_my_team IS NULL OR v_my_team <> v_trade.proposer_team_id THEN
    RAISE EXCEPTION 'Only the proposing team can cancel a trade';
  END IF;
  IF v_trade.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending trades can be cancelled';
  END IF;
  UPDATE trades SET status = 'cancelled' WHERE id = p_trade_id;
END;
$$;

GRANT EXECUTE ON FUNCTION caller_team_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION propose_trade(UUID, UUID[], JSONB, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_trade(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_trade(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION execute_trade(UUID) FROM authenticated, anon;
