# The 586 Dynasty — Integration & Auction Draft Plan

*Prepared July 9, 2026*

## 1. Current State (codebase audit)

The app is further along than a greenfield project — most plumbing already exists:

**Working today**
- Auth + onboarding (Sleeper account linking, league selection) via Supabase edge functions
- Tabs: Home (cap card), League, Players, Projections, Trades, Settings; commissioner suite (cap, rosters, trades, buy-ins, rules, season, history)
- Supabase schema: leagues, teams, players, contracts, trades (+assets/votes), draft_picks, cap_adjustments, buy_ins, trade_history, sync_log, views/RPCs (`get_league_cap_detailed`)
- Sleeper sync (read-only, correct): `sync-league`, `sync-rosters`, `sync-players`, `sync-stats`
- Google Sheets read/write via service account: `sheet-sync` edge function with `full-reconciliation` (DB → Sheet, per-team tabs B3:H37)
- Contract engine: dead cap schedules, min salaries by years, estimation/evaluation with ratings

**Gaps found**
- `differential-sync` is a TODO (currently just re-runs full reconciliation)
- `OWNER_MAP` in `sheet-mapping.ts` is hardcoded and **stale** — the sheet's Master Roster lists *Tyler Lofton*, and Tony's tab history references *Vinny*, neither of whom appear in the map. Ownership changes will silently break sheet sync.
- No auction/draft-room functionality, no Supabase Realtime usage yet
- Sheet blocks not yet surfaced in the app: Taxi Squad, Injured Reserve, Cap Credits by year, Cap Hits (dead cap) by year detail, Draft Considerations Owned, Franchise Options, team W/L/cash history
- No sync scheduling — all syncs are manual invocations
- No tests despite CLAUDE.md calling for Jest

## 2. Source-of-Truth Architecture

Supabase is the hub. Sleeper and the Sheet are both synced *through* it, never directly to each other.

```
Sleeper (read-only) ──► Supabase (canonical app DB) ◄──► Google Sheet (read/write)
                              ▲
                              │
                        App (Expo) — reads/writes Supabase only
```

**Season mode switch.** Add `league_phase` (`offseason` | `in_season`) to `leagues.settings`, set by the commissioner (auto-flips at NFL Week 1 via scheduled job, overridable).

| Data | Offseason truth | In-season truth |
|---|---|---|
| Rosters/lineups/waivers | Sheet → Supabase | Sleeper → Supabase |
| Contracts, salaries, cap | Sheet ↔ Supabase | Supabase → Sheet |
| Trades, FA auction results | App (Supabase) → Sheet | App (Supabase) → Sheet |
| Player pool, stats | Sleeper | Sleeper |

**Sync engine work**
1. **Sheet → DB import** (new direction): parse each team tab (players B3:B37, salaries C:H, cap hits R10:W37, plus Taxi/IR/Cap Credits blocks) into contracts + cap_adjustments. Run as `sheet-sync` action `import-from-sheet` with a dry-run diff mode so the commissioner reviews changes before applying.
2. **True differential sync**: compare DB vs Sheet, write only changed cells, log conflicts to `sync_log` instead of blind overwrite. Conflict rule: whichever side is truth for the current phase wins; the other side gets flagged.
3. **Scheduled syncs** (pg_cron or Supabase scheduled functions): Sleeper rosters nightly in-season; sheet reconciliation after every completed trade/auction; players weekly.
4. **Move `OWNER_MAP` to a DB table** (`sheet_tab_map`: team_id, tab_name), editable in the commissioner screen. Fixes the Tyler Lofton/Vinny staleness permanently.

## 3. Displaying the Sheet in the App

Team detail (`app/team/[id].tsx`) becomes the app equivalent of a team's sheet tab, one section per sheet block:

