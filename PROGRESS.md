# AlgoCompass progress log

<!-- Summary goes at the top when the autonomous run finishes. -->

## Task log

### Task 1: Step C (scaffold, shell, Settings, critique)
- Toolchain: rustc 1.99.0, cargo 1.99.0 (stable-x86_64-pc-windows-msvc), node v25.9.0, npm 11.12.1.
- Scaffold: Tauri 2 + React 18.3 + Vite 8 + TypeScript (strict, `noUncheckedIndexedAccess`) + Tailwind v4 + shadcn (new-york, radix) + Framer Motion + Recharts + @xyflow/react + Zustand + TanStack Query + react-router (hash routing).
- Tauri: frameless 1280x800 window (min 1100x700), tray icon with Open/Quit (left-click shows the window), plugins sql (sqlite), http (scoped to codeforces.com/api and leetcode.com/graphql), notification, autostart, store, opener.
- Shell: custom title bar (drag region, min/max/close-to-tray), animated collapsible sidebar (spring + shared-layout active rail; Ctrl+1–5, Ctrl+, , Ctrl+B), top bar (sync control, streak flame, level badge), ascent bar, ambient nebula, routed empty states for all 7 screens.
- Settings: CF/LC handles via tauri-plugin-store (localStorage fallback in a plain browser), prefilled `enkrid` / `xfO61DFAh6`, validation, discard (Esc).
- Impeccable critique: 24/40 before fixes; all 5 priority issues fixed; detector clean afterwards. Snapshot in `.impeccable/critique/`. DESIGN.md re-synced with the built shell by impeccable's documenter (+ `.impeccable/design.json`).

### Task 2: Data layer
- **Adapters** (`src/adapters/`), the only code that touches platform APIs:
  - `codeforces/`: official API: `user.info`, `user.rating`, `user.status` (paged), `problemset.problems`, `contest.list`. It uses a serialized queue at 1 call per 2s, turns `FAILED` envelopes into typed `AdapterError`s (not-found / rate-limit / api / network / parse), and retries once on "Call limit exceeded".
  - `leetcode/`: unofficial GraphQL: profile + solved by difficulty, `tagProblemCounts`, `userContestRanking` + history, `submissionCalendar`, `recentAcSubmissionList`, `upcomingContests`. It sends `Content-Type`, `Referer` and `Origin`. Every field is read defensively, and failures are `AdapterError("lc", …)`.
  - `http.ts`: tauri-plugin-http inside Tauri, global fetch elsewhere (injectable for tests).
