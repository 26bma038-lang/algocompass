# AlgoCompass progress log

## Latest: Recommender + Resources, Phase 6 (2026-10-15)

**Done.** Committed. `npm test` passes (214 tests, 34 new), `npm run build` is green, and `npm run tauri dev` compiles and runs (Rust built in 22s). In your real database, migration 3 is applied (`_sqlx_migrations` v3 "recommender"), 2,157 Codeforces contest dates are stored, and today's mix is saved.

**What it recommends for you right now (real data, CF 1008)**
- **Next Topic: Sorting** (Sharpen on Codeforces). "Sorting appears in 15% of problems at your rating and you haven't practiced it in 51 days."
- **Top 2 to start:** I Will Definitely Make It (2126C, 1100, Jul 2025 round) and Artistic Balance Tree (2222B, 1100).
- **Today's mix:**
  - Codeforces, sharpen your weakest topics: I Will Definitely Make It (Sorting), Subtract Min Sort (Greedy), Pathless (Constructive), all rated 1100.
  - LeetCode, learn Two pointers (the next topic still in Learn mode): Valid Palindrome and Remove Duplicates from Sorted Array.
- **Upsolve:** Chips (800), Social Experiment (800), The 67th Integer Problem (800, 3 tries), Zhily and Mex and Max (1200), Special Permutation (1600).

