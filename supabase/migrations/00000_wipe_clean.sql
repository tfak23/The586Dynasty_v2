-- ============================================
-- WIPE CLEAN: Drop all objects from old project
-- Run this BEFORE the 00001-00008 migrations
-- ============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS team_contract_years CASCADE;
DROP VIEW IF EXISTS team_cap_summary CASCADE;

-- Drop functions (and their triggers will auto-drop)
DROP FUNCTION IF EXISTS advance_season(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS calculate_franchise_tags(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS release_contract(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_team_cap_projection(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_league_cap_detailed(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Drop trigger on auth.users (won't cascade from function drop)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS sync_log CASCADE;
DROP TABLE IF EXISTS cap_adjustments CASCADE;
DROP TABLE IF EXISTS cap_transactions CASCADE;
DROP TABLE IF EXISTS franchise_tag_usage CASCADE;
DROP TABLE IF EXISTS franchise_tags CASCADE;
DROP TABLE IF EXISTS draft_picks CASCADE;
DROP TABLE IF EXISTS trade_history CASCADE;
DROP TABLE IF EXISTS trade_votes CASCADE;
DROP TABLE IF EXISTS trade_assets CASCADE;
DROP TABLE IF EXISTS trade_teams CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS expired_contracts CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS league_rules CASCADE;
DROP TABLE IF EXISTS league_owner_stats CASCADE;
DROP TABLE IF EXISTS buy_ins CASCADE;
DROP TABLE IF EXISTS league_registration CASCADE;
DROP TABLE IF EXISTS league_members CASCADE;
DROP TABLE IF EXISTS league_commissioners CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS leagues CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Done! Now run migrations 00001 through 00008.