- Roster by position (QB/RB/WR/TE) with contract type badge (RK, etc.) and salaries 2026–2030
- Cap summary: Total Salary, Total Players, Contract Years, Cap Adjustment, **Cap Room** per year (mirrors the sheet's summary block; `get_league_cap_detailed` already computes most of this)
- **Cap Hits** (dead cap by year, incl. trade line items like "Trade 26.02") and **Cap Credits** by year — extend `cap_adjustments` with a `direction` (hit/credit) and per-year amounts (columns already exist)
- **Taxi Squad** and **Injured Reserve** sections — add `roster_slot` (`active` | `taxi` | `ir`) to contracts
- **Draft Considerations Owned** grid (2027–2030 picks by round) — from draft_picks
- **Franchise Options** history and **Draft History**
- Team record/cash block (W/L/T, playoff appearances, titles, net cash) — new `team_seasons` table fed by Sleeper history + buy_ins

Consistency pass (point 6): extract shared `Card`, `SectionHeader`, `StatRow`, `PositionBadge`, `SalaryTable` components into `src/components/` so Home, League, Team, and Draft screens render identically from `theme.ts` tokens.

## 4. FA Auction Draft (the big build)

Live ascending auction; cap room is the budget; winning bid = annual salary; winner picks contract years (1yr/$1, 2yr/$4, 3yr/$8, 4yr/$12, 5yr/$15 minimums enforced).

### Schema (new migration `00009_auction_drafts.sql`)

- `auction_drafts`: league_id, name, status (`setup`|`live`|`paused`|`complete`), is_mock, nomination_timer_secs, bid_timer_secs, bid_reset_secs, min_increment, settings jsonb
- `auction_draft_teams`: draft_id, team_id, nomination_order, budget (defaults to live cap room; commissioner-adjustable = your FAAB control), spent, roster_slots_filled
- `auction_lots`: draft_id, player_id, nominated_by_team_id, opening_bid, status (`pending`|`open`|`going_once`|`sold`|`passed`), current_bid, current_high_team_id, deadline_at (timestamptz), won_contract_id
- `auction_bids`: lot_id, team_id, amount, created_at — full audit trail

### Real-time engine

- **Supabase Realtime** (already in supabase-js): one channel per draft; postgres_changes on lots/bids push state to all clients instantly. Client countdowns render from `deadline_at` (server time), so clocks can't drift or be gamed.
- **All writes go through a `draft-action` edge function** (`nominate`, `bid`, `settle`, `pause`, `resume`, `set-order`, `set-budget`, `undo-last`). It validates atomically: bid > current + increment, bidder's `budget − spent − open_commitments ≥ bid`, roster slot available, then extends `deadline_at` by `bid_reset_secs`.
- **Settlement**: a lightweight `settle` check runs on every action *and* on a 1-second edge-function cron-tick while a draft is live; when `now() > deadline_at`, lot → `sold`, then the winner gets a years-selection prompt (with a default + timeout so the draft never stalls). Contract row is created via the existing contract logic; cap updates flow automatically.
- **Commissioner console**: set/pick nomination order (manual drag or randomize), edit per-team budgets live, pause/resume, adjust timers mid-draft, void/redo a lot.
- **After each sold lot**: enqueue sheet write (player + salary/years into the winner's tab) — reuses `fullReconciliation` machinery; batched every N lots to respect Sheets rate limits.

### Draft room UI (`app/draft/[id].tsx` + `app/draft/index.tsx` lobby)

- Center stage: current player card (photo, pos, age, projected value from `contractEstimation`), live bid, high bidder, animated countdown
- Bid controls: +1 / +5 / custom, disabled when you can't afford it; "max bid" indicator = your cap room minus $1-per-remaining-roster-slot
- Rail: all 12 teams' remaining budget, roster count, nomination order
- Nomination view: searchable player list (FAs only = active players minus contracted), queue for auto-nomination if timer expires
- History drawer: sold lots, prices, audit trail

### Mock draft (solo vs AI)

Same schema with `is_mock = true` (mock rows excluded from cap/contract views and sheet sync; purged after 7 days). Bot logic in the `draft-action` function ticks:

- Each bot gets a value board from `contractEstimation` + positional need weighting
- Bids up to `value × aggressiveness(0.8–1.2 random per bot per player)`, respecting budget and roster slots; human timers can be shortened for practice pace
- Nominates from its need positions when it's a bot's turn

## 5. Phased Roadmap

| Phase | Scope | Est. |
|---|---|---|
| 1 | Owner-map table + fix stale owners; Sheet→DB import w/ dry-run diff; phase switch | small |
| 2 | Team page = sheet tab (taxi/IR/credits/considerations/records); shared components pass | medium |
| 3 | Auction schema + `draft-action` edge function + Realtime draft room + commissioner console | large |
| 4 | Contract-years prompt, sheet write-back of results, undo/void | medium |
| 5 | Mock draft bots + lobby | medium |
| 6 | Scheduled syncs, differential sync, Jest tests for bid/settle/cap logic | medium |

Each phase = its own feature branch → PR → deploy via existing GitHub Actions on merge to main.

## 6. Open Items

1. Confirm current 12 owners so the new `sheet_tab_map` starts correct (Tyler Lofton in? Vinny out? Sheet vs `OWNER_MAP` disagree).
2. Sheets API quota: 60 writes/min/user — batched writes handle a live draft fine, but full-league reconciliation during a draft should be deferred until it ends.
3. Roster max (35 rows per sheet tab) — should the draft enforce a roster-size cap per team?
