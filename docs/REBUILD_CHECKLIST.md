# Supabase Project Rebuild Checklist

*Old project: dqkdsrrgmjmbguqtjgih (us-east-2) — deleted July 2026 after pause/restore failure.*
*New project: **sbsgesznoaucrenmlulx** (us-east-2) — created July 9, 2026.*

## 1. Create project (user) — DONE
- [x] Name: `The 586 Dynasty`, org "The 586", region `us-east-2`
- [x] Database password: saved by Tony

## 2. Capture new credentials — DONE (local)
- [x] Project ref: `sbsgesznoaucrenmlulx`
- [x] Project URL: `https://sbsgesznoaucrenmlulx.supabase.co`
- [x] Local `.env` updated (uses new `sb_publishable_...` key in place of legacy anon key)
- [ ] **GitHub Actions secrets (user)**: repo → Settings → Secrets and variables → Actions →
      update `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the values in local `.env`.
      Do this BEFORE the next push to main, or the deployed site will point at the dead project.

## 3. Apply schema — DONE
- [x] Migrations 00000–00009 applied via SQL Editor (all 24 tables + 2 views verified)
- [x] RLS enabled on all tables
- [ ] Re-run the `sheet_tab_map` seed INSERT after league initialization (it needs the league row to exist; safe to re-run — it upserts)

## 4. Edge function secrets (Settings → Edge Functions → Secrets)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (base64)
- [ ] `GOOGLE_SPREADSHEET_ID` = `1ic6SUzsm-ehUIjCge3RaQdTkX-Gbdjns-c2t9Gj-F_k`
- [ ] Re-share the Google Sheet with the service account email if unchanged (should still be shared)

## 5. Deploy edge functions
- [ ] `supabase functions deploy` for all 13 functions (initialize-league, league-join, league-convert, import-csv, sheet-sync, sleeper-get-leagues, sleeper-link-account, sync-league, sync-players, sync-rosters, sync-stats, trade-action)

## 6. Re-seed data (July 10, 2026)
- [x] `sync-players` — 4,030 players
- [x] `initialize-league` — league 8efd5f95-252b-414e-8e98-b195900b6428, 12 teams, Tony = commissioner
- [x] Sheet → DB contract import — 204 contracts (190 via import-csv + 14 via SQL name disambiguation);
      ALL 12 team salary totals verified exact vs sheet
- [x] sheet_tab_map seeded, 12/12 team_ids attached; teams.user_id linked for registered users
- [ ] **Cap adjustments import** (CAP HITS + CAP CREDITS blocks per tab, cols ~R–W) — cap room is wrong until this lands
- [ ] **Draft picks 2027+** (DRAFT CONSIDERATIONS OWNED blocks; regenerate insert script with new team UUIDs, Klucido08 → tloslice)
- [ ] Buy-ins re-entered by commissioner
- [ ] Taxi/IR flags (12 taxi players currently imported as plain active contracts; needs roster_slot column — Phase 2)

## 7. Auth (July 10, 2026)
- [x] Google OAuth re-wired: GCP client redirect URI → new callback, provider enabled in Supabase,
      site URL https://tfak23.github.io/The586Dynasty_v2 + redirect allow-list (site/** and localhost:8081/**)
- [x] New GCP service-account key created (the-586-dynasty-633b2e6c09e5.json)
- [ ] Remaining 11 members re-register + re-link Sleeper (teams auto-link on Sleeper match)

## 8. Verify
- [x] Sheet sync test-connection succeeds (live read confirmed)
- [x] Deployed web app bundle contains new project ref only
- [x] Google login flow works end to end
- [ ] Cap cards match sheet once cap adjustments imported
