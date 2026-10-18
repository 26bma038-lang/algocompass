# AlgoCompass progress log

## In progress: v1.3, Sheets + Beginner Path + video lessons (branch `v1.3`)

Not merged or released: waiting for your review.

### Part 1: sheet data
- `scripts/gen-sheets.mjs` (`npm run gen:sheets`) builds `src/data/sheets/<id>.json` from each sheet's original source, in the source's order with its sections:

  | Sheet | Source | Problems | Sections | On LeetCode |
  |---|---|---|---|---|
  | Striver's A2Z | takeUforward, `prep-hub/strivers-a2z-dsa-sheet` (the sheet's embedded syllabus data) | 452 rows, 436 distinct | 20 steps | 289 |
  | Striver's SDE Sheet | takeUforward, `prep-hub/strivers-sde-sheet` | 155 rows, 151 distinct | 27 days | 125 |
  | NeetCode 150 | NeetCode's own site data (`neetcode-gh/leetcode/.problemSiteData.json`, which neetcode.io uses) | 150 | 18 | 150 |
  | Blind 75 | The original Blind post (Yangshun Tay, 2018-12-31), read from the post's JSON-LD | 76 rows, 75 distinct | 10 | 76 |
  | Love Babbar 450 | Love Babbar's own spreadsheet (the .xlsx on his Google Drive; the links are read from its cell hyperlinks) | 448 rows, 419 distinct | 15 topics | 21 |
- **Verified:** every LeetCode slug through `question(titleSlug)` (title, difficulty, premium flag and tags come from LeetCode), and every Codeforces id through `problemset.problems`. None of the five sources links a Codeforces problem, so there are no CF ids in the sheets. The CF check runs for the Beginner Path.
- **`npm run check:links`** now verifies the sheets too (`scripts/lib/check-sheets.mjs`). `--deep` also opens every takeUforward practice link (607, all 200). It passes.
- All five sheets are **complete**: nothing failed verification.

**Decisions (Part 1)**
- **takeUforward's current sheets.** The A2Z sheet on takeUforward is now 20 named steps (Beginner Problems, Sorting, Arrays…) rather than the older "Step 1–18" titles. I kept the source's current titles and order and number them as steps in the UI. The old SDE Sheet URL now redirects to "Striver's 180", but the SDE Sheet itself still exists at `prep-hub/strivers-sde-sheet` with its 27 days, so that's the source. Only practice items are included; lesson and article items ("Breaking the myth", theory) and contests aren't problems.
- **Difficulty:** the LeetCode difficulty when there's a LeetCode link. Otherwise it's takeUforward's own level, mapped basic → Easy, core → Medium, pro → Hard. Love Babbar's sheet gives no difficulty, so its non-LeetCode problems have none (shown as "–").
- **Titles:** LeetCode's title when the problem is on LeetCode. The source's wording is kept as `sourceTitle` when it differs (e.g. A2Z's "Reverse a number" is LeetCode's "Reverse Integer").
- **Renamed LeetCode slugs** in the sources are mapped to the current slug and verified: `add-and-search-word-data-structure-design` (Blind 75) and `implement-strstr` (A2Z, SDE: "KMP Algorithm or LPS array" → LeetCode 28).
- **Blind 75** has one entry with no link ("Longest Common Subsequence"). It's matched to LeetCode's problem of exactly that title. "Merge K Sorted Lists" is listed twice in the original (Linked List and Heap), so there are 76 rows and 75 distinct problems. Its "Combination Sum" links Combination Sum IV, and the link is kept as the source has it.
- **One problem, every sheet:** each problem gets a canonical `key`. Problems that share any identifier (LeetCode slug, CF id, GFG slug, takeUforward slug) are merged across all sheets into one key, preferring lc > cf > gfg > tuf. Progress counts distinct keys, so a problem listed twice in one sheet counts once.
- **No other app's data.** Nothing comes from Codolio or any other tracker. Only the creators' own sources are used.
- **Love Babbar 450** is mostly GeeksforGeeks (370 distinct) plus 21 LeetCode links. Those GFG problems can't tick automatically: manual and bulk ticks cover them. I didn't add LeetCode equivalents the sheet doesn't link, because that would be guessing.

### Part 2: sheet progress and ticking
- **Migration `0006_sheets.sql`** (new, nothing applied was edited) adds four tables:
  - `sheet_ticks`: hand ticks per problem key: done (manual or bulk) or undone;
  - `sheet_notes`;
  - `video_watched`;
  - `path_steps`: Beginner Path steps, recorded once when done.
- **`src/engine/sheets.ts`** (pure) holds the tick resolution, progress over distinct problems, bulk section ranges and smart next. `src/data/sheets.ts` builds the solve index from the cache and has the hooks and mutations.
- **How a problem's tick is decided:**
  1. If you unticked it, it's not done, unless LeetCode or Codeforces shows a solve newer than the untick.
  2. If a sync has seen it solved, it's done (auto). LeetCode is matched by slug and Codeforces by `contestId-index`, from every accepted submission ever cached.
  3. If you ticked it by hand, it's done (manual or bulk).
  4. If you used Mark solved anywhere in the app, it's done (manual).