**What was built**
1. **Resources** (`src/data/resources.json`): every one of the 33 topics has Learn (one article + one video), Practice (CSES section or LeetCode tag list) and Go deeper.
   - Sources: CP-Algorithms, USACO Guide, takeUforward, Errichto, WilliamFiset, NeetCode, Codeforces blogs and others.
   - Topic Detail also adds a personalized Codeforces filter (the topic's tag at your window, e.g. sortings 1000–1200).
   - **Checker:** `npm run check:links` (`scripts/check-links.mjs`) verifies all 122 URLs, and all 294 curated LeetCode problems against LeetCode itself. Plain HTTP can't prove these, so it checks each kind properly:
     - YouTube via oEmbed (a watch page answers 200 even for deleted videos).
     - Codeforces blogs via the official API, and LeetCode lists/problems via GraphQL (both sites answer scripts with a 403 Cloudflare challenge).
     - It replaced 4 dead links: two Errichto lectures with embedding off, and two moved takeUforward pages.
2. **Curated LeetCode lists** (`src/data/lc_lists.json`): 294 problems across 31 topics.
   - **Lists:** the full NeetCode 150 (143; the 7 premium ones are dropped), 90 Striver A2Z / SDE sheet problems, and 61 "AlgoCompass picks" for topics both sheets barely cover (geometry, game theory, number theory, probability, interactive…). Picks are labelled honestly, never passed off as Striver's.
   - **Order:** Easy → Medium → Hard within each topic.
   - **Generated, not hand-typed:** titles, difficulties and tags come from LeetCode's GraphQL. Edit `scripts/lc-lists.txt`, then run `npm run gen:lc-lists`.
   - Constructive and Flows have no LeetCode path; they're learned straight on Codeforces.
3. **Recommender engine** (`src/engine/recommender.ts`, pure, 26 tests):
   - **Next Topic:**
     - priority = band frequency × weakness² × (1 + days since practiced / 60). It only considers unlocked, non-Mastered topics that appear at your rating.
     - It writes a one-sentence why: days stale, "haven't solved one yet", struggle rate, or score.
   - **Learn (LeetCode):** the topic's own path in order, then cross-listed problems.
     - The difficulty level follows strength: all Easy while Weak, alternating Easy/Medium at Developing, then Medium-led.
     - LeetCode Too easy / Too hard moves it one level.
   - **Sharpen (Codeforces):**
     - Window: unsolved, untried problems rated [round(rating), +200], i.e. 1000–1200 for you.
     - Ordering: recent rounds (last 2 years) first, then closeness to the middle (1100), focus (fewer tags), and popularity.
     - Skips gym, unrated and `*special` problems.
   - **Readiness:** a topic switches Learn → Sharpen at `LEARN_SOLVES_TO_SHARPEN = 5` solves.
   - **Upsolve:** tried, never accepted, easiest first.
   - **Mix of the Day:**
     - 3 CF problems, one each from the three weakest Sharpen-mode topics.
     - 2 LC problems for the first topic still in Learn mode.
     - Frozen per local day in SQLite. It regenerates at midnight or with **New mix**, which avoids the previous set.
   - **Feedback:** Skip / Too easy / Too hard hide the problem. Too easy / Too hard also move that topic's window ±100 (CF) or one level (LC), clamped −300…+400. Stored in `rec_feedback`, with Undo in the toast.
4. **UI:**
   - **Home Base:** the Today card's "Work on next" block (topic, why, mode chip, top 2 problems; the topic opens Topic Detail).
   - **Topic Detail:** Recommended problems (current mode first, with feedback) and Resources (3 tiers, open in your browser).
   - **Practice (new, Ctrl+3; Quests/Contests/Achievements moved to Ctrl+4–6):** Today's mix with a 5-segment run meter, then Upsolve and By topic.
5. **Data:**
   - Migration 3 adds `rec_feedback`, `daily_mix` and `cf_contest_times`. The `cf:contests` sync step now also stores every contest's start date.
   - Solved problems drop out after the next sync, because every recommendation query is keyed under "db".

**Fixed along the way**
- **Codeforces problem names could arrive in Russian.** Without `lang`, the API picks a language per request; a browser sync got "Сейчас точно успею" for "I Will Definitely Make It". Every CF call now sends `lang=en`, and a test pins it. Your real database had English names already.
- **Stale recommendations right after a sync:** the recommender read the cached topic report instead of waiting for the fresh one (`ensureQueryData` → `fetchQuery`).
- **A half-synced mix could be frozen for the day:** a new mix is only created when no sync is running.
- **Next Topic ranked Greedy (55, Strong) first** just because it's in 42% of problems. Weakness is now squared, so Sorting (32) leads.

**Impeccable critique** (one lightweight in-context pass, at your request: no sub-agents, so it doesn't count as a full dual-agent run)
- The detector found 0 issues across the 7 files. Screenshots were taken at 1100x700, plus keyboard focus on a mix row (Tab reaches Skip, with a visible ring and tooltip).
- **Fixed:**
  - P0: Russian problem names (above).
  - P1: the next-contest box overflowed the Today card at the minimum window width (the grid column now uses `minmax(0,1fr)`).
  - P3: "By topic" repeated the mix's problems (it now leaves them out).
- **Left as is (P2):** at 1100x700 the rating chart now starts just below the fold on Home Base, because Work on next adds about 130px to the Today card.
- DESIGN.md got a "Practice and recommendation additions" block (additions only).

**Known limits**
- LeetCode only exposes your 20 most recent ACs. LC problems solved before AlgoCompass started tracking can't be detected; Skip them (the tooltip says so).
- Upsolve counts any failed attempt, not only in-contest ones: participant type isn't stored.

**Suggested next step**
Quests/XP: the mix is a natural daily quest ("solve 3 of today's 5"), and the run meter is ready to drive the reward moment.

---

## Previous: Skill Tree, Topic Detail and the packaged-app fixes (2026-10-14, evening)

**Done.** Committed. `npm test` passes (180 tests), `npm run build` is green, and `npm run tauri build` produces `AlgoCompass_0.1.0_x64-setup.exe` (NSIS) and `AlgoCompass_0.1.0_x64_en-US.msi`.

- **LeetCode in the real app: verified.**
  - I ran the built release exe, and it synced LeetCode on its own: profile, tags, calendar, 20 recent ACs and contests, logged at 15:36:29–32 UTC in `sync_log`.
  - The packaged exe has no Vite server, so those calls went through tauri-plugin-http.
  - Your earlier `tauri dev` runs had logged `Couldn't reach LeetCode (undefined)`. Tauri rejects with plain strings, and the adapter read `.message` off them. That's fixed.
- **Offline is calm now.**
  - A DNS/network failure retries with backoff (3 tries: now, +1.5s, +4s).
  - If it still fails, the top bar says **"Offline, will retry"** (cloud icon, no error toast).
  - It retries as soon as Windows reports the connection is back, or after 5 minutes.
  - Real errors (API, HTTP, parse) still say "Sync incomplete" and toast.
- **Skill Tree** (Ctrl+2): all 33 topics on @xyflow/react with a dagre top-to-bottom layout.
  - Each node shows a 10-segment mastery ring with its score and status.
  - Lit edges vs dashed edges, and the hovered or opened topic's whole prerequisite chain lights up.
  - "Work on next" strip with reasons, filters (All / Unlocked / Weak / Blind spots), search by name or platform tag (`/` to focus, Enter opens the best match), zoom/fit, minimap and a key.
  - A one-time unlock animation for anything that rose since your last look, named in a "Since your last look" line.
- **Topic Detail**: a side panel from any node or any topic on Home Base. It shows:
  - Strength and what it needs next, plus the prerequisites it builds on.
  - Codeforces vs LeetCode share of the strength, solved count, hardest CF solve, struggle rate and last practiced.
  - **Upsolve**: CF problems you tried but never got accepted.
  - **Solved** (CF + LC), with links that open in your browser.
  - Placeholders for Recommended problems and Resources.
- **Impeccable critique: 24/40** (two independent reviewers), then a polish pass that fixed every P1 and P2. It also caught a **system-wide bug**: `cn()` was silently dropping our 12/13px type sizes whenever a text color followed them. That's fixed everywhere, including Home Base.

**What the tree says about you right now (real data)**
- **Work on next:**
  - Constructive algorithms 37 (in 21% of problems at your rating).
  - Sorting 32.
  - Number theory 28 (45% of your CF submissions there aren't accepted).
- **Upsolve on Constructive:** Special Permutation (1600) and Zhily and Mex and Max (1200).
- 27 of 33 topics are unlocked. Graph traversal is locked until Recursion & backtracking (7) and Stacks & queues (10) reach 25.

**Suggested next step**
Fill the panel's two placeholders: **recommended problems** (LC to learn the topic, unsolved CF problems from the cached 11k problemset just above your rating to sharpen it) and **resources**. Then Quests/XP.

---

## Summary (autonomous run, 2026-10-14)

**Done: all 4 tasks.** Each one is committed, `npm test` (163 tests) passes, and `npm run build` is green.
1. **Step C:** Tauri 2 shell, Rank Aura tokens, Settings with handles, impeccable critique + fixes.
2. **Data layer:** CF + LC adapters, SQLite (11 tables + `lc_problems`), sync service (on start / every 2h / manual, incremental, fail-soft), hidden Debug page (**Ctrl+Shift+D**).
3. **Topic engine:** 33 topics covering every CF (38) and LC (75) tag, prerequisite DAG, 0–100 strength scores, Where I stand.
4. **Home Base dashboard** on your real data, critiqued by impeccable (26/40) with every priority issue fixed.

**Your real stats right now**
- **Codeforces:** `enkrid` at **1008 (Newbie, 192 to Pupil)** after 8 rated rounds (391 → 1008, last change +26). 73 problems solved, hardest rated 1000.
- **LeetCode:** **19 solved** (14 Easy / 3 Medium / 2 Hard), no contests yet.
- **Streak:** 1 day (longest 13). 47 active days in the last ~7 months.
- **Topics:**
  - Strongest are Math 75, Implementation 73, Strings 69. Nothing is Mastered yet: you need a solve at or above your rating.
  - **Work on next:** Constructive algorithms (37), Sorting (32), Number theory (28).
  - **Blind spots:** Two pointers & sliding window, Graph traversal.
- **Next contest:** Educational CF Round 195, tonight 8:05 pm.
- The whole app now wears **Newbie Slate**, your real rank color. It turns Pupil green when you cross 1200.

**Needs you (blocking)**: *resolved later the same day. The SDK is installed and the app builds; see Latest above.*
- ~~**Install the Windows SDK.**~~ Rust can't link without it, so `npm run tauri dev` doesn't run yet. Open Visual Studio Installer → Build Tools 2022 → Modify → tick **Desktop development with C++** + **Windows 11 SDK**. Then run `npm run tauri dev` from **PowerShell** (not Git Bash). Everything Rust-side (tray, plugins, migrations, `unsafe-headers`) is written but has never been compiled. Expect possibly small compile fixes on the first run.

**Suggested next step**
After the SDK install, run `npm run tauri dev` and confirm three things: the window, the tray, and a full sync including LeetCode through tauri-plugin-http. Then build the **Skill Tree** screen (@xyflow/react on top of `topics.json` + `prerequisites.json` + the engine's statuses) and **Topic Detail**. The engine already gives you everything they need.

---

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

### Task 3: Topic engine
- `src/data/topics.json`: **33 unified topics**. Every one of the **38 Codeforces tags** and **75 LeetCode topic tags** (both lists pulled live from the platforms, saved in `src/engine/fixtures/tag-universe.json`) maps to at least one topic, and tests enforce it tag by tag.
- `src/data/prerequisites.json`: prerequisite DAG (implementation is the root). Tests check that it is acyclic and that every reference is valid.
- `src/engine/strength.ts`: score 0–100 per topic. Inputs:
  - CF unique solves, weighted by problem rating vs your rating (×2 per +300, clamped 0.2–4) with 90-day half-life decay.
  - LC solves weighted Easy 1 / Medium 2.5 / Hard 5 (× 0.5 platform factor).
  - Also tracked: solved count, max CF rating solved, last practiced, struggle rate (non-AC share of judged CF submissions, up to −30%).
  - Status: Mastered / Strong / Developing / Weak / Untouched / Locked.
- `src/engine/standing.ts`: "Where I stand" lists the top 3 strengths, the top 3 weaknesses (ranked by how often the topic appears in CF problems at your rating × how weak it is × struggle) and blind spots (never-solved topics common in your rating band).
- LC per-problem difficulty: added the `lc_problems` table (migration 2) and a sync step that looks up difficulty and tags for your recent ACs in one batched GraphQL query.
- **Tests:** 156 passing (tag mapping, DAG, decay, difficulty weights, LC weighting and dedupe, struggle, every status, mastery gate, band frequency, standing).
- **Debug page** now shows the full topic table and Where I stand.

#### Your real topic results (2026-10-14, CF 1008)
| Score | Status | Topic | Solved (CF / LC) | Max CF | Struggle |
|---|---|---|---|---|---|
| 75 | Strong | Math | 34 (29 / 5) | 1000 | 35% |
| 73 | Strong | Implementation | 31 (29 / 2) | 1000 | 40% |
| 69 | Strong | Strings | 18 (13 / 5) | 900 | 0% |
| 66 | Strong | Arrays & hashing | 15 (0 / 15) | – | – |
| 55 | Strong | Greedy | 19 (18 / 1) | 900 | 25% |
| 50 | Strong | Brute force | 15 (14 / 1) | 900 | 23% |
| 37 | Developing | Constructive algorithms | 10 (10 / 0) | 900 | 38% |
| 36 | Developing | Range data structures | 3 (2 / 1) | – | 33% |
| 34 | Developing | Binary search | 2 (0 / 2) | – | – |
| 32 | Developing | Sorting | 9 (6 / 3) | 900 | 33% |
| 28 | Developing | Number theory | 7 (6 / 1) | 900 | 45% |
| 22 | Weak | Dynamic programming | 4 (3 / 1) | 800 | 0% |
| ≤18 | Weak | Divide & conquer, Geometry, Game theory (67% struggle), Prefix sums, Stacks & queues, Bit manipulation, Recursion, Design, Heaps, Tries | 1–2 each | | |
| 0 | Untouched | Two pointers, Linked lists, Combinatorics, Hashing & string algorithms, Interactive | | | |
| 0 | Locked | Trees, Graph traversal, Shortest paths, Union-find & MST, Probability, Flows & advanced | | | |

**Where you stand**
- **Strengths:** Math (75, 34 solved, up to CF 1000), Implementation (73), Strings (69).
- **Weaknesses:** Constructive algorithms (37, in 21% of problems at your rating), Sorting (32, 15%), Number theory (28, 45% of CF submissions not accepted).
- **Blind spots:** Two pointers & sliding window (6% of problems at your rating), Graph traversal (5%).
- Nothing is Mastered yet. Math and Implementation clear the score bar (≥75 / ≥15 solves), but your hardest solve in them (1000) is just under your rating (1008). One accepted 1100+ math problem flips Math to Mastered.

### Task 4: Home Base dashboard
- **Layout** (Today leads, per DESIGN.md):
  - Left column: Today card (combined streak, practiced-today status, one "Practice X" action from the engine, and tonight's next CF round with a countdown), rating chart, activity heatmap.
  - Right column: Codeforces hero card (the one 56px number, count-up), compact LeetCode card (E/M/H), "Where you stand" (ranked strength bars with visible reasons).
  - Bottom: later contests (CF + LC, countdowns, open in browser).
- **Wired into the shell:** the real CF rank now drives `--accent` app-wide (Earned Light), the top-bar streak flame shows real data, and the ascent bar shows real progress to the next rank.
- **Charts:**
  - CF rating line on CF rank bands, with a dashed next-rank line "Pupil · 192 to go". The LC contest line appears automatically after your first LC contest. Uses Recharts.
  - Heatmap sized to the card's real width.
- **Process:** frontend-design and dataviz guidance first, then the impeccable critique (two independent reviewers): 26/40. All P1–P3 issues and every mechanical finding were fixed, then confirmed in a second capture round. The detector is clean. Snapshot is in `.impeccable/critique/`.
- **DESIGN.md:** appended a "Data-viz additions" block. Nothing earlier was changed.

### Task 5: Packaged-app fixes, Skill Tree, Topic Detail
- **LeetCode transport** (`src/adapters/leetcode/index.ts`, `src/adapters/http.ts`):
  - The endpoint is now decided **per request** by `leetcodeEndpoint()`: always `https://leetcode.com/graphql` through tauri-plugin-http inside Tauri (dev and the .exe), and the Vite proxy only for plain-browser `npm run dev`.
  - `inTauri()` also checks `__TAURI_INTERNALS__`.
  - Fetch failures go through `fetchFailure()`. It handles Tauri's string rejections and classifies capability-scope denials as config errors, not "offline".
  - Tests pin the routing.
- **Retry + offline** (`src/data/sync.ts`, `syncStore.ts`, `TopBar.tsx`):
  - Each sync step retries network errors only (backoff `[1500, 4000]` ms).
  - A platform is `offline` when every failure was a network error. The status is `idle | syncing | ok | partial | offline`.
  - Offline queues a retry on the browser `online` event or after 5 min.
- **Engine:**
  - `strength.ts` now splits `evidence` into `cfEvidence` + `lcEvidence`.
  - New `skillTree.ts`: tree model, edge lighting, filters, tag search + ranking, lineage, status diff.
  - New `topicProblems.ts`: solved / upsolve lists per topic.
  - 17 new tests.
- **UI:**
  - `features/skill-tree/` (`SkillTree.tsx`, `TopicNode.tsx`, `layout.ts`), `components/MasteryRing.tsx`, `features/topic/TopicPanel.tsx` (mounted in the shell).
  - `/topics/:id` deep-links to the tree with the panel open.
  - Problem links come from `adapters/links.ts` and open via tauri-plugin-opener (`lib/openExternal.ts`).
  - The previous statuses for the unlock animation live in tauri-plugin-store (`skillTree.seen`).
- **Process:**
  - frontend-design for direction, then the impeccable critique: dual-agent, **24/40**, snapshot in `.impeccable/critique/`.
  - The polish pass fixed:
    - the tailwind-merge type-size bug;
    - work-on-next strip + labeled badge;
    - toolbar before the canvas in tab order, nodes in visual tab order, pan-on-focus, `aria-expanded`;
    - the "since your last look" announcement and lineage highlighting;
    - the key behind a toggle, the minimap moved off the nodes, and the no-match search state;
    - the panel starts below the top bar, Upsolve comes before Solved, untried topics collapse, and quiet placeholders.
  - Detector clean (0 findings). DESIGN.md got a "Skill Tree and Topic Detail additions" block (additions only).

## Decisions I made
- **Phase 6:**
  - **Readiness counts CF solves too:** Learn → Sharpen at 5 solves on *either* platform. With 6 CF sorting solves you're past learning sorting.
  - **Topics Codeforces doesn't tag** (arrays, stacks, heaps, linked lists, prefix sums, recursion, tries, design) stay in Learn mode and never become Next Topic, since their CF frequency is 0. They still get LeetCode paths and feed the mix's LC slots when nothing else is left.
  - **Mix CF slots prefer Sharpen-mode topics, and LC slots go to the first Learn-mode topic.** That follows the LEARN-on-LC → SHARPEN-on-CF loop, so a topic you haven't learned doesn't get a CF problem yet.
  - **Solved mix items stay in the mix, checked off.** A daily set that empties itself would erase the day's progress. Everywhere else, solved problems disappear.
  - **One feedback offset per topic *and* platform:** CF Too easy moves the CF window, and LC Too easy moves the LC level.
- **Home Base layout follows DESIGN.md** (Today leads, 8-col left) rather than three equal hero cards, because the critique showed equal cards failed the 2-second "am I on track today?" check.
- **Radar replaced by ranked bars** in "Where you stand". The radar repeated the list below it and had no readable scale. A radar fits the Skill Tree / Topic screens better, if you still want one.
- **Count-up numbers animate once per app launch**, not on every visit (DESIGN.md: "animate value changes, not every render").
- **Streak = a day with activity on either platform** (CF accepted or any LC submission). Yesterday's streak stays alive until today ends.
- **Dev-only Vite proxy** (`/__leetcode`) so `npm run dev` in a plain browser gets LeetCode data despite CORS. The Tauri app doesn't use it.
- **21st.dev**: the number ticker and sidebar are hand-built on DESIGN.md tokens (21st API key not configured).
- **React 18 kept as specified.** create-tauri-app now ships React 19; pinned react/react-dom 18.3. shadcn components are written with `forwardRef` so Radix `asChild` works on React 18.
- **Hash routing** (`createHashRouter`): the bundled app is served from `tauri://`, where history-API deep links can't reload.
- **Close button hides to tray** (Quit lives in the tray menu), matching the daily check-in usage.
- **`ink-faint` retuned #5D6886 → #7A85A3** after the critique measured ~3.3:1 contrast (fails WCAG AA). DESIGN.md updated by the documenter to match.
- **sql.js as the non-Tauri database.** In a plain browser (`npm run dev`) and in tests, the same migration SQL runs on WASM SQLite in memory. This gives one SQL code path, and the tests exercise the real schema. All SQL uses `$1…$n` placeholders, which both drivers accept.
- **Daily activity semantics:** CF = accepted submissions per *local* day. LC = all submissions per *UTC* day (that's what LeetCode's calendar reports; it has no AC-only calendar). Topic scoring uses solves, not this table.
- **Contests table** keeps upcoming/running contests plus finished ones from the last 60 days.
- **CF and LC sync in parallel**, but the CF calls themselves are serialized at 1 per 2s through one shared adapter instance.
- **Unknown LC contest ranking is stored as NULL**, never 0 (you haven't entered an LC contest yet).
- **Topic engine tuning** (all constants exported from `src/engine/strength.ts`, easy to tweak):
  - `EVIDENCE_SCALE = 6`: 6 effective solves at your rating ≈ 63/100.
  - Status bands: Weak <25, Developing 25–49, Strong 50–74, Mastered ≥75, plus ≥15 solves and a CF solve at/above your rating.
  - LC solves count at 0.5× a CF solve (LeetCode = learn, Codeforces = sharpen).
  - Unrated CF problems are treated as 100 below your rating. Unrated users use an 800 baseline.
- **LC difficulty for older solves:** LeetCode only exposes your last 20 ACs with dates. Those get exact difficulty, tags and recency. Older solves come from tag counts at the average difficulty of the remaining solves, aged like the oldest known AC. When several LC tags map to one topic, the max count is taken (not the sum), so one problem isn't double counted.
- **"Locked"** = never practiced *and* some prerequisite is below Developing. Any solve unlocks a topic.
- **Weakness ranking** weighs how common the topic is in CF problems at your rating (−100/+400), so weaknesses that matter for the climb come first.
- **21st.dev**: its MCP server needs an API key that isn't configured, so component source couldn't be pulled. The sidebar follows the pattern of 21st.dev's animated sidebars (Unlumen "Animated Sidebar", Wensity "Sidebar") rebuilt on our tokens.

- **Strong nodes glow (faintly), Mastered wear the Aura.** You asked for exactly this. The critique flagged that it can exceed the Three Lights Rule once many topics are Strong, so DESIGN.md now counts the tree canvas as one light with glow encoding status inside it.
- **The "work on next" marker pulses** (2.4s, static under reduced motion), as you asked. It's documented as the tree's one data-tied loop.
- **"Weak" filter = Weak + Developing** (everything practiced but under 50). The tooltip says so. It's the set that needs reps.
- **First view opens at a readable zoom (≥0.75), not fit-all.** Fit-all at 1280x800 is ~0.55, where names are ~7px. The fit button shows everything, and the minimap shows where you are.
- **Each rank is squeezed to 66% of dagre's width** (keeping its crossing-minimized order), so the 12-wide bottom rank fits a desktop window.
- **Topic Detail is a non-modal side panel, not a page.** Clicking another node swaps it in place. `/topics/:id` still works as a deep link.
- **React Flow attribution stays visible** (small, top-left). Hiding it is meant for Pro subscribers.
- **LeetCode "attempted" isn't shown.** LeetCode's public API doesn't expose failed submissions, and the panel says so.

## Blocked / needs Sahil
- *(Resolved)* ~~**Windows SDK missing → Rust can't link, so `npm run tauri dev` / `cargo check` fail.**~~ `C:\Program Files (x86)\Windows Kits\10` only has `Catalogs` and `Redist` (no `Lib`/`Include`). Fix: Visual Studio Installer → Build Tools 2022 → Modify → tick **Desktop development with C++** and **Windows 11 SDK (10.0.26100)** → install → restart the terminal. Until then I verify with `tsc` + `vite build` only.
- Also: run cargo/tauri from **PowerShell or cmd**, not Git Bash. Git Bash's `/usr/bin/link` shadows MSVC's `link.exe` and breaks linking.
- *(Resolved: verified in the release exe, see Latest)* ~~**LeetCode inside Tauri is untested end to end**~~ (blocked by the SDK issue above). The adapter is verified against the live API from Node, and the request shape is the same through tauri-plugin-http with `unsafe-headers`. In `npm run dev` (plain browser) LC sync fails with a CORS error, as expected, and the app degrades correctly: CF data still syncs and an LC error toast appears.
- **21st.dev API key** (optional): set `API_KEY_21ST` in the 21st plugin config if you want components pulled directly from 21st.dev.