- **Rust**: `tauri-plugin-http` now has the `unsafe-headers` feature (so `Referer`/`Origin` aren't stripped). The capability scope still allows only `https://codeforces.com/api/*` and `https://leetcode.com/graphql`. SQL migrations are registered with `add_migrations` + `preload`.
- **SQLite** (`src-tauri/migrations/0001_init.sql`, shared by Rust and the TS tests): profiles, cf_submissions, cf_problems, cf_rating_history, lc_stats, lc_tag_counts, lc_contest_history, lc_recent_ac, daily_activity, contests, sync_log. `src/data/repo.ts` provides typed reads/writes with batched multi-row upserts.
- **Sync** (`src/data/sync.ts`, `syncStore.ts`): runs on app start, then every 2h, plus manually (top-bar button, Debug page). Behavior:
  - CF and LC sync in parallel and fail independently. Every step is logged to `sync_log`.
  - Incremental CF submissions (page newest-first until a known id), and the problemset is cached for 24h.
  - Changing a handle wipes that platform's history and re-syncs. Saving handles in Settings triggers a sync.
  - Per-platform error toasts (Sonner, styled to DESIGN.md). The top bar shows Syncing… / Synced Xm ago / Sync incomplete.
- **Debug page**: hidden route `/#/debug` (**Ctrl+Shift+D**). It shows step results, row counts per table, raw table dumps and the sync log.
- **Tests**: `npm test` (type-check + Vitest) runs 23 unit tests: adapters with stubbed fetch, sync against a real-schema sql.js DB (first sync, incremental, 24h cache, LC outage isolation, handle change). `npm run test:live` does a full sync against the real APIs and writes `tmp/live-snapshot.json`.

#### Real numbers from the live sync (2026-10-14, 09:21 UTC)
| | |
|---|---|
| CF handle / rating / rank | enkrid · **1008** · newbie (max 1008) |
| CF rated contests | 8 (391 → 651 → 819 → 927 → 953 → 968 → 982 → 1008) |
| CF submissions | 122 total, 76 accepted, **73 unique problems solved** |
| Hardest CF problem solved | rated **1000** (72 solved problems carry a rating) |
| CF solved by tag | implementation 29, math 29, greedy 18, brute force 14, strings 13, constructive 10, number theory 6, sortings 6, dp 3, data structures 2, games 2, geometry 1 |
| CF active days | 39 days with an AC |
| LC solved | **19** (Easy 14 · Medium 3 · Hard 2), global ranking 4,683,476 |
| LC tags | array 14, string 5, math 5, sorting 3, hash-table 3, simulation 2, binary-search 2, + 12 tags with 1 |
| LC contests | none attended (contest ranking is null) |
| LC calendar | 18 active days in the last year; LeetCode's own streak counter says 6 |
| Upcoming | Educational CF Round 195 (Oct 14), CF Round 1128 (Oct 17), LC Weekly 524 (Oct 18), 2 more CF Div. 2 |
| Problemset | 11,450 CF problems cached, 38 distinct CF tags |

## Decisions I made
- **React 18 kept as specified.** create-tauri-app now ships React 19; pinned react/react-dom 18.3. shadcn components are written with `forwardRef` so Radix `asChild` works on React 18.
- **Hash routing** (`createHashRouter`): the bundled app is served from `tauri://`, where history-API deep links can't reload.
- **Close button hides to tray** (Quit lives in the tray menu), matching the daily check-in usage.
- **`ink-faint` retuned #5D6886 → #7A85A3** after the critique measured ~3.3:1 contrast (fails WCAG AA). DESIGN.md updated by the documenter to match.
- **sql.js as the non-Tauri database.** In a plain browser (`npm run dev`) and in tests, the same migration SQL runs on WASM SQLite in memory. This gives one SQL code path, and the tests exercise the real schema. All SQL uses `$1…$n` placeholders, which both drivers accept.
- **Daily activity semantics:** CF = accepted submissions per *local* day. LC = all submissions per *UTC* day (that's what LeetCode's calendar reports; it has no AC-only calendar). Topic scoring uses solves, not this table.
- **Contests table** keeps upcoming/running contests plus finished ones from the last 60 days.
- **CF and LC sync in parallel**, but the CF calls themselves are serialized at 1 per 2s through one shared adapter instance.
- **Unknown LC contest ranking is stored as NULL**, never 0 (you haven't entered an LC contest yet).
- **21st.dev**: its MCP server needs an API key that isn't configured, so component source couldn't be pulled. The sidebar follows the pattern of 21st.dev's animated sidebars (Unlumen "Animated Sidebar", Wensity "Sidebar") rebuilt on our tokens.

## Blocked / needs Sahil
- **Windows SDK missing → Rust can't link, so `npm run tauri dev` / `cargo check` fail.** `C:\Program Files (x86)\Windows Kits\10` only has `Catalogs` and `Redist` (no `Lib`/`Include`). Fix: Visual Studio Installer → Build Tools 2022 → Modify → tick **Desktop development with C++** and **Windows 11 SDK (10.0.26100)** → install → restart the terminal. Until then I verify with `tsc` + `vite build` only.
- Also: run cargo/tauri from **PowerShell or cmd**, not Git Bash. Git Bash's `/usr/bin/link` shadows MSVC's `link.exe` and breaks linking.
- **LeetCode inside Tauri is untested end to end** (blocked by the SDK issue above). The adapter is verified against the live API from Node, and the request shape is the same through tauri-plugin-http with `unsafe-headers`. In `npm run dev` (plain browser) LC sync fails with a CORS error, as expected, and the app degrades correctly: CF data still syncs and an LC error toast appears.
- **21st.dev API key** (optional): set `API_KEY_21ST` in the 21st plugin config if you want components pulled directly from 21st.dev.