- **Cross-sheet:** status is per key, so one solve ticks every sheet that lists the problem.
- **Reusing Mark solved:** a single manual tick on a LeetCode (or Codeforces) problem is also written to `manual_solves`, so it counts for quests, goals, XP and recommendations, exactly like Mark solved. Unticking removes it again.
- **Bulk imports** ("I've finished Steps 1–5") only write `sheet_ticks`. They don't count as today's solves, quests or XP, but the recommender does treat those LeetCode problems as solved. Undo in the toast restores any ticks the import replaced.
- **Tests:** `src/engine/sheets.test.ts` and `src/data/sheets.test.ts` (27, 28 with Part 3's premium rule). They cover cross-sheet auto-ticks, manual ticks, bulk ticks with undo, unticking an auto tick, distinct-problem progress, smart next, notes and data validation.

### Part 3: Sheets UI and smart next
- **Practice now has tabs**, each its own route like Progress's:
  - Today's mix (`/practice`, also at `/practice/mix`);
  - Sheets (`/practice/sheets`);
  - one sheet at `/practice/sheets/:id`.
  The tab row is a shared `SegmentedTabs` component, which Progress uses too. Still four screens.
- **Design (frontend-design):** it stays inside DESIGN.md's tokens. The one new visual element is the **section strip**: one chamfered segment per step, day or topic, each filling with the accent as that section gets done. It echoes the run meter and the level plate. The section holding "Next in this sheet" stands taller, so position says "you are here" without colour. On a sheet page each segment is a button that opens and scrolls to its section. I rejected a grid of identical sheet cards (the SaaS-kit default) for one lead card plus a dense list.
- **Sheets tab:**
  - The sheet you follow leads: name, "Sheet by …" credit linking the original, %, strip, Next in this sheet, Following.
  - Then "All sheets" as rows: name, credit, strip, %, done/total and Follow.
  - The LeetCode 20-solve limit is explained under the list.
- **A sheet page:**
  - **Header card:** credit and fetch month, % with the split ("6 synced, 1 by hand, 90 imported"), the clickable strip, the honest LeetCode-limit line, Follow, and **Mark sections done**. That last one is an inline panel: "I've finished [Step 1] through [Step 5]", with a live count of what it will tick.
  - **Next in this sheet:** a sunken tile with the problem, its step, the weak topic that picked it (if any), "Open on LeetCode", and "Solve on LeetCode to tick automatically."
  - **Toolbar:** search over titles, the source's wording and your notes; All / Unsolved / Solved; Easy / Medium / Hard; Expand / Collapse all.
  - **Sections:** collapsible cards with a numbered tile, "4/30" and a bar (or "Done" with a check). Sub-sections (A2Z's "FAQs (Medium)") appear as quiet headings.
  - **Rows:** a one-click tick box, the title (plus "Premium"), a second line with the tick's source ("Solved on LeetCode" / "Ticked by hand" / "Imported") or where it opens, the source's own wording, a note preview, the topic chip, difficulty, the note button and Open.
  - **Notes** open inline under the row and save when you leave the box (Ctrl+Enter or Esc saves and closes). They're private to SQLite.
- **Open** prefers LeetCode, then Codeforces, then takeUforward, GFG or Code360. Its tooltip says "Solve on LeetCode to tick automatically" or "Opens takeUforward. Tick it here once you've solved it."
- **Smart next** (`nextInSheet`) looks at the next 8 unsolved problems in sheet order. Each scores 1 → 0 by position, plus 0.6 × the weakness of its weakest topic from the topic engine (Weak 1, Developing 0.6, Not tried 0.3, Strong 0.1, Mastered 0). LeetCode Premium problems drop by 1, so a free one nearby always wins, but premium is still offered when it's all that's left. With no topic data it's plain order.
- **Today:** a full-width card under the quests and mix row, shown only when you follow a sheet: "A2Z 22%", the strip, "Next: <problem>" with its step, and Open.
- **Daily quest from the sheet:** following a sheet adds "Solve 1 problem from A2Z" (+20 XP) to today's quests. Any LeetCode or Codeforces solve of a problem in that sheet counts, as does a hand tick on a sheet-only problem (GFG, takeUforward). The quest is reconciled whenever quests load, so following or unfollowing midday adds or drops today's open sheet quest, and a completed one stays earned. Hand ticks of sheet-only problems also count toward "Solve any 2 problems today". Bulk imports never count.
- **Tour:** `TOUR_VERSION` 2, with a new Sheets step after Practice. It outlines the Practice item and opens the Sheets tab. Everyone sees the five-step tour once more.
- **Ctrl+K** has new Sheets and Beginner Path entries ("striver", "neetcode", "babbar"… match). Practice's subtitle mentions sheets.
- **Checked in the browser**, Dark and Light at 1100x700, with real synced data:
  - 6 A2Z problems auto-ticked from real solves;
  - a hand tick completed the sheet quest and unlocked an achievement;
  - a bulk import of Steps 1–3 ticked 90 and offered Undo, and today's quests didn't move;
  - smart next jumped to a prefix-sums problem in Step 4.
  It also caught a bug: newer Chromium returns a Promise from `scrollIntoView`, so an arrow-body effect returned it and React crashed on cleanup. Fixed.

**Decisions (Part 3)**
- **Sheets is a Practice tab**, not a fifth screen, as asked. Beginner mode adds a Beginner Path tab first (Part 4), and `/practice` sends beginners there.
- **Source quirks are kept.** takeUforward links some different items to the same LeetCode problem (Step 4's "Longest subarray with sum K" and "Largest subarray with sum 0" both link LeetCode 325). They share that key, so one tick covers both rows. Section counts say "4 problems" for 5 rows.

## Latest: v1.2.0, simplify (2026-10-17)

**Released as v1.2.0:** `simplify` was merged into master, and the version was bumped in package.json, tauri.conf.json and Cargo.toml. `npm test` passes (294) and `npm run tauri build` produced:
- `src-tauri	argeteleaseundle
sisAlgoCompass_1.2.0_x64-setup.exe` (4.20 MiB)
- `src-tauri	argeteleaseundlemsiAlgoCompass_1.2.0_x64_en-US.msi` (5.58 MiB)

**Topics map fixes before release** (`f6fd72d`):
- The minimap moved to the bottom-right and is hidden below 1280px wide, where it covered nodes such as Brute force.
- The React Flow attribution is hidden (`proOptions.hideAttribution`).
- **The black ⊗ on Sorting was the "Work on next" marker** (Sorting is one of the three Work on next topics). It was a tiny crosshair in a black circle and read as "cancel" in Light. It is now an accent-coloured target, labelled "Work on next", matching the tiles and the legend.
- Tile reasons wrap to two lines. The tiles are 80px high, and the canvas height calc now subtracts 170px.
- The React Flow `colorMode` follows the theme.

**README:** describes the four screens and Light/Dark, with fresh 1280x800 shots (today, practice, progress, topics-map, achievements, topic, contests, palette, settings, tour, welcome, theme-light, theme-dark). The old home, quests, skill-tree and Ember/Ocean shots are removed.

### Simplify branch log (merged above)

**Why:** the first outside user (a friend) said the app was too complex and hard to navigate, and asked for white and black themes. This branch is waiting for your review: nothing is merged, tagged or released, and the version is still 1.1.0.

`npm test` passes (294, including 7 new), `npm run build` is green, `cargo check` is clean, and `npm run tauri dev` compiles and launches the app.

**Part 1: seven screens become four** (`5c8b651`, plus `0260d26` removing stray build files)
- **Today** (Ctrl+1, `/`) was Home Base. The top row is now Today's quests + streak beside a compact **Today's mix**, so "what do I do today?" is answered above the fold at 1100x700. Below that: the rating hero with the next round, Work on next and LeetCode, then activity and standing, then later contests.
- **Practice** (Ctrl+2) is unchanged: today's mix with feedback and New mix, Upsolve, and By topic (the topic recommendations).
- **Progress** (Ctrl+3) has three tabs, each with its own route:
  - **Overview** (`/progress`): rating chart, Level, This week (goals) and the Weekly review.
  - **Topics map** (`/progress/topics`): the Skill Tree, at full height.
  - **Achievements** (`/progress/achievements`).
- **Contests** (Ctrl+4): same content, except the rating chart, which moved to Progress (see decisions).
- **Redirects:** `/skill-tree` → `/progress/topics`, `/achievements` → `/progress/achievements`, `/quests` → `/`. `/topics/:id` deep links open the panel on the Topics map. The unlock toast's "View" goes to `/progress/achievements`.
- **Sidebar:** labels show by default, and everyone gets them once through a persisted-state migration (Ctrl+B still collapses). Hovering an item shows its one-line description and shortcut.
- **Subtitle:** every screen has one under its title, from the same descriptions in `nav.ts`. The top bar grew from 48px to 64px to fit it.
- **Renamed everywhere else:**
  - The Ctrl+K palette shows the new names, plus "Topics map" and "Achievements" entries. Old names still match ("skill tree", "quests", "home"…).
  - The `?` sheet, onboarding ("Open Today"), the achievement hint, the Settings goals copy, and the top-bar chips: quests and streak → Today, level → Progress.
- **Tray:** new links to Today, Practice, Progress and Contests. They open the window on that screen through a `tray-navigate` event.
- **Tip tour** (`TipTour.tsx`): four steps, one per screen. Each step outlines that screen's sidebar item and navigates to it. It is non-modal, and ×, Skip or Esc ends it.
  - It runs once, both after onboarding and for existing users on their first launch of this version (pref `tipTourSeen` < `TOUR_VERSION`).
- **The game layer is untouched:** XP, levels, achievements, ceremonies, glow, ambient background and the Aura Shift are the same components. Only where they live changed.

**Part 2: Light, Dark, System** (`ba290ee`)
- Neon Arcade, Ember and Ocean are replaced by **System** (the default, follows Windows live through `prefers-color-scheme`), **Light** and **Dark**.
- **Dark:** near-black `#0A0A0C` with white ink.
- **Light:** off-white `#F6F6F7` and white cards, with near-black ink.
- **Accent:** one restrained indigo, `#8B9BFF` in Dark and `#3A4BD0` in Light.
- **Light re-tunes everything else for white:**
  - rank colours, darker so the rank chip and rating stay readable;
  - success, warning, danger and the platform dots;
  - shadows, softer;
  - accent glow, lower;
  - the ambient nebula (`--ambient-*`), a faint wash with no vignette;
  - the Topics map's dots, edges and minimap mask (`--tree-*`);
  - toasts, which follow the resolved scheme.
- **Contrast:** `scripts/check-contrast.mjs` checks every text, accent, state, platform and rank token against ground, raised, sunken and glass in both themes. All are ≥ 4.5:1 (WCAG AA).
- **Migration:**
  - A saved `neon-arcade` / `ember` / `ocean` (in the settings store or the localStorage mirror) becomes `system` and is written back.
  - Nothing else in settings or the database is touched.
- **Settings:** the picker has three swatches. System shows a half-light, half-dark swatch.
- **Window colour:** the native window's background colour is now `#0A0A0C`.

**Part 3: check** (`impeccable` critique, one in-context pass)
- **Screenshots:** 21 in `docs/screenshots/simplify/`. They cover all 4 screens (Progress with each tab) and Settings in Dark and Light at 1100x700, plus the welcome screen, the four tour steps, the palette and the shortcut sheet. They were captured in browser mode and switched live through the System theme, which exercises the follow-Windows path.
- **Fixed (P1):** in Light, earned achievement tiles were sunken grey and read as *disabled*, while locked ones looked brighter. Earned tiles are now raised white with a slab shadow in Light.
- **Fixed (P2):** Today's quests "1/3 done" pill wrapped under the title in the 5-column card. It now has an inline header.
- **Checked, fine:**
  - The Topics map canvas, edges and minimap in both themes.
  - The rating chart's bands and lines on white.
  - The heatmap, the switches, the Contests countdown and the Settings form.
  - No console errors in the run.
  - All three legacy redirects land on the right tab.
- **Left as is (P2):**
  - The tour card sits next to the sidebar item and can cover the screen subtitle while it's open. It's transient and moves with each step.
  - The React Flow attribution still shows on the map, as before.

**Decisions** (made without asking, as requested)
- **The rating chart lives only in Progress → Overview** and is no longer at the bottom of Contests. The brief puts it in Progress, and showing it twice works against simplifying. Contests keeps every round and result. Today keeps the sparkline.
- **`/quests` redirects to Today, not Progress.** Daily quests are what most people meant by Quests. The weekly goals and review are one click away in Progress.
- **There is no separate "Topic recommendations" card in Practice.** Practice's "By topic" already is that list, and Today has "Work on next". Adding another card would have added complexity.
- **Today's quests is still the compact card** (streak + quest rows). The full quest rows with their problems duplicated Today's mix, which now sits beside them.
- **The tour ships as version 1**, with no dimming overlay, so it never blocks the app (the Gamification "never block input" rule).
- **The tray links emit an event** rather than giving Rust its own route table, so routes stay in `nav.ts`.
- **One accent hue, indigo**, because it is calm on both grounds and distinct from every platform and state colour. `--accent-2` is a lighter or darker tint of it, so the old two-tone accent didn't need code changes.
- **The custom title bar** already used tokens, so it themes without code changes. The native window background (seen for a frame before the web view paints) is dark in both themes.
- **Running `npm run tauri dev` opened your real install's data folder.** If you had a v1.1 theme saved, it has been migrated to System, and the tip tour will show on next launch until dismissed. That migration is the intended behaviour.

**To preview:** `git checkout simplify`, then `npm run tauri dev` (from PowerShell). To see the tour again, delete `tipTourSeen` from the settings store, or bump `TOUR_VERSION`.

---

## Previous: v1.1.0, the redesign everywhere (Phase 11, 2026-10-15)

**Shipped as v1.1.0** (tag `v1.1.0`, release https://github.com/26bma038-lang/algocompass/releases/tag/v1.1.0). `npm test` passes (287), `npm run build` is green, and `npm run tauri build` produced the 1.1.0 installers (Rust release build 5m 35s):
- `src-tauri\target\release\bundle\nsis\AlgoCompass_1.1.0_x64-setup.exe` (4.20 MiB)
- `src-tauri\target\release\bundle\msi\AlgoCompass_1.1.0_x64_en-US.msi` (5.57 MiB)

**What changed**
1. **The redesign is merged** (`32a6c24`): three themes, rank colour only on rank elements, and the Home Base bento. The `redesign` worktree and branch are removed.
2. **Bento on every screen** (`0afc348`): 12-column grid, 24px gaps, glass cards with 24px padding, and one shared `CardHeader` (`src/components/CardHeader.tsx`) with a 22px Chakra Petch title, a description, a count pill and actions.
   - **Skill Tree:** the three Work on next topics are tiles with their reasons, and the canvas is the hero card with filters and search in its header. It keeps its full height (the space above it is still 154px).
   - **Topic Detail:** a hero tile (ring, status, builds on, the Codeforces/LeetCode split), stat tiles, then Upsolve / Solved / Recommended / Resources as cards with count pills.
   - **Practice:** Today's mix leads, then Upsolve beside By topic.
   - **Quests:** Today's quests beside Level, then This week beside the Weekly review.
   - **Contests:** the next round leads (countdown in the theme accent), upcoming rounds sit beside past contests, and the **full rating chart** is now here. It loads Recharts only on this screen.
   - **Achievements:** the level hero, then a card per category with a "2 of 7" pill and the achievements as tiles.
   - **Home Base / Settings / Welcome:** the remaining card titles use the same 22px style. Later contests is now a proper card with sunken tiles.
3. **README:**
   - Every screenshot re-taken in Neon Arcade at 1280x800.
   - A new Themes section with Ember and Ocean shots.
   - The Home Base, Skill Tree, Contests and Settings descriptions are updated.
   - The installer name is version-agnostic.
4. **Docs:**
   - DESIGN.md gets "Bento across the app".
   - CLAUDE.md and PRODUCT.md now describe the colour roles: the theme owns the accent, and the rank colour marks rank elements.

**Impeccable critique** (one in-context pass, no sub-agents): 30 screenshots, all 8 screens in Neon Arcade, Ember and Ocean at 1100x700, plus 6 screens at 1920x1080.
- **Fixed (P1):** on Practice and Quests, card-header actions (pill, New mix) wrapped under long descriptions. The title block now flexes, so they stay right.
- **Fixed (P2):** the activity heatmap's first two month labels collided ("JanFeb") when the window started late in a month. The first column is now labelled only when it starts in the first half of its month.
- **Checked:** the themes read well on every screen, with no contrast problems; the Skill Tree canvas keeps its height; the Topic Detail panel fits 440px; the past-contests table no longer collides.
- **Left as is (P2):**
  - On very wide windows, Home Base's equal-height rows leave space at the bottom of the shorter card. Equal rows are the bento rule.
  - Settings stays one readable form column below 1536px.

**Decisions**
- **All top-level card titles use one size** (22px Chakra Petch), except EmptyState (16px per DESIGN.md) and the small "Codeforces" label inside the Home hero.
- **The full rating chart moved to Contests** rather than being deleted with Home Base's old layout. Rating changes happen there, and Home Base keeps the sparkline.
- **`docs/redesign/` is removed**, superseded by `docs/screenshots/theme-*.png` and the re-taken README shots.
- **No stale commit hashes to fix (correction).** In v1.0 I said PROGRESS.md quoted pre-rewrite commit hashes. It doesn't. I checked all 22 pre-rewrite hashes against the whole repo (PROGRESS.md, README, every doc) and project memory: none appear. The release history below lists the current hashes, so there's an accurate reference.

**Release history (current hashes, after the email rewrite)**

| Version / phase | Commits |
|---|---|
| Scaffold, data layer, topic engine | `2e8ad84`, `61da780`, `745854b` |
| Home Base, polish | `f14b472`, `5651c47` |
| Skill Tree + Topic Detail | `cbc5997` |
| Recommender + Practice | `b3362a4` |
| Quests, Contests, reminders, weekly review (Phase 7) | `ca55c31`, `9dc9c45`, `cb10213`, `577bf70`, `e8f4bb5` |
| XP, achievements (Phase 8) | `b649686`, `b1f9258`, `cfc682b` |
| v1.0 polish, palette, bundle split, release prep (Phase 9) | `d295ad9`, `b273969`, `c09c84c`, `93c5077`, `21a969c` |
| **v1.0.0** onboarding, README, public release (Phase 10) | `d5bf33a`, `3bcc6ed`, `006ca16`, `180e0c2` (tag `v1.0.0`) |
| **v1.1.0** redesign + bento everywhere (Phase 11) | `3b00c70`, `32a6c24`, `0afc348`, then the release commits (tag `v1.1.0`) |

---

## Previous: public release, Phase 10 (2026-10-15)

**Part 1: First-run onboarding.**
- **No default handles any more.** A new install opens on a welcome screen (title bar only, no sidebar or top bar):
  - Codeforces handle is required; LeetCode username is optional.
  - Both are checked against the platforms first, with plain "No Codeforces user "x"" / "No LeetCode user "x"" errors. Offline and other failures get their own messages.
  - The handles are saved with the platform's own spelling.
  - The first sync runs right there, with a live step list (profile, rating, submissions, problemset…), then "Open Home Base".
- **Your install keeps everything:**
  - Your installed app had never saved its handles; it ran on the old built-in defaults (I checked `settings.json`).
  - On launch, when nothing is saved but the database holds synced profiles, the app now adopts those handles and saves them, so you never see onboarding.
  - **Bug caught on the way:** startup sync read handles directly. With empty defaults, it would have treated "enkrid" → "" as a handle change and wiped your Codeforces history. Sync now resolves handles the same way (adopting from the database) and doesn't run at all without a Codeforces handle. As a second guard, an empty handle is never treated as a change. Both are covered by tests.
- **LeetCode is optional everywhere:**
  - Sync skips it cleanly with an empty username.
  - Settings accepts an empty username and clears the cached LeetCode data when you remove it.
  - Home Base's LeetCode card says "Not tracked" with a link to Settings, instead of "Not synced yet".
- **Smaller changes:**
  - The welcome screen's first sync isn't immediately repeated on entering the app.
  - `npm run test:live` reads `CF_HANDLE` / `LC_HANDLE` from the environment.
  - Your handles no longer read as config in CLAUDE.md, PRODUCT.md or the design-system sample (`.impeccable/design.json`). PROGRESS.md history, test fixtures and README screenshots keep them, as you allowed.
- **Tests:** 10 new in `src/data/onboarding.test.ts`: defaults, resolve/adopt, handle checks, LeetCode skip, no wipe. Also driven end to end in a fresh browser profile: bad handles show both errors, then a real handle syncs and lands on Home Base.

**Part 2: README, license, package.json.**
- **README.md rewritten for the public:**
  - Pitch, hero screenshot and download link.
  - Why I built it, and a feature section per screen with screenshots (Home Base, Skill Tree, Topic Detail, Practice, Quests, Contests, Achievements, Settings, Ctrl+K palette, welcome screen).
  - How it works: adapters → SQLite → topic engine → recommender → screens, strength scoring (difficulty weighting, 90-day half-life, struggle penalty), and the unofficial LeetCode GraphQL endpoint.
  - Download with the SmartScreen note, build from source, tests, tech stack, project structure, roadmap (the Future ideas list), privacy, license.
- **License, changed on the user's new instruction:** no open-source license file; MIT was dropped. The README's License section reads "© 2026 Sahil. All rights reserved…", and `package.json` has `"license": "UNLICENSED"`, plus `repository`, `homepage` and `description`.
- **Palette fix:** typing "sort" listed Keyboard shortcuts above Sorting, because cmdk keeps groups in order. While searching, the palette is now one flat ranked list. The palette and welcome screenshots were re-taken.

**Step 0 (before the parallel run): email hidden.**
- Author and committer email on all 22 commits was rewritten to `322038294+26bma038-lang@users.noreply.github.com` (GitHub user ID 322038294), with names and dates kept, using `git filter-branch --env-filter … --tag-name-filter cat`. The backup refs were deleted and the reflog expired.
- `git log --all` shows only the noreply address, with zero matches for the university email.
- This repo's `user.email` is set to the noreply address.

**Parts 3–6: build, tag, push, GitHub release.**
- They run right after this commit: `npm run tauri build`, `git tag -f v1.0.0` on the final commit, push `master` and `v1.0.0` to `origin`, then `gh release create` with the .exe and .msi, and the repo description and topics. The outcome is in the session report.
- The `redesign` branch (a separate worktree) is never pushed.
- **Remote:** the GitHub repo already existed, was empty, and is **private**. Changing visibility wasn't part of the instructions, so it stays private. Until it's public, only you can see the repo, the README and the release download links. To publish: `gh repo edit 26bma038-lang/algocompass --visibility public --accept-visibility-change-consequences`.

## Previous: v1.0.0 release, Phase 9 (2026-10-15)

**AlgoCompass 1.0.0 is built and tagged.** Each part is committed. `npm test` passes (277 tests), `npm run build` is green, and `npm run tauri build` produced the installers:
- `src-tauri/target/release/bundle/nsis/AlgoCompass_1.0.0_x64-setup.exe` (4.19 MiB, NSIS installer, recommended)
- `src-tauri/target/release/bundle/msi/AlgoCompass_1.0.0_x64_en-US.msi` (5.57 MiB)
- The Rust release build took 3m 40s.

**What v1.0 is:** all eight screens (Home Base, Skill Tree, Topic Detail, Practice, Quests, Contests, Achievements, Settings), on your real Codeforces and LeetCode data. It has:
- topic strength and a recommender
- daily quests, XP and levels (you're level 14, Pattern Hunter, with 12 of 31 achievements)
- contest reminders and a streak nudge from the tray
- launch on startup
- a command palette

**Part 1: Full design audit** (in-context pass; 16 screenshots of all 8 screens at 1100x700 and 1920x1080, plus keyboard and reduced-motion runs)
- **Fixed the known P2 (Home Base fold):** at 1100x700, the rating, Work on next, today's quests and the next Codeforces round now sit above the fold, with the top of the rating chart in view. The Today card is one streak line over Work on next and today's quests side by side. The next round moved under the rating, since that's where the rating moves.
- **P1, Contests at 1920:** the past-contests columns collided ("1 of 710,002") and "1 solved" wrapped. Fixed with column padding and no-wrap.
- **P1, reduced motion:** tooltips stayed stuck open while tabbing. The global rule shortened animations to 1ms, and Radix waits for exit animations to end. Reduced motion now means `animation: none`.
- **P2, Settings at 1920:** a 640px column in a 1,856px window. It's two columns from 1536px now.
- **P2, kbd keys** fell back to the browser's monospace (DESIGN.md forbids monospace labels). They use Geist now.
- **Checked and fine:**
  - The tab order runs nav, then top bar, then content, with a visible focus ring on every stop.
  - The nebula is static under reduced motion, and the ceremonies snap.
  - Glow stays within three lights.
  - Every screen has a loading line and an honest empty state.
- **Left as is (P3):** at 1920 the 1440px content column leaves a wide margin on the right. That's DESIGN.md's max width, by design.

**Part 2: Command palette and shortcuts**
- **Ctrl+K** (or the new search button in the top bar) opens a palette built on cmdk and styled as DESIGN.md's Float plane:
  - Actions: Sync now, Open today's mix, Open next contest, Keyboard shortcuts, Toggle sidebar.
  - All 7 screens, and all 33 topics (selecting one opens Topic Detail). You can search topics by name or by any CF/LC tag.
  - It's fully usable from the keyboard (arrows, Enter, Esc); I tested it end to end with Playwright.
- **Ranking** (`src/lib/paletteScore.ts`, 4 tests): cmdk's built-in fuzzy ranking put "Open today's mix" above Dynamic programming for "dp", because keywords matched loosely. The custom ranking prefers name prefix, then word start, exact tag, initials, tag prefix and substring; a loose match on the name comes last.
- **Ctrl+R** syncs instead of reloading the webview. **?** opens a cheat sheet with every shortcut.
- **Decision:** CLAUDE.md asks to check 21st.dev before hand-building a command palette. I used shadcn/ui's Command (cmdk) instead, since shadcn is already our component library, and saved the usage.

**Part 3: Performance**

| | Before | After |
|---|---|---|
| Main JS chunk | 1,472 kB (441 kB gzip) | 472 kB (151 kB gzip) |
| JS loaded at startup | 1,439 kB | 812 kB |
| App shell visible | 1,334 ms | 1,168 ms (−12%) |
| Home Base content visible | 1,427 ms | 1,294 ms (−9%) |
| sql.js + WASM in the desktop bundle | 700 kB | none |

- **How it was measured:** Playwright against `vite preview` of each build, CPU throttled 4x, median of 5 cold loads. The desktop app loads from disk, so its absolute times are lower; the relative change carries over.
- **Route splitting:** every screen except Home Base is `React.lazy`. The Skill Tree chunk (235 kB) carries @xyflow/react and dagre, and Home Base lazy-loads Recharts (352 kB) right after first paint.
- **INEFFECTIVE_DYNAMIC_IMPORT:** both warnings are gone. `catalog.ts` and `quests.ts` are now imported statically everywhere. recommendations ↔ quests is a circular import, which is safe because neither touches the other at module load.
- **sql.js:** `vite.config.ts` exposes `TAURI_ENV_*`, so in `tauri build` the database driver folds to tauri-plugin-sql and sql.js is never bundled. I confirmed the real `tauri build` output has no `sql-wasm` files. Plain `npm run dev` keeps it for browser work.

**Part 4: Release prep**
- **App icon:** Canva generated the concept: a diagonal compass needle with a ring hub and two skill-tree nodes branching off it, azure on navy. Canva only returns a 200x200 JPG with opaque black corners, which isn't usable as a Windows icon. So I redrew the concept as a vector (`src-tauri/icons/source/algocompass-icon.svg`) and rendered it to a 1024x1024 PNG with transparent corners. It's checked at 16/24/32/64px on light and dark taskbars. `npm run tauri icon` generated every size. I deleted the Android and iOS sets it also wrote, since there are no mobile targets.
- **Bundle identifier: left as `com.algocompass.app`, on purpose.** The warning is about macOS `.app` bundles, and this is a Windows-only app. A new identifier would:
  - move your data folder (`%APPDATA%\com.algocompass.app`: the SQLite database, settings, reminder state) and the WebView2 data,
  - change the installer's registry identity, risking two installed copies side by side,
  - need the data copied before tauri-plugin-sql preloads the database at startup, which happens before the app's own setup code runs.
  
  That's not a simple, risk-free migration, so per your rule I left it. Your data stays where it is.
- **Version 1.0.0** in package.json, tauri.conf.json and Cargo.toml.
- **README.md:** what it is, 7 screenshots (`docs/screenshots/`, 1280x800, your real data), install steps, building from source, tech stack, privacy.

**Blocked / needs Sahil**
- **The installer is unsigned.** Windows SmartScreen will warn on first run (More info → Run anyway). Signing needs a code-signing certificate.
- **Please try it once by hand:** install the NSIS build and check that notifications now show AlgoCompass's name and icon instead of PowerShell's. Also turn on "Launch on Windows startup" and sign out and back in. I can't drive the real Windows desktop from here.

**Future ideas**
- **AI coach:** a weekly plan in plain words from your topic report, contest results and misses. It would explain *why* you got WA on a problem, using your submission history.
- **Revision queue:** spaced repetition for solved problems you struggled with (many tries, or solved late), resurfacing them at 3, 7 and 21 days.
- **Friends comparison:** add a few CF handles and compare ratings, topic strengths and weekly solves side by side. A small, friendly leaderboard.
- **Problem notes:** a note per problem (key idea, mistake made), searchable from the palette, shown again when the problem comes back in Upsolve or the revision queue.
- **Rating predictor:** an expected rating change from your live standing during a round, and a "solve these to reach Pupil" projection from your strength trend.
- **Mobile companion:** a read-only phone view of the streak, today's quests and the next round, with the same reminders. Tauri 2's mobile targets could reuse the engine.

---

## Previous: Achievements, levels and progression, Phase 8 (2026-10-15)

**Done: all three parts.** Each part is committed. `npm test` passes (273 tests: 24 new, replacing 2 old level tests), `npm run build` is green, and `npm run tauri dev` compiles and runs. In your real database, migration 5 is applied, and your first run recorded your level and 12 achievements quietly as the baseline.

**You right now: Level 14, "Pattern Hunter"**
- 1,642 XP in total, 128 of 191 XP to level 15 ("Greedy Adept").
- 12 of 31 achievements unlocked:

| Earned | Achievement |
|---|---|
| 24 Apr 2026 | Five Alive (5 problems in one day) |
| 30 Apr 2026 | Into the Arena (first Codeforces round) |
| 30 Apr 2026 | Big Climb (+50 in one round: your first round, +391) |
| 1 May 2026 | Punching Up (solved above your rating) |
| 2 May 2026 | Kindling (3-day streak) |
| 3 May 2026 | Weekend Warrior |
| 6 May 2026 | Week of Fire (7-day streak) |
| 21 May 2026 | The Comeback (solved after 2+ weeks away) |
| 10 Jul 2026 | Hard Mode (first LeetCode Hard) |
| 19 Jul 2026 | Medium Rare (first LeetCode Medium) |
| before tracking | Specialty (a Strong topic) |
| before tracking | Branching Out (10 topics unlocked) |

- **Closest next unlocks:**
  - Arena Regular: 9 of 10 rounds. The WorldQuant round on Saturday does it.
  - Century: 73 of 100 Codeforces solves.
  - Pupil: 1008 of 1200.
  - No Blind Spots: two left (Two pointers, Graph traversal).

**What was built**
1. **XP and levels** (`src/engine/xp.ts`, pure, 14 tests):
   - **Codeforces solve:** 10 XP at your rating at the time, ×2 per +300 above it, ×½ per −300 below it, from 2 to 40 XP.
   - **LeetCode solve:** Easy 5, Medium 12, Hard 25. The solves LeetCode hides (all but your 20 latest) count once, as one undated lump from its totals.
   - **Contests:** 40 XP per Codeforces round, 25 per LeetCode contest.
   - **Upsolve:** +10. It counts when a problem is accepted on a later day than a failed try, or comes from the contest upsolve list.
   - **Quests:** unchanged (30 / 20 / 15), so a quest is worth about two more solves.
   - **Active day:** 5 XP, +1 per day the streak has run (capped at +10).
   - **Curve:** you reach level L at 25 × (L−1)^1.6 XP. Level 10 takes 840 XP, about three weeks of steady practice; level 20 takes 2,780 and level 30 takes 5,450.
   - **Titles:** a new one every five levels. Novice Coder (1), Loop Apprentice (5), Pattern Hunter (10), Greedy Adept (15), Algorithm Smith (20), Graph Ranger (25), DP Alchemist (30), Segment Sage (35), Proof Knight (40), Code Archmage (50), Legend of the Judge (60).
   - **Recomputed from your full history** on every sync, so the first run put you at level 14, not level 1.
   - **Top bar:** the level badge's XP line fills toward the next level. Hovering it shows your title, XP to go, and today's XP by source.
2. **Achievements** (`src/engine/achievements.ts`, 31 rules in 5 categories, 10 tests; Achievements screen):
   - **Consistency:** first quest, 3/7/30/100-day streaks, 100 active days, 4 perfect quest weeks.
   - **Codeforces:** first round, 10 and 25 rounds, first solve above your rating, +50 in one round, first upsolve, 100 solved, and reaching Pupil, Specialist and Expert.
   - **LeetCode:** first Medium, first Hard, 50 and 100 solved, first contest.
   - **Topics:** first Strong topic, first Mastered topic, 10 topics unlocked, all blind spots tried.
   - **Fun:** night owl (midnight to 4 am), early bird (5 to 7 am), 5 problems in a day, weekend warrior, comeback after 2+ weeks.
   - **Dates:** every rule dates its unlock from history when it can. When it can't (state-based topic rules, LeetCode solves LeetCode hides), the card says "Earned before tracking".
   - **Never re-lock:** unlocks are recorded once (`achievements` table, migration 5), so a topic that decays below Strong stays earned.
   - **Locked cards** are silhouettes with the hint and real progress ("Best streak 13/30", "Contests 9/10", "Best rating 1,008/1,200").
3. **Moments** (`src/features/achievements/Ceremonies.tsx`):
   - **Level-up:** a plate drops under the level badge with the number and a title wipe (done by 0.9s), and the badge flashes once.
   - **Aura Shift on promotion:** `--accent` is now a registered CSS color, so a promotion crossfades the whole app from gray to Pupil green in 1.2s, with a "Promoted · Pupil" plate.
   - **Never in the way:** both moments let clicks through, skip on any click or Esc, and snap under reduced motion.
   - **Achievement unlock:** a toast with the badge. Unlocks found while the app is in the tray also send a Windows notification, and so do level-ups and promotions.
   - **Preview:** the hidden Debug page (Ctrl+Shift+D) has "Ceremony previews": the Aura Shift (Newbie → Pupil) and a level-up. The preview puts your real Newbie gray back afterwards, which I checked.

**Decisions (made without asking)**
- **The first run is silent.** Your past is a baseline: level 14 and the 12 achievements were recorded without toasts or a level-up moment. From now on, only new progress is announced.
- **More than 3 unlocks at once become one summary toast** ("12 achievements unlocked … View"), e.g. if the cache is rebuilt.
- **Level and rank only move up for announcements.** A rating drop isn't a ceremony; the highest rank seen is remembered, so dropping back to Newbie and climbing again doesn't replay the Aura Shift.
- **"Big Climb" counts your first round (+391).** That's what Codeforces recorded, though new accounts start from 0. I kept it rather than special-casing the first six rounds.
- **"Perfect quest week" is strict:** all quests on all 7 days, Monday to Sunday.
- **Achievements use the chamfered plate shape,** which DESIGN.md reserves for level and rank; I'm treating achievements as part of that family. Logged in DESIGN.md's new "Progression additions" block.

**Impeccable critique** (one lightweight in-context pass, no sub-agents; Achievements and the top bar at 1100x700, including the tooltip, both moments and the toast)
- **Fixed:**
  - P1: at Newbie the accent is gray, so earned and locked cards differed mostly by border. Earned cards now carry a Success check plus "Earned <date>".
  - P1: the toast badge overflowed Sonner's 16px icon slot.
  - P2: a burst of unlocks would stack a dozen toasts (now one summary).
- **Left as is (P3):** the level-up plate sits over the top-right of the content for 2.6s. It lets clicks through and skips on any click.

**Blocked / needs Sahil**
- Nothing is blocked. The Windows notification for an unlock while in the tray shows PowerShell's name in dev mode, as in Phase 7.

**Suggested next step**
Polish week: a full impeccable audit across all eight screens. Then a packaged build (`npm run tauri build`), so notifications carry AlgoCompass's own name and autostart can be tested end to end.

---

## Previous: Quests, Contests and Notifications, Phase 7 (2026-10-15)

**Done: all four parts.** Each part is committed separately. `npm test` passes (251 tests, 37 new), `npm run build` is green, `cargo check` is clean, and `npm run tauri dev` compiles (Rust in 37s) and runs. In your real database, migration 4 is applied, today's 3 quests are stored, and 9 past Codeforces rounds have been looked up.

**What you'll see**
- **Today's quests (0/3 right now):**
  - Solve 1 Sorting problem rated 1100+ on Codeforces (+30 XP)
  - Solve 1 Two pointers & sliding window problem on LeetCode (+20 XP)
  - Solve any 2 problems today (+15 XP)
- **Top bar:** sync, then the quest pill "0/3", then the streak flame, then the level badge (lit once you earn XP).
- **Contests:** WorldQuant Round 1 (CF Round 1128, Div. 1 + 2) leads, Sat 17 Oct 20:05. Past contests list all 9 of your rounds with solves, rank and rating change (e.g. Round 1125 (Div. 3): 3 of 8, +26 → 1008).
- **Weekly review:** this week, 0 CF / 0 LC so far (3 CF last week). Suggested focus: sharpen sorting on Codeforces.

**What was built**
1. **Quests** (`src/engine/quests.ts`, `src/data/quests.ts`, Quests screen):
   - Three daily quests from the Mix of the Day, frozen per day in SQLite (`daily_quests`). "New mix" rewrites the open ones; completed ones stay earned.
   - They complete when a sync sees the accepted submission (or you mark a LeetCode problem solved). The watcher records it once, sends the "Quest complete" notification, and queues the reward moment: one Aura pulse on the card, the bar filling and the XP ticker. It waits until the window is visible.
   - **XP and levels:** 100 XP to level 2, then +50 per level. The level badge lights up with your first quest.
   - **Weekly goals** (Settings: CF/week 10, LC/week 5, contests/week 1 by default) as progress rings on Quests.
   - **Mark solved** on LeetCode rows (Practice, Topic Detail, Home Base, quest cards). It's stored in `manual_solves` and counts as solved for recommendations, quests, goals and Topic Detail's Solved list. It isn't added to strength scores, because LeetCode's tag totals already count every real solve. Undo is in the toast.
2. **Contests** (`src/engine/contests.ts`, Contests screen):
   - Upcoming rounds show a countdown, local start time, duration, division chip, Register (CF's registration page, opened in your browser) and an "I'll attend" switch (`contest_attend`).
   - **Past contests:** a new `cf:results` sync step looks up each finished round you took part in, once (`contest_results`). A round counts if it's rated, marked "I'll attend", or has one of your submissions inside its contest window. LeetCode contests come from LeetCode's history.
   - **Auto-upsolve:** for rounds that ended in the last 7 days, the problems you didn't solve among the first (solved + 2) by index go to Upsolve (`upsolve_queue`). Solving A and B queues C and D. Practice shows them as "Unsolved in <round>".
3. **Notifications and desktop:**
   - `src/engine/notifications.ts` builds the reminder list. Rust (`src-tauri/src/lib.rs`) fires it from a 15-second scheduler thread, so reminders arrive while the window is hidden. Fired keys persist in `reminders.json`, so nothing fires twice across restarts.
   - **Contest reminders:** 1 hour and 10 minutes before rounds you'll attend. Each is valid for 10 minutes only, so a "1 hour" reminder is never sent 30 minutes before.
   - **Streak at risk:** at your set time (default 20:00), only while a streak is running and nothing is solved today. The app syncs 15 minutes before, so it won't nag you about a problem you already solved.
   - **Quest complete:** sent from the app when the watcher records a quest.
   - **Settings:** a toggle per notification type, the evening time, and "Launch on Windows startup".
   - **Tray:** Open AlgoCompass, Sync now, "Quests 0/3" (also in the tooltip), Quit.
   - **Autostart** registers `--minimized`. The window is now created hidden and shown in setup unless that flag is present, so a login launch never flashes.
4. **Weekly review** (Quests, right column; open by default on Sundays, "Show" on other days):
   - Solves per platform against last week, rating change, current streak and active days.
   - Topics whose strength rose since Monday, recomputed by running the engine on only what happened before Monday.
   - Goals hit or missed, and one line on next week's focus (the recommender's Next Topic).

**Decisions (made without asking, per your instructions)**
- **Three quests a day, not one per mix problem.** "2/3" stays glanceable. The CF quest takes the mix's first sharpen topic at its mix problem's rating; any solve in that topic at or above the rating counts, and so does the mix problem itself.
- **XP values:** CF quest 30, LC quest 20, consistency 15. This answers PRODUCT.md's open "XP economy" question; retune in `QUEST_XP`.
- **A completed quest stays completed** even if its manual mark is undone. The reward already played, and un-earning XP would feel worse than the edge case.
- **Weeks run Monday to Sunday.** A problem counts in the week of its first accepted solve. LeetCode manual marks count on the day you mark them.
- **Upsolve is limited to recent rounds (7 days) and to "solved + 2" problems,** so the first sync didn't flood Upsolve with 2400-rated F's from rounds months ago.
- **Reminders fire from Rust, not JavaScript.** Tauri's `backgroundThrottling` setting is unsupported on Windows (WebView2), so a hidden webview's timers can't be trusted. As a second line of defence, the webview also gets Chromium's `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows` (with wry's default `--disable-features` kept), so syncs and quest checks keep running in the tray.
- **context7 wasn't available** in this session (only its sign-in tools were exposed), so I used the official Tauri v2 docs plus the installed crate sources (tauri 2.12.3, autostart 2.7.0, notification 2.6.0, store 2.5.0).

**Fixed along the way**
- **Codeforces now blocks `contest.standings` with any parameters** ("available only via anonymous GET requests with no extra parameters"), and the plain call returns 8 MB per round. The lookup now uses `contest.status?contestId&handle`: your submissions, each with its participant type (live and out-of-competition count; practice and virtual don't). The problem list comes from the problemset cache, refreshed once if a new round isn't in it yet (it waits up to a day). Rank comes from your rating history.
- **Paired Div. 2 rounds** list only their own problems in the problemset (the shared ones sit under the Div. 1 id), which showed "1 of 2". A list under 4 problems is now treated as partial and shown as "1 solved". Older rounds get their name from `contest.list`. A one-time repair fixed the 9 rows already in your database.
- **Quests could be cached as "none" for the whole day:** a sync invalidates queries before it clears its `syncing` flag. The quest query now has `syncing` in its key, like the mix. (This hit your real app; it's fixed and today's quests are there now.)
- **A "1 hour" reminder could fire 30 minutes before a round.** Caught by the new scheduling tests; every lead now has a 10-minute window.

**Impeccable critique** (one lightweight in-context pass, no sub-agents)
- Screenshots of Quests, Contests, Settings and Home Base at 1100x700, including scrolled views. The design hook found 0 deterministic issues in the new files.
- **Fixed:**
  - P1: "Mark solved" was hidden behind hover on quest cards. LeetCode quest rows now show it, Skip and Open.
  - P1: a past round showed as "contest 2248" (now "Round 1113 (Div. 2)").
  - P1: wrong "of 2" totals (above).
- **Left as is (P2):**
  - The Today card on Home Base is taller with the quest tile, so the rating chart sits lower at 1100x700.
  - Goal rings at 0 are bare tracks. That's honest, but quiet on a Monday.
- DESIGN.md got a "Quests, contests and settings additions" block (additions only).

**Blocked / needs Sahil**
- **Windows notifications in dev show PowerShell's name and icon.** This is a Windows limitation for unpackaged apps. Install the built app (`npm run tauri build`, then the NSIS installer) to see AlgoCompass's own name. Not blocking.
- **Please check by hand once:**
  - Turn on "Launch on Windows startup", sign out and back in, and check the app starts in the tray with no window.
  - Mark a contest "I'll attend" and leave the app in the tray to see the 1-hour reminder.
  - I couldn't drive the real desktop (tray clicks, toasts) from here. The logic is unit-tested, and the Rust side compiles and starts.

**Known limits**
- LeetCode contests have no per-problem data in the API, so they don't feed Upsolve.
- On paired Div. 2 rounds, auto-upsolve only sees the round's own problems (usually A and B), not the shared harder ones.
- The weekly review's "topics that improved" is an estimate: LeetCode solves outside your 20 most recent can't be dated.

**Suggested next step**
Achievements (the last placeholder screen). The level, quest history and contest results are all stored now, so a catalogue (first rated round, 7-day streak, first Hard, rank promotions) can unlock from real data, with the restrained ceremony DESIGN.md already describes.

---

## Previous: Recommender + Resources, Phase 6 (2026-10-15)

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

---

## Redesign (branch `redesign`, 2026-10-15; worktree `C:\dsa tracker-redesign`)

Not merged. Preview it and merge it yourself if you like it (steps at the end of this section).

**What changed**
- **Colour roles:** the CF rank colour moved to its own token (`--rank`). It now colours only the rating number, the rank chip and rank progress (ascent bar and hero bar). The theme owns all other chrome. Newbie gray no longer paints the whole app.
- **Three themes**, contrast-checked with a WCAG script:

| Theme | faint ink / glass | accent / ground | accent-2 / ground | text on accent |
|---|---|---|---|---|
| Neon Arcade (default) | 5.63 | 6.11 | 12.93 | 6.11 |
| Ember | 5.55 | 8.73 | 12.54 | 8.78 |
| Ocean | 5.91 | 10.07 | 7.14 | 10.18 |

- **Theme picker** in Settings: live swatches, keyboard radiogroup, saved in the settings store plus a localStorage mirror, applied before first render.
- **Home Base bento:** rating hero with sparkline and next round, then Work on next and Today (streak + quests) as the two big cards, then activity + LeetCode, then contests + where you stand. The full Recharts rating chart is gone from Home Base; the hero sparkline replaces it, so Home Base no longer loads Recharts at all.
- **DESIGN.md:** appended "Themes and colour roles (redesign)". It states that it supersedes the Earned Light Rule for chrome.

**Decisions**
- The sparkline uses `--accent-2`, not the CF periwinkle: the redesign's point is vibrancy, and the series is the only line in the hero.
- The streak flame keeps its ember colours in every theme. In Ember it sits close to the accent, which reads as on-theme.
- `@property --accent` was replaced by `@property --rank`, so the Aura Shift still crossfades (only rank elements now).

**Checks:** `npm test` 287 passed; `npm run build` green. Screenshots in `docs/redesign/`: `home-neon-arcade.png`, `home-ember.png`, `home-ocean.png` and `settings-theme-picker.png` (1100x700).

**Preview and merge**
- Browser preview: `cd "C:\dsa tracker-redesign"; npm run dev`, then open http://localhost:1420.
- Desktop preview: from PowerShell, `cd "C:\dsa tracker-redesign"; npm run tauri dev`.
- Merge: `cd "C:\dsa tracker"; git checkout master; git merge redesign`. If `PROGRESS.md` conflicts, keep both sections.
- When done: `git worktree remove "../dsa tracker-redesign"`.
