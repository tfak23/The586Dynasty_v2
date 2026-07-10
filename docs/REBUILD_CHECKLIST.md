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

## 6. Re-seed data
- [ ] `sync-players` (Sleeper player pool)
- [ ] `initialize-league` / `sync-league` with league ID `1315789488873553920`
- [ ] `sync-rosters`
- [ ] Sheet → DB contract import (Phase 1 import function)
- [ ] `scripts/insert-2026-picks.ts` (update Klucido08 → tloslice first)
- [ ] Buy-ins re-entered by commissioner

## 7. Users
- [ ] All 12 members re-register + re-link Sleeper (onboarding flow)
- [ ] Verify commissioner flags (TonyFF, brcarnag)

## 8. Verify
- [ ] Login → league loads, cap cards match the Google Sheet
- [ ] Sheet sync test-connection action succeeds
- [ ] Deployed web app points at new project
