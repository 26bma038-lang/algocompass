# AlgoCompass progress log

## v1.8, easier to find your way (branch `v1.8`, not released)

The owner said "the home page and every page is difficult to navigate". v1.7 added seven features to Progress and Contests, so screens lost their one job. v1.8 doesn't add features; it gives each screen one job and one primary action again.

### Part 0: critique and plan (2026-11-09)

- **`docs/audit-v1.8/CRITIQUE.md`:** every screen in both modes at 1100x700 (browser mode; smart = a real sync of the owner's public profiles, beginner = Debug → Preview a fresh beginner), Nielsen scores (25/40), 11 problems ranked by how much they hurt navigation, and the information architecture for v1.8 (what lives where, one primary action per screen, what's folded or moved). Evidence in `docs/audit-v1.8/critique/`.
- **Degraded run, said so in the file:** the impeccable critique wants two isolated sub-agents; this task asked for no background agents, so it ran in one context, the review first, then the detector (1 finding, a false positive: the React Flow attribution's intended 10px).
- **Decisions:** keep the five sidebar screens, every route and redirect. Notes move to Practice (they're about problems); Friends stays a Progress tab but only once there's a handle or a friend; Contests gets three tabs, each a route; Learn's two browsers become one card with one toolbar. Playlists get a curated short `name` (the YouTube title stays the verified field).

### Part 1: Progress, five cards and fewer tabs (2026-11-09)

- **Smart Overview: 8 cards → 5** (2,148px → 1,402px at 1100 wide). Left column: **Rating** with the goal under the chart (`RatingGoalSection`: one line, "Goal: 1900 by Jan 31, 2027 · +889 to go · 12 weeks left · Unlikely at your best pace", the plan behind **Show the plan**, Change, Remove; no goal: "Set a goal"), **This week** with **Share my week** in its header and the **Weekly review** folded under the meters (opens on its own on Sundays, as before), **Activity**. Right column: **Level and badges** (one card; the three badge tiles under the level), **LeetCode**.
- **Where you stand moved to Topics**, above the list it sums up (no "See all topics" link there; the list is right below).
- **Tabs: Overview · Topics · Friends.** *Your notes* moved to **Practice → Your notes** (`/practice/notes`; `/progress/notes` redirects; `src/features/practice/Notes.tsx`). **Friends** shows in smart mode always, and in Beginner mode once a handle is entered (`friendsTabShown`); `/progress/friends` always works. Decision: a beginner who added a friend without any handle of their own loses the tab but keeps the route; that combination is rare, and the table would show "–" for them anyway.
- **The tab row is tabs plus one button** (Continue today's practice). Share my week moved into This week (smart) and Your week (beginner, on the title row).
- **Beginner Practice:** a small **Your notes** card beside Follow a popular sheet, only once a note exists (`NotesLinkCard`).
- **Empty states:** Overview before the first update has **Update now** (and says "Adding up your history…" while an update runs, instead of "starts after the first update"); Your notes has a button to today's problems (or the lesson problems).
- Words: `LABELS.thisWeek`, `weeklyReview`, `levelAndBadges`, `shareWeek`, `whereYouStand` (plus the Contests and Learn words used later in v1.8).
- **Tests:** `progress/tabs.test.ts` (three tabs, Friends rule), `practice/tabs.test.ts` (Your notes tab), `router.test.ts` (notes under Practice, the redirect).
- **Screenshots:** `docs/audit-v1.8/1-progress/before|after/` (smart Overview, Topics, notes, Friends; beginner Overview, Topics, Practice, notes; Light and Dark, with `-full` captures of the whole scroll).

## v1.7, the app updates itself (released as v1.7.0 on 2026-11-09)

Released. Auto-updates, a revision queue, notes, "Stuck?", a daily reminder, contest review, virtual contests, a rating goal, friends, more playlists and a share card. **The first version that can update itself;** 1.6.0 and older need one manual install.

### Part 1: auto-updater (2026-11-09)

- **Plugins:** `tauri-plugin-updater` and `tauri-plugin-process` (Rust + JS), registered in `lib.rs`; capabilities `updater:default` and `process:allow-restart`. Docs checked with context7 (`/tauri-apps/tauri-docs`). The check runs inside the updater plugin's own HTTP client, so the CSP and the `http` plugin's URL scope are unchanged.
- **Signing key:** `%USERPROFILE%\.tauri\algocompass.key` (password-protected since Part 6; `.gitignore` already ignores `*.key`), public half `algocompass.key.pub`, whose content is the `pubkey` in `tauri.conf.json`. **Back the key up: lose it and no installed copy can ever accept an update.** `createUpdaterArtifacts: true`, endpoint `https://github.com/26bma038-lang/algocompass/releases/latest/download/latest.json`, Windows `installMode: passive` (a small progress window, no prompts).
- **In the app** (`src/lib/updater.ts`): a quiet check 20 s after launch and every 6 h while the app runs, but only when the last check is over a day old (`updateCheckDue`, saved as pref `updateCheckedAt`). Offline or no new version: silence. A found update downloads in the background, then `UpdateBanner` (under the title bar) says "AlgoCompass X is ready. Restart to update". Settings → **App updates** shows the version and **Check for updates** (says "You have the latest version" or why it couldn't check). Nothing happens in a plain browser or a Debug preview profile.
- **`scripts/release.mjs`** (PowerShell): builds with the key in `TAURI_SIGNING_PRIVATE_KEY`, writes `release-out/latest.json` (version, notes, `windows-x86_64` signature and the release's setup.exe URL) and copies the setup.exe and .msi next to it; `--publish notes.md` then runs `gh release create vX.Y.Z` with all three files. `release-out/` is git-ignored. **The first release with the updater (v1.7.0) is the first that can update itself;** v1.6.0 and older installs need one manual install.
- `package-lock.json` version now follows `package.json` (it said 1.2.0).

### Part 2: revision queue (2026-11-09)

- **Rule:** a solved problem comes back 7 days and again 30 days after the solve; 3 days instead of 7 if you said you needed help. A review you call **Still hard** comes back in 3 days and counts as "needed help". Both reviews done = finished. A first review that happens after the 30-day mark finishes it (`afterReview`, `src/engine/revision.ts`, pure).
- **Migration `0007_revision.sql`** (LF): `revisions(problem_key, needed_help, stage, next_at, updated_at)`. Rows exist only for flagged or reviewed problems; the solve time always comes from your real solves (synced Codeforces and LeetCode, manual marks), never copied.
- **Only solves from the day the queue first ran count** (pref `revisionSince`, set on first read). Decision: queuing an old history would put hundreds of "due" problems on day one. So nothing is due in the first 3 to 7 days after updating; that's expected.
- **Where:** Practice → Today's problems gets a **Due for review** card first (up to 5, most overdue first; Open, **I solved it again**, **Still hard**); while one is due the mix's "Recommended next" tag steps aside so there's one primary button. Today's **Do this next** shows the most overdue review before anything else (`pickDoThisNext(mix, sheetNext, due)`). Every row's ⋯ menu has **I solved it, but needed help** (a LeetCode row also marks it solved; Codeforces ticks itself at the next update).
- **Tests:** `revision.test.ts` (schedule, help, since, caps, review outcomes), `revisions.test.ts` (migration, records, manual solves in sql.js), `today.test.ts`.

### Parts 3 and 4: notes and "Stuck?" (2026-11-09, one commit: they share every row)

- **Notes reuse `sheet_notes`** (keyed by the canonical problem key, so a note on Two Sum is the same note from a sheet, Practice, a lesson or Practice this). **Migration `0008_note_titles.sql`** adds a `title` column so "Your notes" can list a note for a problem that's in no sheet; older notes look their title up in the sheets (`noteEntries`, `src/engine/notes.ts`).
- **Where:** every problem row's ⋯ menu has **Add a note** and **Stuck?** (`ProblemToolItems`, `src/components/practice/ProblemTools.tsx`). Rows with no ⋯ of their own (lesson problems, Practice this, Codeforces rows) got a Stuck? icon and a ⋯ with the two items (`RowTools`); sheet rows keep their inline note box and gained the Stuck? icon; recommendation rows get a visible **Stuck?** button, and a solved row a note button, so "why I got WA" can be written after the solve. Both open from `useUiStore.openTool` into panels mounted once in the shell and loaded lazily (`ProblemPanels`, Radix Dialog like the shortcut sheet).
- **Your notes:** Progress's third tab (`/progress/notes`): newest first, search over title and text (every word, any order), Edit opens the same panel. Empty state says how to add one.
- **Stuck? is four steps, one per click, nothing generated** (`src/engine/stuck.ts`): (1) the problem's topics, from its real tags or its sheet section; (2) a verified video for the lead topic from the library, your language and unwatched first, opening the Watch page; (3) an easier unsolved problem on the topic from the five sheets and the path (closest below this one, home topic first, never Premium; an honest "none" for the easiest problems); (4) the platform's own pages: LeetCode `/editorial/` and `/solutions/`, Codeforces the round's page (the tutorial is linked there when the authors wrote one; we don't guess its blog id). Nothing is invented: a step with nothing real says so. Each step scrolls into view.
- **Tests:** `stuck.test.ts`, `notes.test.ts`, the notes title round trip in `sheets.test.ts`, Progress tabs and the route.
- **Screenshots:** `docs/audit-v1.7/stuck-notes/` (Stuck? with all four steps, the note panel, Your notes; Light and Dark, 1100x700, browser mode, a fresh beginner).

### Part 5: daily reminder (2026-11-09)

- Settings → Notifications → **Daily reminder** (toggle and "Remind me at", default **off**, 18:00 once on: a new notification shouldn't start by itself). It rides the existing scheduler: `buildSchedule` gets `daily` text and Rust fires it while the window sits in the tray, once a day (`daily:<date>`), up to 3 h late if the app was closed at the set time, never past midnight.
- **Text** = Today's "Do this next" (`pickDoThisNext`): a due review ("Time to review: <title> on LeetCode. Solved 8 days ago…"), else today's first unsolved problem, else the followed sheet's next ("Today's next problem: <title> on <site>."). **Nothing** is sent when all of today's goals are done, when there is nothing to name, or before the data it reads has loaded (`useDailyReminderText`, `src/data/desktopBridge.ts`). The schedule is re-pushed every 10 minutes and on any change, so solving the problem changes or withdraws it before it fires. A Debug preview profile never reaches the OS (existing rule).
- Beginner mode: there is no problem mix, so it only names a due review or the followed sheet's next; no lesson text yet.
- **Tests:** `notifications.test.ts` (set time, review wording, off / done / not-ready, grace, midnight, fires once).

### Part 6: signing key with a password (2026-11-09)

- The first key had no password. v1.7.0 isn't released, so no installed copy trusts it yet: regenerated with `tauri signer generate -w %USERPROFILE%\.tauri\algocompass.key -p <random 32 chars>`, new `pubkey` in `tauri.conf.json`. The old pair was renamed to `algocompass.key.old-unprotected` / `.pub.old` (not deleted; safe to delete).
- **The password** was written once to `%USERPROFILE%\.tauri\algocompass-password.txt`, for the owner to move somewhere safe. It's in no repo file.
- `scripts/release.mjs` passes `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to the build, or asks for it with a hidden prompt when unset (and stops without a terminal). Also fixed: the copy of the setup.exe and .msi into `release-out/` split paths on `/` only, so on Windows it never copied them; it uses `basename` now.
- **Verified (Part 6):** a signed build with the password wrote `release-out/latest.json`, the setup.exe, the .msi and both `.sig` files; the signature's key id (8EF1FEFD17869EE2) matches the new public key.

### Part 7: contest review (2026-11-09)

- **Contests → Contest review**, under the next round: one card per Codeforces round you took part in (the saved `contest_results`, nothing new fetched), newest first, two shown then "Show all N rounds". Each card: the round, date and rank; the rating change and old → new rating (your rating history; "Unrated" otherwise); every problem by index as a tile (solved in the round with a check, solved since with a hollow check, not solved dashed; name, rating and state in the tooltip and the label); **Topics of the ones you didn't solve** from the problems' real tags in the problemset cache (count per topic, linking to Learn filtered to that topic; "Codeforces hasn't tagged these problems yet" when none); **Fix next**: the unsolved problems among the first (solved + 2) by index, the same rule as Problems you tried, minus any you've solved since, each with Open, Stuck? and the note.
- **Fix next joins the revision queue:** sync flags those problems "needed help" when it saves a round (`repo.flagNeededHelp`, keeps any review progress), and opening one from the card does too (covers rounds saved before v1.7). So once solved, it returns after 3 days. An unsolved one never shows as due.
- Pure part: `buildContestReviews` (`src/engine/contestReview.ts`, tests); data: `src/data/contestReview.ts`. No migration.
- **Screenshots:** `docs/audit-v1.7/contest-review/` (browser mode, a real Codeforces sync).

### Part 8: virtual contest (2026-11-09)

- **Contests → Virtual contest:** pick a past Codeforces round by division (Div. 2, which includes Educational rounds; Div. 3; Div. 4; combined Div. 1 + 2 rounds are left out), newest first, five shown then "Show more". Only rounds you've never touched: no submission of yours in the round, not one you took part in, never done as a virtual. Only rounds whose whole problem list is in the problemset cache (at least 4 problems; a paired Div. 2's shared problems sit under the Div. 1 id, so such a half is skipped rather than shown short). **Start** asks once ("Starts a 2h clock now", **Start the clock**).
- **While it runs** the card moves to the top of Contests: the round, a countdown for its **real duration** (contest.list), a thin elapsed bar, every problem with **Open** (the Codeforces problem page; you submit there), and "Solved at 0:14" once a solve is found. **I'm done** (asks once) ends it early.
- **Solve detection** is your own Codeforces submissions inside the window `[start, start + duration)` (or the early end), never a guess. While it runs the app pulls your latest 50 submissions through the adapter every 2 minutes, on **Check for solves**, when the clock runs out and before an early end (`checkVirtualSolves`, `src/data/virtual.ts`); the regular update catches anything later, and since submissions keep their real time, a late update still counts them. Fails soft: offline it says it couldn't reach Codeforces and tries again.
- **Review at the end:** solved of total and the time used, then per problem **Solved at** (from the start), **Took** (since the solve before it), and **Wrong tries** (rejected submissions before the solve; compilation errors don't count, as on Codeforces), Open, Stuck? and the note for unsolved ones, and **Topics you missed** from the unsolved problems' real tags. **No standings and no rank**: we'd have to invent them. Older virtuals stay listed (up to 4) with a one-line summary; Remove deletes one.
- **Migration `0009_virtual.sql`** (LF): `cf_contest_times.name` (sync now saves every round's name, so the picker can filter by division without keeping the whole contest list) and `virtual_contests(id, contest_id, name, started_at, duration_seconds, ended_at, problems_json)`. Results are never stored; they're recomputed from submissions.
- Pure part: `src/engine/virtual.ts` (division, candidates, window, result, clock words; tests). Data tests: `src/data/virtual.test.ts`.
- Existing installs: the picker fills after the first update on v1.7 (that's when round names are saved).
- **Screenshots:** `docs/audit-v1.7/virtual-contest/` (browser mode, a real Codeforces sync): the picker with Start confirming, the running clock, and the review of a virtual ended right away (so 0 solved: nothing was submitted, and nothing is made up).

### Part 9: rating goal plan (2026-11-09)

- **Progress → Overview (smart mode), under the rating chart: Rating goal.** Set a target rating (800 to 4000, above your current) and a day; it's saved as the setting `ratingGoal` (`{target, by, setAt, startRating}`), no migration. Change or Remove any time. Hidden until a Codeforces profile has synced.
- **What the plan shows** (`buildPlan`, `src/engine/ratingGoal.ts`, pure, tested): now, to go, weeks left, and the plan line (a straight line from your rating when you set it to the target) for today; then a verdict, then two weekly targets, then the weeks tracked.
- **The verdict compares the goal with your own best climb:** the most rating you gained in any 90-day stretch of your rating history, per month. Needs no more than that: "within reach". Needs more: **"Honestly, this is unlikely"**, with both numbers and the day your best pace would get you there. Under 90 days of rated history: it says it can't judge yet. Also "You're there" and "The date has passed". A first rated round's old rating is 0 on Codeforces; that round is the start, never counted as a gain.
- **Decision, the targets** (so nothing is a made-up number, and each says what it's based on): *problems a week* in the **practice band** (100 to 300 above your rating in 100-point steps; 800 to 1000 unrated) = your Codeforces solves a week over the last 8 weeks, scaled by how much faster than your best climb the goal asks (×0.75 to ×1.5), kept between 3 and 30. *Rated rounds a month* = what you took during your best climb or lately, whichever is more, rounded, at least 2; with no rated history, 4 (one a week), and it says so.
- **Tracked weekly:** this week's solves inside this week's band against the target (a meter), rated rounds this calendar month against the target, and every earlier week since the goal was set (up to 6), each measured against the band for your rating at the start of that week, with a check when met.
- **Screenshots:** `docs/audit-v1.7/rating-goal/` (browser mode, a real Codeforces sync): a goal within reach, and an unlikely one with the honest note.

### Part 10: friends (2026-11-09)

- **Progress → Friends** (fourth tab, `/progress/friends`, lazy): add a friend by Codeforces handle, LeetCode username, or both (a pasted profile link or "@" is cleaned up). Each handle is checked through the adapters before it's saved, with the site's own spelling; a duplicate is refused. Stored only on this computer (**migration `0010_friends.sql`**, LF: `friends(id, cf_handle, lc_handle, added_at, stats_json, fetched_at, error)`). No server.
- **Side by side:** a table with **You** first (highlighted), then friends in the order added: Codeforces rating (and max), **Solved this week** (problems first solved since Monday, Codeforces plus LeetCode), **Streak** (days in a row with a Codeforces solve or a LeetCode submission, the same rule as your own), LeetCode solved. You and friends go through the same function (`personStats`, `src/engine/friends.ts`), so the columns mean the same thing. Remove with the × on a row.
- **Honest limits:** a friend's Codeforces is read from their latest 1,000 submissions, LeetCode from the 20 latest accepted solves it shows anyone; when that may cut this week short the count gets a "+" (explained under the table). Rank colours are not used for friends: `--rank` stays reserved for your own rank.
- **Refreshed with every update:** after a sync that wasn't offline, `refreshFriends` (`src/data/friendsRefresh.ts`) reads each friend in turn through the adapters (the Codeforces rate-limit queue is shared). Fails soft per site: a site that doesn't answer keeps that friend's last numbers and the row says "Couldn't update just now; showing <time>" with the reason. A friend is also read right after being added.
- **Tests:** `friends.test.ts` in engine (week counts, "+", streak, handle cleanup) and data (add, refresh, remove, fail-soft); tabs and the route.
- **Screenshots:** `docs/audit-v1.7/friends/` (browser mode; you plus three public profiles: tourist and jiangly on Codeforces, lee215 on LeetCode).

### Part 11: more playlists (2026-11-09)

- **Nine playlists added (102 → 111, 4,684 videos)**, every id read from the channel's own Playlists tab (`channelPlaylists()`), filled by `npm run fill:playlists`, verified by `check:links`:
  - **JavaScript** (there was none): Codevolution *JavaScript Algorithms and Data Structures* (80, course) and RoadsideCoder *DSA with JS* (19, course), both `js`.
  - **English prefix sums:** CodeNCode *Range Queries : CSES* (6 walkthroughs: static range sums, 2D prefix sums, then sparse table and Fenwick; also `data-structures`).
  - **English combinatorics:** CodeNCode *Combinatorics* (stars and bars, pigeonhole).
  - **English string algorithms:** CodeNCode *String Algorithms* (hashing, KMP, Z) and WilliamFiset *Suffix array playlist*.
  - **Greedy:** GeeksforGeeks *Greedy Algorithms Tutorials* (en), CodeNCode *Greedy Algorithms : Codeforces* (en walkthroughs) and codestorywithMIK *Greedy : Popular Interview Problems* (hi, 72 walkthroughs), the first Hindi greedy playlist, so every Beginner Path topic now has a topic playlist in both languages.
- `code-langs.json`: Codevolution and RoadsideCoder code in JavaScript; CodeNCode, GeeksforGeeks and codestorywithMIK (C++ and Java side by side) are concept.
- Still no topic playlist (as of Part 11): en implementation, brute force, constructive, probability, geometry, divide and conquer, interactive, design; hi the same minus constructive, geometry and interactive, plus game theory and advanced graphs.

### Part 12: Share my week (2026-11-09)

- **Progress → Share my week** (a button beside the tabs, both modes): a panel with a preview of a 1200x630 PNG (drawn at 2x) of this week: your Codeforces rating in your rank colour with the rank chip and this week's rated change (or "No rated round this week"; "Unrated" with no rating), **Solved this week** (Codeforces + LeetCode, first solves since Monday, the Weekly goals rule, manual marks included), **Streak**, and **Top topic** (the topic with the most problems solved this week, from real tags; a tie goes to the earlier topic; "None yet" when nothing is solved). Light or Dark (starts on the theme showing), **Save as PNG**.
- **Style:** the theme's own tokens, read from a hidden `[data-theme]` wrapper, so the card matches the app in both themes; the still nebula, the compass mark and wordmark, Chakra Petch numbers, glass tiles. `--rank` only on the rating and the chip.
- **Saving, no upload:** a Rust command `save_png` opens the native Save dialog (**tauri-plugin-dialog**, Rust side only; docs checked with context7) and writes the bytes to the path the user picked, after checking they're a PNG. The webview gets no file-system permission and no new capability; the CSP is unchanged. In a plain browser it's an ordinary download.
- Pure part: `buildShareWeek`, `weekRangeWords`, `shareFileName` (`src/engine/shareCard.ts`, tests); data: `src/data/shareCard.ts`; drawing: `src/features/progress/shareCardDraw.ts`.
- **Screenshots:** `docs/audit-v1.7/share-week/` (browser mode, a real Codeforces sync, on a Monday, so 0 solved this week).

### Part 13: MAINTAINING.md (2026-11-09)

- **`MAINTAINING.md`** at the repo root, for someone working without an AI assistant: setup, run/test/build, the rules that break things (applied migrations, LF, the bundle id, no invented data), the full release procedure with `scripts/release.mjs` (key, password, the four version fields, test on real data, merge/tag/push, `gh release`, checking `latest.json`), adding and verifying videos and playlists, regenerating sheets, what to do when `check:links` fails, fixing a broken LeetCode GraphQL API (where the adapter is, how it fails soft, how to capture the new query), where user data lives (`%APPDATA%\com.algocompass.app\` and each file), and backups (data folder and signing key). Linked from the README.
- **`scripts/inspect-db.mjs`**: read-only (sql.js, in memory) list of the applied migrations and rows per table of the real database or a backup. The Debug page doesn't show `_sqlx_migrations`, and a release needs that check.

### Part 14: release v1.7.0 (2026-11-09)

- **Checks:** `npm test` (632 passed), `npm run check:links` (all verified: 111 playlists, 4,684 videos, every sheet and path problem), `npm run build`. Version 1.7.0 in `package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml` (and `Cargo.lock`). README updated for v1.7 (features, "updates itself", and Privacy now names the daily `latest.json` check on GitHub).
- **Backup first:** `%APPDATA%\com.algocompass.app` copied to `Desktop\algocompass-backup-1.7` (16 files, identical sizes, database hash checked).
- **Build:** `node scripts/release.mjs` with `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` read from the password file for that one command (never printed, removed after). Signed setup.exe and .msi; the signature's key id (8EF1FEFD17869EE2) matches `pubkey`. `latest.json` carries the release notes.
- **Run on the owner's real data:** the built `algocompass.exe` started on the real database (Today showed the real rating and problems), migrated it from 6 to 10 migrations (`_sqlx_migrations` 1–10, all successful, read with `scripts/inspect-db.mjs`), and every row count was unchanged (122 Codeforces submissions, 24 LeetCode solves, watched videos, badges, contests); only `sync_log` grew, from the update it ran. New tables (`revisions`, `virtual_contests`, `friends`) empty, as expected. No restore was needed.
- **Published:** merged `v1.7` into `master`, tagged `v1.7.0`, pushed, GitHub release with the setup.exe, the .msi and `latest.json` (plain-English notes: what's new, the SmartScreen note, "from 1.7 the app updates itself").

## v1.6, full playlists and Practice this (released as v1.6.0 on 2026-11-09)

Released. A learner gets whole YouTube playlists (every video, in order) instead of a few videos picked from each.

### Part 1: the playlists (2026-11-07)

- **Data:** `src/data/playlists.json`, 102 playlists, **4,464 videos** (3,866 distinct; the big courses share some videos with the topic playlists). Curated per playlist: `id`, `lang`, `scope` (`course`: a whole DSA course; `topic`: one topic), `kind` (`lectures` | `walkthroughs`) and `topics`. Everything else (title, channel, `codeLang`/`alsoCodeLang`, and every video in playlist order with its title and minutes) is written by **`npm run fill:playlists`** (`scripts/fill-playlists.mjs`).
- **Where the ids came from:** every id was read off the channel's own Playlists tab (`channelPlaylists()` in `scripts/lib/youtube.mjs`), never typed from memory, then checked with playlist oEmbed. Channels: take U forward, NeetCode, WilliamFiset, Abdul Bari, mycodeschool, Kunal Kushwaha, Pepcoding (English); CodeHelp - by Babbar, Aditya Verma, Apna College, Luv, Gate Smashers, Pepcoding (Hindi).
- **No API key:** `scripts/lib/youtube.mjs` reads the public playlist page and its "load more" pages (YouTube's own web client calls), in both layouts YouTube serves today (`playlistVideoRenderer` rows and the newer `lockupViewModel` cards). It sends `SOCS=CAI` so a cookie-consent redirect (this machine's traffic exits in the EU) doesn't replace the page. Private and deleted entries are left out and counted; a video listed twice is kept once.
- **Spoken language check:** the fill samples three videos per playlist and reads the language of YouTube's automatic captions. It's noisy on Indian English (it hears Bengali or Arabic now and then), so it only warns. It did move ten Pepcoding playlists I'd guessed were English to Hindi (the Level 3 series: Segment Tree, Range Queries, Constructive, Interactive, Geometry, Text Processing, Number Theory, Maths for CP, and Rajneesh Kumar's Two Pointer and DP); Game Theory - Level 3 stays English.
- **What it codes in:** the same table and rules as single videos (`deriveCodeLang`), with the playlist's title and channel; a `walkthroughs` playlist counts as a walkthrough (NeetCode's are Python). New channels in `code-langs.json`: Kunal Kushwaha (Java, always) and mycodeschool (concept: C or C++, and C isn't offered).
- **Counts:** English 48 playlists (7 full courses), Hindi 54 (8 full courses). By what they code in: concept 44, C++ 41, Java 12, Python 5 (NeetCode's three plus Pepcoding's Python Level 1 in English and in Hindi), JavaScript 0.
- **Topics with no topic playlist** (a full course may still cover them): English: implementation, brute force, constructive, prefix sums, combinatorics, probability, geometry, divide & conquer, string algorithms, interactive, design. Hindi: implementation, brute force, greedy, probability, divide & conquer, game theory, flows/advanced graphs, design.
- **Decisions:** Pepcoding's Level 2 series come in "C++ | English", "Java | English" and "C++ | Hindi" versions; all are in, so the language filter picks the right one. Pepcoding's 554-video "DSA - Level 1" and the Level 1 topic series are out: their titles name no language and they'd crowd every topic. Striver's A2Z course is `en` though a few early videos in it are in Hindi (the samples heard one).

### Part 2: check:links checks the playlists (2026-11-07)

- **`scripts/lib/check-playlists.mjs`**, section 6 of `npm run check:links`: every playlist's oEmbed must answer 200 with the stored title and channel exactly, carry the `codeLang` the table gives it, and have videos stored. Any of those fails the run.
- **Count changes warn:** the playlist page is read again (three tries); when YouTube now lists a different number of playable videos than stored, or the page can't be read, it prints `warn  <title>: 315 videos stored, 316 on YouTube now (run npm run fill:playlists)`. Channels add videos to running series, so a changed count isn't a broken link.
- **Offline, in `npm test`:** `src/data/playlists.test.ts`: every playlist is filled (title, channel, unique 11-character video ids, minutes), uses known languages, scopes, kinds and topics, carries the right `codeLang`, and every Beginner Path topic has an English topic playlist and a Hindi one except Greedy.
- `playlistRoles()` (`scripts/lib/code-lang.mjs`) is the one place that says a walkthroughs playlist is tagged as a walkthrough; fill, check and test share it.
- First run: 102/102 match; one transient "couldn't read the page" warning, which is why the page read now retries.

### Part 3: Playlists in Learn, and the playlist page (2026-11-07)

- **Learn → Playlists** (`PlaylistsCard`, `src/features/learn/Playlists.tsx`): full courses first, then one group per topic in the library's order (weakest first in smart mode, the path's order for beginners), four playlists per group and four topic groups before "Show all N topics". Filters: English / Hindi / Both (starts on your video language) and "<Language> + concepts" / "All languages" (starts on yours, like the library), plus the library's `?topic=` (a playlist that covers the topic shows, courses included). Each row: the first video's thumbnail with a stacked edge and the video count, title, language chip, "channel, N videos, 31 h", and once started "3 of 29 watched" with a meter and "Next: part 4 of 29".
- **Where it sits:** smart mode: Continue learning, **Playlists**, the video library, the roadmap. Beginner mode: Continue learning, the roadmap, **Playlists**, the library (folded). The sidebar hint and Learn's subtitle now mention playlists.
- **Playlist page** (`/learn/playlist/:id`, `src/features/learn/Playlist.tsx`, lazy): the part big on the left ("Part 12 of 56" with previous/next chevrons, title, chip, channel, length, language), one primary **I've watched it, next part** (marks it watched and moves on; on the last part, "I've watched it"), Mark as watched, Watch on YouTube. On the right, every part in order: numbered discs that turn into checks, "N min, watched", the playing part on a sunken fill; only the list scrolls to keep it in view. The embed is the existing `VideoPlayer` (youtube-nocookie, click to load), so the CSP is unchanged.
- **Where you left off:** the page opens on the part you last opened in that playlist, or the next part not watched yet after it if you've since marked it watched (`resumeIndex`). The URL carries the part (`?v=`), so Back and links are stable. "Continue where I left off" shows in the parts card when you've wandered away from the part after the furthest one watched (`frontierIndex`), but not right after marking the current part watched (Next does that).
- **Continue learning** now includes playlists: the `learn` setting records the last playlist part (`playlist`) and the last part opened per playlist (`playlistAt`); `continueLearning` picks the most recent of lesson, video and playlist part, skipping a playlist the app no longer ships. The card shows the part the playlist will open on, "Part 20 of 56", the meter and **Continue where I left off**.
- **Watched ticks** are the existing `video_watched` rows (any YouTube id), so a video watched in a lesson, the library or one playlist is ticked in every playlist that has it (the Graph Series' parts show up as watched in Striver's A2Z course too). **No migration.**
- **Words** (`src/lib/glossary.ts`): `LABELS.playlists`, `fullCourses`, `continuePlaylist` ("Continue where I left off"), `watchedNext`, `watchedLast`, and `partOf()` / `watchedOf()`.
- **Bundle:** the playlist data is its own lazy chunk (495 kB, 127 kB gzipped), loaded on first visit to Learn; the main bundle didn't grow.
- **Decisions:** the page doesn't autoplay on arrival (you see the part and press play), but does once you pick a part or press Next on the page. The primary button marks watched rather than tracking playback: the embed doesn't report progress without the IFrame API's extra origin, and ticking by hand matches every other video in the app. Topic playlists sit under their first topic only, so each shows once.
- **Tests:** `src/engine/playlists.test.ts` (filters, grouping, length words, progress, resume, frontier), continue learning with a playlist (`learn.test.ts`), the history's playlist fields and malformed records (`data/learn.test.ts`), the route (`router.test.ts`).
- **Docs:** CLAUDE.md (Learn, Playlist page, history, playlist data rules), DESIGN.md "Full playlists (v1.6)".

### Part 4: goal rows in Dark, and the README (2026-11-08)

- **Today's goal rows were too dark in Dark:** each row sat on Abyss Sunken (`#060607`) inside a `#17171b` card, so the rows read as black holes. They now sit on a new **Row** token (`--row`, `bg-row`): Dark `#222228` with a hairline border, Light `#ececef` (unchanged look). Measured on the row in Dark: ink 14.4:1, Mist (the counters) 7.7:1, Dusk (the open-goal dot) 5.7:1, the accent bar 6.2:1, Success check 10.3:1, all above AA (`scripts/check-contrast.mjs` now lists `row`). It's the same `TodayGoal` in both modes, so Smart Today's goals got the fix too.
- **Found on the way:** Settings → Handles said "Changing a handle re-syncs from scratch" (a retired word the glossary test misses, since its pattern skips words joined by a hyphen). It now says "Changing a handle loads that profile's history again from the start."
- **Learn's subtitle** is shorter so it fits at 1100px with the Update status beside it: "Full playlists, videos for every topic and the Beginner Path" (beginners: "The Beginner Path's lessons, full playlists and videos for every topic").
- **README refreshed** for the current app: the two modes, the five screens in sidebar order with their current names (Do this next, Today's goals, Today's problems, Problems you tried, Sheets, Overview / Topics, Badges, Update), the coding language (v1.5), Code it in, the code templates, and Playlists marked "new in v1.6". No retired names. The data scripts list adds `tag:videos` and `fill:playlists`; credits cover video and playlist channels; the roadmap drops what shipped and adds must-do problems per video.
- **New screenshots:** 19 in `docs/screenshots/v1.5/`, 1100x700, browser mode (Smart mode with a real Codeforces + LeetCode profile, and a fresh beginner). The old top-level `docs/screenshots/*.png` are no longer referenced by the README; they're left in place.

### Part 5: check (2026-11-08)

- **`npm test`:** 506 pass, 29 skipped (28 Java/Python template compiles with no javac or real Python on this machine, and the live adapter test).
- **`npm run check:links`:** all verified, exit 0. 153 videos (204 uses), 5 sheets (1,281 problems), 291 curated LeetCode problems, 86 URLs, and **102/102 playlists** (oEmbed 200, title, channel and codeLang exact). No playlist's video count has changed since the fill.
- **`npm run build`:** green. The playlist data is its own lazy chunk (495 kB, 127 kB gzipped); the main bundle is unchanged.
- **`npm run tauri dev`** (PowerShell): built in 2m 28s, `algocompass.exe` launched and responding, no errors in the log; stopped after the check, nothing clicked (real database). The first two attempts failed only because the browser-mode Vite I'd used for screenshots still held port 1420.
- **Migrations:** none. Playlist progress is the existing `video_watched` table and the `learn` setting.
- **Screenshots:** 20 in `docs/audit-v1.6/playlists/`, Light and Dark at 1100x700, browser mode, a fresh beginner: the Playlists card, a playlist at part 1, after three "I've watched it, next part" clicks, wandered to part 20 (Continue where I left off), Continue learning resuming the playlist, rows with progress, Hindi + All languages, a Java learner's "Java + concepts", filtered to Dynamic programming, and Today's goal rows on the new Row surface.
- **Not done:** no release, no version bump, no merge.

### Must-do problems after every video (v1.6, parts 6 to 9)

After any video (a library video, a playlist part, a lesson's extra video) a "Practice this" card lists a few problems for its topic, easy to hard, picked by how many popular sheets list them.

#### Part 6: difficulty data (2026-11-08)

- **`npm run fill:difficulty`** (`scripts/fill-difficulty.mjs`) refreshes every sheet problem's difficulty from the platforms without downloading the sheets' sources again: LeetCode's difficulty from GraphQL (`difficultyFrom: "lc"`), the Codeforces rating from `problemset.problems` (`rating`). **`gen:sheets` writes the same fields** when it rebuilds; both use `scripts/lib/sheet-json.mjs` (`difficultyFields`, the file layout).
- **Where a difficulty comes from is stored:** `difficultyFrom: "lc"` (LeetCode) or `"sheet"` (the creator's own level for a problem not on LeetCode: takeUforward's basic / core / pro, as before). Nothing is guessed; a problem nobody rates keeps `difficulty: null` and ranks last.
- **Counts (900 distinct problems):** 336 with LeetCode's difficulty, 163 with the sheet's level (takeUforward-only problems), **401 with none** (370 GeeksforGeeks problems from Babbar 450, 25 other links, 6 with no link). The five sheets list **no Codeforces problems**, so no sheet problem has a rating; the Beginner Path's Codeforces problems already carry theirs (`fill:media`), and must-do uses them.
- No LeetCode difficulty changed since the sheets were generated (2026-10-18).
- **Checks:** `check:links` now requires LeetCode's exact difficulty on every LeetCode problem (it used to skip a missing one) with `difficultyFrom: "lc"`, the Codeforces rating on a Codeforces problem, and a source on every difficulty. `src/data/sheets.test.ts` checks the same offline.

#### Part 7: the engine (2026-11-08)

`src/engine/mustDo.ts`, pure, tested in `mustDo.test.ts` (synthetic sheets plus real titles and real data).
- **The pool** (`buildPool`): every distinct problem in the five sheets and the Beginner Path (as a sheet), by key, with the popular sheets that list it (`sheets`, the path doesn't count: "On 4 of 5 popular sheets"), `inPath`, every topic any sheet gives it, and `leadTopics` (topics a sheet files it under, a section's topic). When sheets disagree on difficulty, LeetCode's own wins, then a Codeforces rating, then a sheet's level.
- **`mustDo(pool, topic, isSolved, { n = 5, named, keep, exclude })`:** candidates are the topic's problems not solved yet, ranked by how many popular sheets list them, then in the Beginner Path, then filed under the topic, free before LeetCode Premium, easier first. The list keeps **two Easy problems** (one when it shows three or fewer), fills the rest with the best-ranked harder ones (more Easy ones only if nothing harder is left), and shows them **Easy → Medium → Hard, unknown difficulty last**. `keep` holds rows ticked on the screen (so a row doesn't vanish under the cursor), `exclude` a lesson's own problems.
- **Codeforces next to LeetCode:** a rating sorts inside LeetCode's three bands: under 1300 with Easy, 1300 to 1799 with Medium, 1800 up with Hard, by rating inside a band (`CF_BANDS`, `difficultyRank`). The chip still shows the rating, never a made-up "Easy".
- **"Solved in this video"** (`namedProblem`): exact only. The problem's LeetCode or Codeforces title must be the video title's **first part** (before `|`, `•` or `: `), after removing numbering ("L5.", "Lecture 62:", "BS-12.", "DP 5.") and a "Leetcode 1" tag; a short label ("Sliding Window: …") and leading approach parts ("Iterative & Recursive - …") are skipped. A sequel marker behind it picks the sequel ("Word Ladder - 2" → Word Ladder II, or nothing). Rejected on purpose: a topic in a later part ("EKO SPOJ Problem | Binary Search" isn't LeetCode's Binary Search), a qualifier ("Coin change problem: Maximum number of ways", "Coin Change - Combinations"), a channel's own numbering ("Permutations - 2 Medium", Pepcoding), and a title that says the other platform ("Permutations || Codeforces"). Precision over recall: I read every match on the real titles.
- **The topic of a video** (`videoTopic`, `partTopics`): a library video or one-topic playlist uses its topic. A full course part, or a part of a playlist over a few topics, uses the topic its title clearly names (`topicsNamed`: an ordered word table, so "Binary Search Tree" is Trees and "Topological Sort" is Graphs), then the problem it solves, then **the part before it** (courses teach a topic over a run of parts: "G-9. Flood Fill" sits among the graph parts), then a topic playlist's first topic. A course part before any of that (intros, "Complete Git and GitHub Tutorial") gets no topic and an honest empty state.
- **Decision:** the pool is the sheets and the Beginner Path only (not the curated `lc_lists.json` per topic), as asked: "On N of 5 popular sheets" stays literally true. Topics the sheets barely cover get a short list or the empty state.

#### Part 8: Practice this (2026-11-08)

- **On topic first (found in the browser):** ranking by sheet count alone put Reverse Linked List and Valid Parentheses at the top of "coding basics", because A2Z files them under a "Logic Building" or "Implementation" part once and their tags are broad. Now each problem has a **home topic** (the topic most sheets file it under; `leadTopics[0]`), and `topicTier` sorts the topic's own problems first, then ones a sheet also files there, then ones only tagged with it. The list only widens to a lower tier when it isn't full, so an easy problem of the topic beats a harder one that wandered in. "Implementation" is a home topic only when no sheet files the problem anywhere else (A2Z uses it as a part label inside Binary Search, Heaps and more). Binary search now reads Binary Search, Search Insert Position, Search in Rotated Sorted Array, Find Minimum in Rotated Sorted Array, Median of Two Sorted Arrays; graphs: Flood Fill, Find if Path Exists in Graph, Clone Graph, Number of Islands, Rotting Oranges.
- **`PracticeThis`** (`src/features/learn/PracticeThis.tsx`): card header ("Practice this", the topic in plain words, "1 of 5 solved"), then 3 to 5 rows: difficulty chip (three rising bars plus "Easy" / "Medium" / "Hard", a Codeforces rating with the difficulty `Term`, or "Not rated"; a sheet's own level says so on hover), title (with a "Solved in this video" pill), "LeetCode · On 4 of 5 popular sheets" (or "From the Beginner Path"), **I solved it** (the sheets' tick: `useTickProblem`, so a LeetCode or Codeforces problem also counts as a solve, like a sheet tick) and **Open on <site>**. A row ticked here stays (as "Solved", which unticks) until the video changes, so nothing jumps under the cursor.
- **Where:** the **Watch** page (under the video, before "More on <topic>"); the **Playlist** page (full width under the player and the parts list: in the 8-column player column the rows truncated every title at 1100px); a **lesson's extra video or walkthrough** (after Solve, without the lesson's own problems; the main video's practice is Solve itself).
- **After "I've watched it":** marking the video watched (Mark as watched, the playlist's last-part "I've watched it") gives the card the accent aura pulse once and scrolls it into view. **"I've watched it, next part"** moves on as before, but the card stays on the part you just watched: "Practice what you just watched", "Part 56 of 315: BS-12. Koko Eating Bananas", with "This part's problems" to switch. Picking any other part resets it.
- **Empty states:** a part naming no topic ("This video doesn't name one topic, so there's nothing to suggest for it yet", links to Learn and Sheets); a topic with nothing left ("The popular sheets have no <topic> problems left for you here…", link to Practice).
- **Data:** `src/data/mustDo.ts` loads the five sheets and the path (their existing lazy chunks) once per session and builds the pool; a failed load is retried next time.
- **Words** (`glossary.ts`): `practiceThis`, `practiceJustWatched`, `solvedInVideo`, `fromPath`, `iSolvedIt`, `solved`, `notRated`, and `onSheets(n, of)`; the glossary test checks them.
- **Docs:** CLAUDE.md (Watch, Playlist, the must-do rules), DESIGN.md (the card).

#### Part 9: check (2026-11-08)

- **Coverage, counted over every video in the app** (3,921 distinct videos: library, lessons, the 102 playlists; nothing solved yet): **94.5% (3,704) get 3 or more must-do problems.** By where they show: library 84% (112 of 134), lesson videos 100%, course parts 96.5%, topic-playlist parts 93.6%. **66 course parts name no topic** (course intros, setup, "Complete Git and GitHub Tutorial", Abdul Bari's opening lectures) and get the empty state.
- **"Solved in this video": 273 distinct videos** name a problem in the data exactly (160 distinct problems), mostly NeetCode's walkthroughs, Striver's BS-, G-, DP- and L- series, Pepcoding's and Aditya Verma's problem videos.
- **Topics with too few problems (fewer than 3 in all five sheets and the path):** constructive 0, probability 0, flows / advanced graphs 0, combinatorics 1, game theory 1, brute force 2, geometry 2, range queries (data structures) 2. Number theory and interactive have exactly 3. Videos on those topics (about 200, most of them Pepcoding Level 3 and Luv parts) show a short list or the empty state. Filling them needs a source beyond the sheets (the curated `lc_lists.json`, or Codeforces problemset by tag), which would break "On N of 5 popular sheets"; left for a decision.
- **`npm test`:** 546 pass, 29 skipped (the same Java/Python template compiles and the live adapter test).
- **`npm run check:links`:** all verified, exit 0: 86 URLs, 291 curated LeetCode problems, 5 sheets (1,281 problems; 661 LeetCode rows with LeetCode's exact difficulty and `difficultyFrom: "lc"`), 153 videos (204 uses), 102 playlists.
- **`npm run build`:** green; Practice this is its own 18 kB chunk (7 kB gzipped) loaded by Watch, Playlist and Lesson; the main bundle is unchanged (514 kB).
- **`npm run tauri dev`** (PowerShell): `algocompass.exe` launched and responding against the dev Vite, no errors in the log; stopped after the check, nothing clicked. The first two tries failed only because my browser-mode Vite (screenshots) still held port 1420 through open connections without listening, so `netstat` showed no listener; stopping it fixed it. No Rust changes, so cargo didn't rebuild.
- **Migrations:** none. Ticks are the existing `sheet_ticks` / `manual_solves`; difficulties live in the bundled JSON.
- **Screenshots:** 12 in `docs/audit-v1.6/mustdo/`, Light and Dark at 1100x700, browser mode, a fresh beginner: the Watch page (binary search), a playlist part with "Solved in this video" (Koko Eating Bananas), "Practice what you just watched" after **I've watched it, next part** with a row ticked, the Watch page after Mark as watched (the ticked problem gone, the next one in), a lesson's extra video, and the empty state on a course intro.
- **Not done:** no release, no version bump, no merge.

### Sharpen on Codeforces (v1.6, parts 10 to 13)

Practice this ends with real Codeforces problems at your level, and topics the sheets barely cover are filled with them. LeetCode is where a topic is learned; Codeforces is where it's sharpened.

#### Part 10: the problemset, cached (2026-11-08)

- **No new adapter code or table:** `CodeforcesAdapter.getProblemset()` already reads `problemset.problems` (tags, rating, and `solvedCount` joined from `problemStatistics`), and `cf_problems` already caches it. What was missing: the sync only fetched it with a Codeforces handle, so a beginner never had it.
- **`ensureCfProblemset`** (`src/data/cfProblemset.ts`): returns the cached list when the last successful fetch is under a day old; otherwise fetches through the shared adapter (`getCfAdapter()` in `syncStore.ts`, so the CF rate-limit queue is shared), saves it and logs `cf:problemset` in `sync_log`, the same kind the sync's step checks, so the two never fetch twice in a day. **Fail soft:** on any error it returns the saved list marked `stale` with the error, or an empty list with the error when nothing was ever saved; nothing throws.
- **`useCfProblemset()`:** TanStack query `["cf", "problemset"]`, deliberately not under `["db"]`, so a tick doesn't re-read 10,000 rows.
- **Migrations:** none.
- **Tests:** `src/data/cfProblemset.test.ts` (one fetch a day, offline with and without a saved list, sharing the day with the sync's step) on the real schema (sql.js).

#### Part 11: the engine (2026-11-08)

`src/engine/cfSharpen.ts`, pure, tested in `cfSharpen.test.ts`.
- **`sharpenWindow(rating, beginner)`:** the same window Today's problems use (your rating rounded to 100, up to 200 above, from `recommender.ts`), or **800 to 1200** with no rating or in Beginner mode.
- **`cfSharpen(problems, topic, window, isSolved, n = 2, { keep, exclude })`:** problems whose Codeforces tags map to the topic (topics.json, `topicsForTags`), rating inside the window, from a real round (a problemset-only problem has no page to open), no April Fools (`*special`) problems, not solved (by the app's key `cf:<id>`, so a sheet tick, a manual tick or a synced solve all count), not already on the card. **Most solved first** (the classics), then lower rating, then the newer round.
- **`sharpenCount(sheetRows, sheetProblemsInTopic)`:** 2 Codeforces rows on every card; a thin topic (fewer than 3 problems in the sheets and the path, `topicProblemCount` in `mustDo.ts`) fills the card up to 5 rows with them.
- **Coverage on today's problemset (11,000 problems):** every thin topic now fills: constructive 535 problems at 800–1200, brute force 540, data structures 100, game theory 75, geometry 64, combinatorics 42, flows / advanced graphs 14, probability 5. **Topics with no Codeforces tag** get no Codeforces rows (Codeforces has no tag for them): arrays & hashing, prefix sums, stacks & queues, linked lists, heaps, recursion & backtracking, tries, design. Divide & conquer has 1 problem at 800–1200.

#### Part 12: Sharpen on Codeforces in Practice this (2026-11-09)

- **After the sheet rows:** a hairline, then **Sharpen on Codeforces** with "Difficulty 800 to 1200, Codeforces' easiest, most solved first" (or "around your rating" with a rating, from `useCfRating()`: the profile's rating after the last update; Beginner mode always uses 800 to 1200). Each row: the rating chip (the same chip, the rating under the difficulty `Term`), the problem name, **"Codeforces · Solved by 98k"** instead of "On N of 5 popular sheets", **I solved it** and **Open on Codeforces**. A Codeforces problem becomes a sheet-shaped problem (`cf:<id>`), so I solved it is the same tick path (`sheet_ticks` plus `manual_solves`), and a synced Codeforces solve ticks it too.
- **Thin topics:** "The popular sheets barely cover game theory, so Codeforces fills in." Game theory's card: its one sheet problem, then 4 Codeforces problems (Game with Integers, Buttons, 01 Game, Mahmoud and Ehab and the even-odd game). A topic with no sheet problems at all (constructive) shows only Codeforces rows.
- **The count pill** counts both: "1 of 7 solved".
- **Fail soft, honestly:** offline with nothing saved, a topic Codeforces tags shows "Codeforces problems for this topic show once the app can reach Codeforces." under the sheet rows; a thin topic with nothing at all says the sheets have nothing left on it and Codeforces couldn't be reached. With a saved list older than a day, the sub-heading line adds "From the saved list (Codeforces couldn't be reached)". Topics Codeforces has no tag for (linked lists, heaps…) never mention Codeforces.
- **Visible right after "I've watched it":** marking the video watched (or "I've watched it, next part", which keeps the card on the part you just watched) now scrolls the card's **top** to the top of the view (`block: "start"`, was `"nearest"`, which left a tall card's header off screen), instantly under reduced motion. Measured at 1100x700: the card's top sits at 153px, just under the title bar, and a 7-row card fits.
- **Shorter description** so it stays on one line with the extra rows: "The popular sheets' picks for binary search, easy to hard."
- **Words:** `LABELS.sharpenOnCf`, `solvedBy(n)` ("Solved by 980 / 1.2k / 40k / 1.2M"); the glossary test checks them.
- **Docs:** CLAUDE.md (the must-do rules), DESIGN.md (the sub-section).

#### Part 13: check (2026-11-09)

- **Coverage** (3,919 distinct videos with a card, today's problemset, nothing solved): **63.7% of cards (2,496) have Codeforces rows**, the same in the beginner window and at 1400, 1900 or 2400. The rest are topics Codeforces has no tag for (arrays & hashing, prefix sums, stacks & queues, linked lists, heaps, recursion & backtracking, tries, design: about a third of all videos) plus the 66 course parts with no topic. **98.3% of cards now have 3 or more rows** (94.5% before).
- **Topics under 3 problems: none.** Every topic has at least 3 sheet plus Codeforces problems in every window checked (800–1200, 1400–1600, 1900–2100, 2400–2600). The thinnest at 800–1200: probability (5 Codeforces problems), divide & conquer (14 sheet problems, 1 on Codeforces).
- **`npm test`:** 559 pass, 29 skipped (the same template compiles and the live adapter test).
- **`npm run check:links`:** all verified (86 URLs, 291 curated LeetCode problems, 5 sheets / 1,281 problems, 153 videos / 204 uses, 102 playlists). The Codeforces problemset isn't bundled data, so there's nothing new for it to check.
- **`npm run build`:** green; Practice this is 22 kB (9 kB gzipped); the main bundle is unchanged (514 kB).
- **`npm run tauri dev`** (PowerShell): `algocompass.exe` launched and responding, no errors in the log; stopped after the check, nothing clicked (real database). This time the browser-mode Vite ran as a tracked background task and was stopped before, so port 1420 was free.
- **Migrations:** none (`cf_problems` and `sync_log` already existed).
- **Screenshots:** 14 in `docs/audit-v1.6/cf/`, Light and Dark at 1100x700, browser mode, a fresh beginner: binary search with Sharpen on Codeforces, a Codeforces row ticked ("1 of 7 solved"), game theory right after Mark as watched (scrolled into view, filled by Codeforces), range queries (thin, filled), a playlist right after "I've watched it, next part", and offline (Codeforces blocked) for a thin topic and for binary search.
- **Skipped:** nothing asked for. Not done: no release, no version bump, no merge.

## Released: v1.5.0, the language you code in (branch `v1.5`, from `polish`, merged to master)

**Released as v1.5.0 (2026-11-07):** this branch and the v1.4 polish under it were merged into master; the version was bumped in package.json, tauri.conf.json, Cargo.toml and Cargo.lock. Tag `v1.5.0`, GitHub release with `AlgoCompass_1.5.0_x64-setup.exe` (4.3 MB) and `AlgoCompass_1.5.0_x64_en-US.msi` (5.7 MB). There's no Android build ("APK"): AlgoCompass is a Windows desktop app, so the release carries the Windows installers. The website wasn't touched (its Pages workflow only runs on changes under `website/`).

**Pre-release audit:** `npm test` 494 pass (29 skipped: Java/Python compiles with no compiler here, and the live adapter test), `npm run check:links` all verified, `npm run build` green, `npm run tauri build` 7m 39s with no sql.js in the desktop bundle. Two fixes from reading the diff:
- **Code it in skipped the video already playing:** for a lesson whose main video codes in your language (Strings), the slot pointed at that same main video. `lessonCandidates` now puts the lesson's main video last, so the slot names a different walkthrough when one exists (Strings in Python: NeetCode's Longest Substring).
- **Copy never rejects silently:** a refused clipboard write is caught (the code stays selectable).
- **Checked and left as is:** the main bundle is 514 kB in the browser build (Vite's 500 kB warning; the desktop build has no sql.js); existing installs get `codeLang` C++ until they pick one in Settings, and Learn's filter shows which language it's using ("C++ + concepts"), one click from "All languages".

A learner picks the language they write code in (C++, Java, Python or JavaScript), and lessons stop assuming one. No playlists yet.

### Part 1: the `codeLang` pref (2026-11-07)

- **Pref:** `codeLang` (`cpp | java | python | js`, default `cpp`) in `src/data/prefs.ts`, typed in `src/engine/codeLang.ts`. Like every pref it lives in tauri-plugin-store, so **no migration** was needed; unknown saved values fall back to C++.
- **Onboarding:** a beginner picks "I code in" right after "Lesson videos in". The two pickers share one row, so **Start lesson 1** stays in view at 1100x700 (measured: the button's bottom edge at 545px). Smart onboarding doesn't ask (it's for lessons); smart users set it in Settings. `onboardingFields()` now returns `codeLang`.
- **Settings:** one **Language** section under Mode: "Video language" (the English/Hindi switch moved here from Mode) and "I code in" (C++ · Java · Python · JavaScript). Both apply right away.
- **Words:** `LABELS.language`, `videoLanguage`, `codeIn`, `concept`, `allLanguages`, plus `CODE_LANG_NAMES`, `videoCodeLabel`, `codeItIn` and `myLangAndConcepts` in the glossary.
- **Decision:** default C++: most of the lesson videos that code at all code in C++, and Codeforces is C++-first.
- **Tests:** prefs (default, saved alone, unknown values), onboarding fields, glossary labels.

### Part 2: every video tagged with what it codes in (2026-11-07)

- **The table:** `src/data/code-langs.json` (committed). Rules in order: an override for one video id, then the languages a title names (the first named is the tag, the rest go in `alsoCodeLang`: "Binary Search tutorial (C++ and Python)" is cpp + python), then the channel's rule. A channel codes in one language `always` (Luv, CodeHelp - by Babbar: C++), only on `walkthrough`s (NeetCode: Python; Errichto: C++; a walkthrough is a resources.json walkthrough or a title naming a LeetCode problem), or never (`codes: null`: Abdul Bari, WilliamFiset, Aditya Verma, Gate Smashers, take U forward, Apna College without a language in the title…). **Unsure means concept**: a channel only gets a language when it codes on screen in that one language; every entry says why.
- **Tags on the data:** `npm run tag:videos` (`scripts/tag-videos.mjs`, rules in `scripts/lib/code-lang.mjs`) writes `codeLang` (and `alsoCodeLang`) onto every video in resources.json and beginner-path.json. 153 videos: **concept 78, C++ 53, Python 20, Java 2, JavaScript 0** (plus 2 also in Python and 1 also in Java).
- **check:links** now fails when a video's tag is missing, unknown, or differs from what the table gives, or its channel isn't in the table, and prints the per-language counts. The same check runs offline in `npm test` (`src/data/codeLangs.test.ts`).
- **Beginner Path main videos are concept videos** in 26 of 28 slots. 14 swaps, all verified with oEmbed (title and channel exact) and lengths filled by `npm run fill:media`:
  - From videos already in the app: English Sliding Window (take U forward L1), Stack and Queue (WilliamFiset), Binary Search (take U forward BS-1), Linked List (WilliamFiset), Trees (take U forward L1); Hindi Basics (Luv EP 10, overridden to concept: it's about complexity and constraints) and Recursion (Aditya Verma).
  - New: English Two Pointers (Josh's DevBox, an animated intro); Hindi Arrays, Hashing, Linked List, Trees, Graphs and Greedy (Gate Smashers whiteboard lectures).
  - The old main stays in the step as an extra with `wasMain: true`, and `stepProgress` counts a watched former main, so nobody who already watched it has to again. Greedy (Hindi) dropped its 3-minute Apna "Greedy Algorithm - Introduction" extra to stay within two extras plus the former main.
  - **Not swapped: Strings, both languages** (NeetCode Valid Anagram, Python; Apna "Strings in C++"). No verified concept video turned up; every candidate coded in one language (often C). The check prints them as a note.
- **Decision:** Hindi Two Pointers keeps Apna College's "Container with Most Water" as main. Its title names no language and Apna College has no single language, so the rule tags it concept, though it is a problem walkthrough.
- **Fix on the way:** `problemset.problems` now asks for `lang=en`; without it Codeforces sometimes answered with Russian names ("Арбуз") and check:links failed on Watermelon and Dragons.
- `scripts/lib/fmt.mjs`: the data files' JSON layout, shared by fill-media and tag-videos.

### Part 3: lessons in your language (2026-11-07)

- **Code it in <language>:** a card in the lesson's right column, above More videos. `pickCodeItIn` (`src/engine/codeLang.ts`) looks through the lesson's own videos, then its topics' library videos (`lessonCandidates`), for one that codes in your language (its tag or `alsoCodeLang`), in your video language when there is one. It plays in the lesson's big player (now able to play a library video). With none, the card says "No verified Java walkthrough for this lesson yet", offers the closest one (your video language first, then the nearest language: C++ ↔ Java, Python ↔ JavaScript), and notes that the code under Read is in your language. Every lesson has an alternative in every language.
- **Coverage today** (English video language; a Hindi video counts as a match and says "Hindi"):
  - **C++: 14 of 14** lessons.
  - **Python: 13 of 14**: Basics has none (closest: Errichto's CSES Introductory Problems, C++).
  - **Java: 2 of 14**: Basics (Apna College, Hindi) and Linked List (Apna College, Hindi). The other 12 have none yet.
  - **JavaScript: 0 of 14.** No JavaScript walkthrough is in the catalog yet.
- **Read → The code:** a minimal template per lesson in all four languages (`src/data/path/templates.ts`, `CodeTemplate`): tabs with yours first and open, Copy, arrow keys between tabs. Each shows the pattern's shape (sum and pair loops, index of max, counting vowels, most frequent with a map, a pair sum with two pointers, a variable window, stack and queue basics, first-true binary search, digit sum, list length, node count, BFS distances, earliest-end greedy, no-neighbours DP), never the answer to one of the lesson's problems. Locked lessons show it under Read ahead too.
- **Syntax checks** (`templates.test.ts`): JavaScript runs in `node:vm` (and five templates are checked for the right answers); C++ compiles with `g++ -std=c++17 -fsyntax-only` when g++ is installed (it is here: all 14 pass). Java (`javac`) and Python (`ast.parse`) run only where a real compiler or interpreter exists. This machine has a Java 8 runtime without javac and only Windows' python.exe stub, so those 28 checks are skipped here and were reviewed by hand.
- **Language chip on every video card** (`CodeChip`): library rows, the Watch page, Continue learning, the lesson's player line, More videos, Code it in, the Topic panel. Yours is accent-soft; "Concept", "C++ · Python" in words.
- **Learn filter:** "<Language> + concepts" (default) · "All languages", beside English / Hindi / Both (`filterLibrary`'s `codeLang`).
- **Decision:** the filter starts on your language every visit (it isn't saved), so the library never stays narrowed by surprise; "All languages" is one click.
- **Docs:** DESIGN.md "The language you code in (v1.5)", CLAUDE.md (Lesson, Learn toolbar, Settings, prefs, video tags). Settings' subtitle mentions languages.

### Part 4: check (2026-11-07)

- **`npm test`:** 494 pass, 29 skipped. The skipped ones are 28 Java/Python template compiles (no javac or real Python on this machine) and the existing live adapter test.
- **`npm run check:links`:** all verified. 204/204 video uses match YouTube, 204/204 carry the right `codeLang`, 59/59 path problems match. It prints one note: the two Strings main videos code in one language.
- **`npm run tauri dev`** (PowerShell): built in 1m 28s, `algocompass.exe` launched with no errors in the log; stopped after the check, nothing clicked (real database).
- **Migrations:** none. `codeLang` is a pref in tauri-plugin-store, and the video tags live in the bundled JSON, so there's nothing to migrate.
- **Screenshots:** 20 in `docs/audit-v1.4/lang/`, Light and Dark at 1100x700, browser mode, a fresh beginner: Welcome with "I code in", lesson 1 as a Python learner (player with its chip, Code it in, Read, the code tabs), Settings → Language, a locked lesson's code in Java, and the library filtered to "Java + concepts" and to "All languages".
- **Not done:** no release, no version bump, no merge. No playlists (as asked).

## In progress: v1.4 polish, from an outside design review (branch `polish`)

Not released. Behaviour and data are unchanged: only labels, layout, colours and the shell's chrome. Screenshots in `docs/audit-v1.4/polish/`.

### Part 1: every count says what it counts (2026-10-25)

- **Today, smart mode:** the Do this next card's footer reads "Today's problems · ▰▰▱▱▱ · 0 of 5 solved" (it said "0 of 5 done today", without saying of what). Today's goals keeps its own title and "0/4 done" pill, so the two counts are labelled separately.
- **Goal counters line up:** each goal row is a three-column grid (mark · goal · counter), the counter right-aligned in a fixed 44px column, and a goal's bar spans the text and counter columns.
- **"Striver SDE", not "SDE":** `sheetShortName()` (`src/engine/sheets.ts`) puts "Striver" in front of Striver's two sheet shorts. New sheet goals use it, and `goalTitle()` (`src/engine/quests.ts`) shows already-stored goals ("Solve 1 problem from SDE") the new way when they're evaluated; the stored row isn't touched. Today's "Next in Striver A2Z: …" and the followed-sheet card use it too. The sheet JSON is generated and stays as it is.
- **Other bare counts:** "2/9" on a sheet section, "34/150" under a sheet's percentage, "1/3 problems" on Continue learning and the "0/5 solved" pill on Today's problems now read "2 of 9 done", "34 of 150 done", "1 of 3 problems solved", "0 of 5 solved" (`solvedOf` / `doneOf` in the glossary). Counters inside a labelled row (a goal's "0/1", a badge's "13/30") stay compact.
- **Tests:** `goalTitle` and `sheetShortName` (quests.test.ts, glossary.test.ts), the count helpers.

### Part 2: top bar and shell (2026-10-25)

- **Smart mode's top bar is Search and Update only** (`topBarItems`). The goals chip, streak flame and level plate repeated numbers that Today and Progress already show; they're gone from the bar. Beginner mode is unchanged (Search, "Step X of 14", and the streak and level after Step 3).
- **Search** shows its word and its shortcut ("Search  Ctrl K") in both modes, so it needs no tooltip.
- **Update** is a status in words beside a labelled outline button: "Updated 21m ago · [Update]", "Updating…", "Not updated yet". A failure says which site failed, in Warning Amber with an icon: "LeetCode didn't update · [Retry]"; offline reads "Offline, showing saved data · [Retry]" (`updateStatus` in `topBarItems.ts`). The status no longer hides in a tooltip.
- **The ascent bar is gone, in both modes.** In smart mode it duplicated the rank progress on Today's rating card ("189 to Pupil", with its own labelled meter), and a 2px line can't carry a label; in Beginner mode it was an empty track. A 1px hairline closes the top bar instead. `useRankAccent` still runs, so the rank colour on the rating number, chip and meter is unchanged. `AscentBar.tsx` is deleted.
- **Tooltips:**
  - **Dismissed on navigation:** `Tooltip` (`src/components/ui/tooltip.tsx`) wraps Radix's root and closes when the shell announces a route change (`closeTooltips()` in `MainShell`'s pathname effect). Before, a sidebar hint opened on the link you clicked could stay over the new screen's title.
  - **Delay:** 400ms before a hint shows, and no instant chaining between hints (`skipDelayDuration` 0), so sweeping the pointer across the sidebar or the top bar doesn't pop a trail of tooltips.
  - **No repeated labels:** the expanded sidebar has no hover hints (they repeated the label and covered the screen title right beside the sidebar); the collapsed rail keeps them, since the label isn't visible there. Search and Update lost theirs (everything is in view).
- **Decision:** removing the bar rather than labelling it: "Progress to Pupil" already sits on Today's rating card in words and a meter, and a labelled strip under every screen's title would compete with the title.
- **Tests:** `topBarItems.test.ts` (smart = search + update; beginner unchanged; every Update status in words).

### Part 3: Beginner Today and the lesson (2026-10-25)

- **The button leads:** Beginner Today's Do this next card puts the step name in headline size (22px, was 32px display) with its subtitle, and the action button ("Watch the video (15 min)", "Solve problem 2 of 3: …") is the full-width large primary at the bottom, so it's the loudest thing in the card. Still one card beside today's goals.
- **Compact path strip** (`PathDots` in `src/features/path/shared.tsx`, dots from `pathDots()` in `src/engine/path.ts`): "Step 1 of 14", fourteen 8px dots (done in Success, the current one 10px in the accent with a soft accent ring, the rest faint) and a quiet "View Beginner Path" link to `/learn#path`. It replaces the 14-segment section strip and the separate "n of 14 steps done" line; the dots carry an accessible "Beginner Path: n of 14 steps done".
- **Trust note:** "No account needed. Your progress stays on this PC." under the button, in a 12px muted line with a shield icon.
- **Read is never inferred:** `lessonChecks` used to tick Read on any done step (a step unlocks on video + problems, without reading). Read's check now comes only from the recorded "I've read it" (`learn.read`). Watch and Solve still check on a done step, since its unlock rule needs both. The Next button's order and the unlock rule are unchanged.
- **Tests:** `pathDots` (path.test.ts), `lessonChecks` never inferring Read (learn.test.ts).

### Part 4: Practice (2026-11-07)

The brief for Parts 4–7 wasn't written into this log when Part 4 was interrupted; it's recorded here from the session prompt (Practice, Progress, colours and surfaces, check).

- **"Recommended next":** the one row with the filled Open carries a small accent-soft "Recommended next" tag after its title, in Today's problems and in a beginner's Problems from your lessons. `recommendedNextId()` (`src/engine/today.ts`) picks it: the first unsolved problem in the order Practice lists them (Codeforces, then LeetCode), so it's always the same problem Today's Do this next opens. A solved row never carries it.
- **Open says where:** "Open on Codeforces" / "Open on LeetCode" (`openLabel`, `siteName` in `problemText.ts`; `OpenButton withSite` for lesson problems). Compact rows (the Topic panel, Problems you tried) keep their icon button with the same words in its tooltip.
- **Fixed columns:** difficulty 56px, Open 176px (fits the longer label), menu 32px, and done rows keep a 32px spacer, so Open buttons line up down the card whatever the title. Lesson problem rows use a 96px difficulty column.
- **Topic chips wrap:** they moved under the title and meta line and wrap onto a second line instead of being cut to 160px.
- **"Problems you tried"** replaces "Unfinished problems" (`LABELS.unfinished`; the card description is "Not accepted yet, easiest first."). Contests' past-results note and the XP breakdown ("Problems you tried, now solved") follow. "Unfinished problems" joins the retired names.
- **Midnight copy:** "The same set until midnight." read as a restriction. It now says "A new set comes at midnight, or sooner with New set."
- **"View topic progress"** replaces "How strong am I at this?" on Learn's topic groups and the Watch page (it opens the Topic panel).
- **Decision:** sheet rows keep the short "Open" (a sheet section lists dozens of rows, and each row already shows its site); the sheet's Next tile already said "Open on LeetCode".
- **Tests:** `recommendedNextId` matches `pickDoThisNext` (today.test.ts); the Open label and the new words (problemText.test.ts, glossary.test.ts).

### Part 5: Progress (2026-11-07)

- **Weekly goals are meters, not rings:** three rows (goal · bar · "3 of 10" over "7 to go" or "✓ Goal hit"), a 10rem label column and a 6.5rem count column so the bars line up. At 0 a ring was an empty circle that read as nothing; a bar with "0 of 10 · 10 to go" says where you are. A goal set to 0 reads "No goal set". The platform dots beside the labels are gone (the label already names the site). `goalMeter()` in `src/engine/progress.ts`; the bar is a `role="meter"` with the words as its value text.
- **"Weekly details" fold:** the weekly review leads with rating, streak, topics that improved and next week's focus. The week-on-week solve counts and the goals hit/missed list (This week already shows the goals) fold under "Weekly details", closed by default.
- **"Continue today's practice":** one outline button beside Progress's tabs, on both tabs. Smart mode goes to `/practice`; a beginner goes straight into the current lesson, or Learn once the path is done (`continuePractice` in `src/features/progress/tabs.ts`). Progress looks back; this is the way back to doing.
- **Readable secondary text:** the lines that explain something on Progress went from 12px to 13px (`text-body-sm`): a topic's "why" and its score, Where you stand's reasons and group headings, a badge's hint and earned date, a goal's "to go", the level's XP line, the weekly review's date and headings, "Edit goals". Chart legends and the heatmap's month labels stay 12px.
- **Decision:** Beginner Overview keeps Your path's "Continue step N: …" link even though the new button goes to the same lesson: the link names the step, and it's the card's own way in.
- **Tests:** `goalMeter` (progress.test.ts), `continuePractice` (tabs.test.ts), the new labels (`LABELS.continuePractice`, `LABELS.weeklyDetails`).

### Part 6: colours and surfaces (2026-11-07)

- **Cards are mostly opaque:** `--glass` is 94% in both themes (Dark was 62%, Light 78%). The ambient glow no longer shows through behind text, so contrast inside a card is the contrast of its tokens. Row hovers and fills are unchanged.
- **Stronger secondary text, same tokens:** Mist (`--ink-muted`) and Dusk (`--ink-faint`) moved a step toward the ink. Dark: muted `#A1A1AA` → `#B4B4BC` (9.0:1 on raised), faint `#8B8B94` → `#9A9AA3` (6.7:1). Light: muted `#4F4F58` → `#45454D` (9.5:1), faint `#63636C` → `#5A5A63` (6.8:1). No new tokens. Help lines and hints that were Dusk now use Mist (field help in Welcome and Settings, the video-language note, the sheet's note and source line, the XP popover's empty line, the tour's shortcut line, Ctrl+K hints, shortcut-sheet group titles, the heatmap's month labels). Dusk stays for placeholders, dashes and "Unrated".
- **Checked:** `node scripts/check-contrast.mjs` (values updated; glass is now the 94% composite): every text, accent, state, platform and rank token is ≥ 4.5:1 on ground, raised, sunken and glass in both themes (lowest: Light warning on sunken, 4.73).
- **Neutral platform markers:** every small platform dot (Practice group headings and rows, Today's source line and rating card, mode chips, lesson problem rows, sheet rows, goal rows, the Topic panel's lists, LeetCode card, field labels in Welcome and Settings) is Dusk. The word beside it already names the site. CF Periwinkle and LeetCode Amber stay where two series must be told apart: the rating chart's lines and legend, and the Topic panel's CF/LC split bar.
- **No rank colour in the chart fill:** the rating chart's rank bands are a neutral zebra (alternate bands at 4% ink) with the rank names as labels. The dashed next-rank line keeps `--rank-next`, since it's rank progress.
- **Found in the screenshots, fixed here:**
  - The Level card's description ran past the card's right padding at 1100px: `CardHeader`'s title block had a fixed 16rem minimum width. It's now `min(16rem, 100%)`.
  - Beginner Progress → Your week was seven empty 24px circles before any practice (the same "empty rings" problem as the weekly goals): it's now a seven-segment horizontal meter with the day letters under it.
- **Decision:** the rating number, rank chip and rank progress keep the rank colour (CLAUDE.md reserves it for exactly those), and the platform tokens stay defined because the chart and the split bar use them.
- **Docs:** DESIGN.md has a new "Polish after an outside review (v1.4 polish)" section and the new Mist/Dusk values; CLAUDE.md's glossary line says Problems you tried.

### Part 7: check (2026-11-07)

- **Tests:** 451 pass (`npm test`, including the LF migration check and the strict typecheck). New in this part: `src/styles/surfaces.test.ts` (cards ≥ 90% opaque in both themes; platform colours used only by the rating chart and the Topic panel's split bar; no rank colour in the chart bands). It caught three Contests dots Part 6 had missed, now neutral. The other new words and pieces were covered as they landed: labels (glossary.test.ts: Problems you tried, Recommended next, View topic progress, Continue today's practice, Weekly details), top bar (topBarItems.test.ts, Part 2), path strip (`pathDots`, Part 3), Practice tags and Open labels (today.test.ts, problemText.test.ts), goal meters (progress.test.ts).
- **`npm run tauri dev`** (PowerShell): Vite up, the Rust side built in 28s and `algocompass.exe` launched. Stopped after the check; nothing was clicked in the real window (it holds the real database).
- **Screenshots:** 26 in `docs/audit-v1.4/polish/`, Light and Dark at 1100x700, browser mode (smart: Today, Practice ×2, Progress overview / goals / weekly details open, Topics, Contests, Learn; beginner preview: Today, Practice, Progress, Topics). Parts 1–3 said screenshots were here, but the folder didn't exist; these cover them too (top bar, Beginner Today's path strip).
- **Harness note:** after `emulateMedia` flips the colour scheme, headless Chromium sometimes kept painting text in the previous theme's colour (a Dark shot measured `#45454D` meta text, the Light value). The script forces a repaint after each flip; the app itself computes the right colour (checked with `getComputedStyle`).
- **Not done:** no release, no version bump, no merge to master.

## Done: the landing website (branch `website`, merged to master)

A static site in `website/` (plain HTML, CSS and JS, no build step), deployed to GitHub Pages by `.github/workflows/pages.yml`. No app code changed. Screenshots in `docs/screenshots/website/`.

### Part 1: the page (2026-10-25)

**Design plan** (frontend-design pass, then checked against the brief):
- **Colour:** the app's own v1.2 tokens, so the site and the app look like one product. Dark: ground `#0a0a0c`, raised `#131316`, ink `#f4f4f5`, mist `#a1a1aa`, indigo `#8b9bff` (+ `#b4beff`). Light: `#f6f6f7`, `#ffffff`, `#111114`, `#4f4f58`, indigo `#3a4bd0` (+ `#4654cc`). The Codeforces rank colours appear once, as the rank ladder in "Already practising?". Light/Dark follow the system; the toggle pins one, and picking what the system already shows un-pins it.
- **Type:** Chakra Petch 600 for display only (a 100px two-line headline at desktop, tight leading), Geist variable for everything read. Both self-hosted from the app's fontsource packages (latin subsets, 38 KB together), with metric-matched local fallbacks so the swap doesn't shift the layout. Sentence case everywhere, no eyebrow labels.
- **Layout:** left-aligned and editorial, one 1180px column. Hero: the headline across the width, the subhead and the download block side by side under it, then the real Today screenshot full-width, rising into place. Sections: stats + sheet marquee, two paths, a sticky feature showcase, how it works with a live mini-demo, install help, FAQ, a closing call, footer.
- **Principles:** real screenshots and real numbers only (5 sheets, 147 videos, 14 steps, 2 languages, 0 accounts); one memorable thing per section; motion answers scrolling or the cursor and pauses when it can't be seen.
- **What the review changed:** the first plan had an all-caps "New in 1.4" eyebrow, a `v1.4.0 · 4.3 MB · Windows` meta string and identical feature cards. Cut: no eyebrow; the meta line is a sentence ("Version 1.4.0, 4.3 MB. Free, for Windows 10 and 11."); features became the sticky showcase instead of a card grid, and the two path panels carry different content (a step list vs. checks and the rank ladder). Numbered markers only where the content is a sequence (how it works, the two install clicks).

**Decisions:**
- **Screenshots:** the brief says docs/screenshots, but those are v1.2/v1.3. The site uses the v1.4 captures in `docs/audit-v1.4/step2b` (and step2a for Contests), which show the released UI. `website/tools/images.mjs` turns them into WebP at 1100 and 640px, Light and Dark (14–59 KB each). The lesson captures came from the Debug preview sandbox and carry its "Preview: a fresh beginner profile" banner; the script cuts those 36 rows out and restores the plain background at the bottom, so every image stays 1100x700.
- **Themed images** use `<picture><source media="(prefers-color-scheme: light)">`, so the browser fetches only the right one. A manual pick rewrites the sources' `media`.
- **Download:** the markup links to `releases/latest` (works without JS, and is the fallback). `main.js` asks the GitHub API for the latest release, links the `*-setup.exe` asset and writes its version and size; the answer is cached in sessionStorage for an hour (the API allows 60 unauthenticated requests an hour per IP). Phones and tablets (an inline head script checks the user agent before first paint) get "AlgoCompass is a Windows app" with **Email me the link** (mailto with the site URL) and **Copy link** instead of a download. Mac and Linux desktops keep the button plus a "no Mac or Linux version yet" line.
- **CSP** in a meta tag: self only, plus `connect-src https://api.github.com`; the theme script is allowed by its sha256 hash (`website/tools/csp-hash.mjs` recomputes it). No inline style attributes, no third-party scripts, fonts or CDNs, no tracking.
- **The SmartScreen illustration** is drawn in HTML (two simplified dialogs: More info, then Run anyway, each target ringed with a cursor), not a screenshot, so it stays crisp and themes nothing it shouldn't: the dialog keeps Windows' blue in both themes.
- **JS:** one file, no libraries (about 4 KB gzipped).

**Motion** (all transform/opacity; `prefers-reduced-motion` turns off the tilt, magnet, glow drift, marquee, demo loop and count-ups and keeps plain fades):
- **Hero load:** the two headline lines slide up out of a clip (110ms apart), then the subhead and download block fade up, then the screenshot rises in from 80px below with an 18° backward tilt (1.3s ease-out).
- **Screenshot tilt:** follows the cursor over the hero, up to 6° sideways and 4° vertically, eased; mouse/trackpad only.
- **Ambient glow:** three blurred blobs (accent, light accent, deep indigo) behind the screenshot on 26/33/41s drift loops; paused off-screen.
- **Download button:** magnetic (moves up to 8px toward the cursor within 40px of it), presses to 0.97, and a shine band sweeps across once after the load sequence and again on hover.
- **Scroll reveals:** every section heading, lead, card and FAQ row fades up 24px when it enters, siblings 80ms apart; once per element.
- **Feature showcase:** the list on the left scrolls; whichever item crosses the middle of the screen lights its title and text, and the sticky frame on the right cross-fades to its screenshot (520ms, with a 1.5% settle). Six dots mark the position. On phones each screenshot sits under its text instead.
- **Mini-demo (how it works):** a drawn Today card loops through four states, in sync with the highlighted step: the card; the lesson video's progress bar fills; "Open on LeetCode" turns into "Solved"; the sheet row ticks, its progress bar steps forward and the streak rolls 6 → 7 like an odometer. Paused off-screen and in a background tab; reduced motion shows the finished state.
- **Count-ups:** 5, 147, 2, 0 count up from zero (ease-out, about 1–1.7s) when the stats scroll into view.
- **Marquee:** the five sheet names drift left (38s loop), pausing on hover and off-screen; reduced motion shows them as a wrapped list.
- **Nav:** gains a blurred background after the first 24px of scroll; a 2px ascent bar under it fills with scroll progress (CSS scroll-driven animation, where supported), echoing the app's rank-progress bar.
- **Theme toggle:** sun and moon swap with a turn; the page cross-fades through a View Transition (420ms), or a 400ms colour transition where that's unsupported.
- **Anchors:** smooth scrolling with room for the fixed nav; FAQ answers fade up as they open.

### Part 2: deploy to GitHub Pages (2026-10-25)

- `.github/workflows/pages.yml` publishes `website/` (without `website/tools/`) on every push to master that touches `website/**` or the workflow, plus a manual "Run workflow" button. It uses the official Pages actions at their current majors (checkout v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5).
- **One-time setup in GitHub:** Settings → Pages → Build and deployment → Source: **GitHub Actions**. Until that's set, the deploy step fails; after it, re-run the workflow (Actions → Deploy website → Run workflow).
- The site lives at `https://26bma038-lang.github.io/algocompass/`. Every path in the page is relative, so it works under `/algocompass/`; `404.html` uses absolute `/algocompass/` paths because Pages serves it for any missing URL.
- **Decision:** no build step. The site is hand-written static files, so the workflow only copies them; images, the OG card and favicons are generated locally by the scripts in `website/tools/` and committed.

### Part 3: critique, polish and Lighthouse (2026-10-25)

**Impeccable critique** (⚠️ degraded: single-context, because this task asked for no background agents and the harness's sub-agents only run in the background; the browser overlay step was skipped for the same budget, and its role was covered by Playwright screenshots of every section at 1440x900 and 390x844 in both themes). Detector: 29 findings on `index.html`.
- **Fixed:** corner radii brought onto DESIGN.md's scale (6, 8, 12, 16, 22, pill; buttons 8, the screenshots 16, the big panels 22). The feature showcase lost its 2px coloured left rail (the craft floor bans coloured side borders on list items): the active item now lights its title (faint → ink) and text, and the dots under the screenshot carry the position. Rank ladder labels went from 11px to 12px. The showcase items are 52vh instead of 62vh, so the section scrolls less. The heading "Five screens, each with one job" became "Every screen has one job" (the list has six items: a lesson isn't a screen).
- **Suppressed** (`.impeccable/config.json`, with reasons): the metric-matched fallback faces ("Geist Fallback", "Chakra Fallback") flagged as off-system fonts; `dark-glow` on `index.html` (the primary button's hover glow is DESIGN.md's Aura, and the brief asks for the ambient glow) and on `tools/og.html`.
- **Left standing (false positives or pinned by the brief):** `design-system-color` for the v1.2 Light/Dark tokens (DESIGN.md's frontmatter still lists the original navy palette; the site uses the v1.2 values from `src/styles/globals.css`, which DESIGN.md's "Light and Dark (v1.2)" section defines); `overused-font: geist` and `marquee` (both in the brief); `cramped-padding` on the stats row, the FAQ list and the demo's title bar (each is a hairline rule above padded content, not text against a box edge).

**Lighthouse 13** (`node website/tools/lighthouse.mjs`, local server with gzip and the github.io path layout):

| | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Mobile | 100 | 100 | 100 | 100 |
| Desktop | 98 | 100 | 100 | 100 |

Mobile LCP 1.7 s, desktop 1.1 s; CLS 0 on both; TBT 0–10 ms. The remaining hints are GitHub Pages' fixed 10-minute cache and an estimated 51–122 KB from serving the 1100px screenshot where a slightly smaller one would do.
- **Fixed on the way:** SEO was 92 because Lighthouse's robots.txt fetch runs inside the page and the CSP's `connect-src` didn't include `'self'`; it does now. The first tool version ran Lighthouse synchronously, which froze the in-process server it was testing; it's async now.

**Screenshots:** `docs/screenshots/website/`: the first screen (`desktop-dark.png`, `phone-light.png`, …), one per section (`-paths`, `-features`, `-how`, `-install`, `-faq`) and the full page as JPEG (`-full.jpg`), for desktop and phone in Light and Dark. `node website/tools/screens.mjs` regenerates them (the GitHub API is stubbed with the v1.4.0 release so they don't depend on the network).

### Part 4: ship (2026-10-25)

- README: the website link at the top and beside Download, and `website/` in the project structure. CLAUDE.md's folder layout lists `website/` too. The repo's homepage is set to the site (`gh repo edit --homepage`).
- `website` merged into master and pushed. No app release: the app is unchanged.
- **To go live:** GitHub → the repo's Settings → Pages → Build and deployment → Source: **GitHub Actions**. Then Actions → **Deploy website** → **Run workflow** (the run triggered by this push fails until Pages is on). The site: https://26bma038-lang.github.io/algocompass/

## In progress: v1.4 step 2b, no empty or overloaded screens (branch `v1.4`)

Not released. Plan: `docs/audit-v1.4/AUDIT.md`; screenshots in `docs/audit-v1.4/step2b/`.

### Part 0: fixes from the step 2a review (2026-10-25)

- **Nothing under the lesson's flow bar.** The bar no longer floats over the page (`sticky`): it portals into a footer strip the shell keeps under the scroll area (`src/components/shell/footerSlot.ts`, empty and hidden on every other screen). The page scrolls *above* the bar, so no button, problem row or text can sit behind it, at any window size, in either theme. "Got it" moved into the How-to-solve guide's header row, so it's in view whenever the guide's top is (at 1100x700 the bottom of a six-step guide used to land under the bar).
- **A beginner's goals match day one.** Before Step 1 is done, "Solve any 2 problems today" becomes **Finish today's lesson step** (a new `lesson_step` goal, +25 XP, counted from the Beginner Path steps recorded today), and the path's sheet goal reads **Solve 1 problem from your lesson**. After Step 1 it's the usual consistency goal. Smart-mode goals are unchanged. A day whose goals were made before this (or before onboarding said "beginner") is fixed on the next read; a goal already done stays earned.
- **Checked:** a browser-mode script walks a fresh beginner to Step 1's Solve part and, at the landing spot and at six scroll positions, lists every visible element in the scroll area that overlaps the bar's box: none, at 1100x700 (Light and Dark) and 1440x900. Engine tests for the new goals (`quests.test.ts`).
- **Decisions:** a footer slot instead of more bottom padding: padding only helps at the very end of the page, and any scroll position in between could still put a row under a floating bar. The lesson-step goal counts *recorded* steps, so the path watcher now refreshes today's goals when it records one.

### Part 1: Learn (2026-10-25)

- **Beginner Learn is short:** Continue learning, the Beginner Path roadmap (open), then the video library **folded** ("Browse all videos (147)"). The page is 1,105px tall at 1100x700 (the audit measured about 6,900px). Opened, the library is grouped by the **14 path steps** ("Step 1: Basics", with Open the lesson), each step holding its lesson videos and the videos of the topics it's the first to teach; the 19 topics the path never covers sit under a folded **More topics**. A search or a topic filter (`?topic=`, which also unfolds it) shows topics instead.
- **Smart Learn:** Continue learning, then the library by topic, weakest first (the 8 weakest shown, "Show all 33 topics"), then the roadmap folded at the bottom.
- **Every video once** (`buildLibrary`): a lesson video goes under its step's main topic (or the step topic the catalog files it under), and a catalog video listed under two topics under the first. The real library has 147 videos and 147 rows. Each group shows 4 videos, then "Show all N".
- **Blank thumbnail fixed:** every thumbnail exists on YouTube (all 147 checked); the audit's grey tiles were lazy images not loaded yet when the screenshot ran. Thumbnails now sit on a faint play glyph until they load, fall back to the other size on an error, and keep the glyph if both fail (`Thumb` in `VideoPlayer.tsx`), so a tile never reads as empty.
- **Plain words:** topics with a Codeforces-tag name get a plain one from the glossary (`TOPIC_PLAIN`: "Coding basics (implementation)", "Try everything (brute force)", "Build-the-answer problems (constructive)", "Interactive problems", "Range queries (data structures)"); the tag stays in brackets, so searching it still works. "Topic details" is now **How strong am I at this?**, shown only once there's solve history (it opens the Topic panel over Learn).
- **Tests:** `learn.test.ts`: no duplicates in the real library, the filing rules, and the step grouping (14 steps, every video once, Sliding Window adds only its own lesson videos).
- **Decisions:** step groups take a topic's catalog videos at the *first* step that teaches it (Arrays gets the hashing videos, Hashing only its lesson's), so nothing repeats. The beginner library folds "More topics" too, so opening the library stays at about 4,100px instead of 7,300px.

### Part 2: Practice (2026-10-25)

- **Beginner Practice** (`/practice`, no tabs): **Problems from your lessons**, every problem of the steps reached (done steps folded, the current one open), in path order, with tick boxes and difficulty in words. The next problem (the current step's first unsolved required one) sits on a sunken fill with the page's one primary **Open**. A dashed line says later steps' problems join as you reach them; locked steps never show. Below it, a quiet 8-column card, **Follow a popular sheet**: the five sheets smallest first (problem counts from the sheet files), each opening its page, and "See all sheets, with your progress". Sheets are never locked. On the sheet list a beginner gets "‹ Problems from your lessons" back.
- **Smart Practice:** two tabs, **Today's problems** (`/practice`, still lit on `/practice/mix`) · **Sheets** (lit on every sheet page). Today's problems: the five, with the first unsolved row's Open filled (the one primary button); **Skip / Too easy / Too hard / I solved it** moved into a **⋯** menu per row (shadcn dropdown on the Float plane, each item with one line on what it does). Then **Unfinished problems** full width in two columns, only when there are any, and **More by topic**, folded, its header naming the first three weak topics.
- **Opening a sheet** no longer dumps hundreds of rows: **Next in this sheet** leads, full width under the title; sections stay folded except the next one's; and a long section (A2Z's first step has 60) opens on a 12-row window starting two rows above the next problem, with "Show the N problems above" / "Show all 60 problems in this step". Filters, **I've already done some** (was Mark sections done) and the LeetCode note fold under **Options**; active filters keep Options open so nothing is filtered out of sight. A2Z's page is 2,800px for a fresh beginner, Next and the first rows above the fold.
- **Shared pieces:** `LessonProblemRow` (the lesson's Solve part and Practice use the same row), `sectionWindow` and `lessonProblems` (pure, tested), `practiceTabs` / `tabActive` (tested), `src/components/ui/dropdown-menu.tsx`. Topic chips use the plain topic names too.
- **Decisions:** beginners get no tab row at all rather than a "Lessons · Sheets" pair, so the sheets really are secondary (the audit's "no tabs before step 5"); the step-5 unlock isn't built, because you asked for sheets to stay available. The sheet card sorts by size, a fact from the data, instead of the audit's "about 4 weeks" estimates, which would be made-up numbers. "Learn on LeetCode / Sharpen on Codeforces" became "Learn on LeetCode / Practise on Codeforces" (the audit's plain-words table).

### Part 3: Progress, two tabs (2026-10-25)

- **Two tabs: Overview · Topics.** Badges open from Overview (`/progress/badges`, under the Overview tab, with "‹ Overview"); the Skill Tree opens from Topics (`/progress/topics/map`, "Show as map" / "‹ Show as list", lazy so @xyflow only loads there). Old routes redirect: `/progress/achievements` and `/achievements` → `/progress/badges`, `/skill-tree` → `/progress/topics/map`; `/progress/topics` is the list; `/topics/:id` still opens the Topic panel (now over the list).
- **Beginner Overview** (never empty, no account needed): **Your path** ("Step 1 of 14", steps done and lesson problems solved, the strip, "Continue step 1: Basics →"), **Your week** (seven dots, Monday first, lit on days with any solve, hand tick, lesson video or finished step; "Nothing yet this week…" until then), **Badges** (the three latest, or before any the three closest to earning, "See all 31").
- **Smart Overview:** rating chart, weekly goals and activity on the left; level, weekly review, **Badges** and LeetCode on the right; Where you stand full width.
- **Topics, a list first:** every topic you've tried, weakest first, in plain words (Weak · Getting there · Strong · Mastered, the score as "8/100" in small type, a bar), each with why it's there (Where you stand's reason, else "12 solved, up to Codeforces difficulty 1300") and a Watch link to its videos; then **Topics you haven't tried**. Clicking a row opens the Topic panel. Before any solve history (a beginner without an account, or smart before the first update) it lists **Topics in the Beginner Path**, each Done / Learning now / Started / Later step, with links to the steps that teach it.
- **Achievements are Badges** everywhere a user reads it: the page, Ctrl+K, the tour, the toasts ("Badge earned: Kindling") and Windows notifications. The glossary scan now fails on "Achievements" / "Achievement unlocked", "Mark sections done" and "Topic details".
- **Rules as data, tested:** `src/engine/progress.ts` (`topicRows`, `pathTopics`, `weekDays`, `badgesToShow`), `PROGRESS_TABS` with `tabActive`, the new routes and redirects in `router.test.ts`, the legacy map in `nav.test.ts`. `useYourWeek` (`src/data/progress.ts`) reads the week from SQLite.
- **Decisions:** the badges page keeps its route rather than becoming a pure redirect, because Overview's "See all" needs somewhere to go; `/progress/achievements` is what redirects. The LeetCode card stays on smart Overview (you didn't list it, but removing it would hide data step 2a just moved there). The badges page shows every badge with what earns it even before any history, instead of "Nothing unlocked yet".

### Part 4: check (2026-10-25)

- **A beginner in the real Tauri window** (Debug → Preview a fresh beginner: separate wiped DB, in-memory settings), 1100x700, Light and Dark, each preview exited at the end. Today (goals: Finish today's lesson step, Solve 1 problem from your lesson) → Watch the video → I've watched → I've read it → the How-to-solve guide (Got it at y 297, the bar starts at 622) → Got it → three problems ticked by hand (the script never pressed Open, so no browser tab opened on your machine) → "Step 1 done" and Next step: Arrays → Today shows Step 2 and **2/2 goals** → Learn (1,104px; 4,115px with the library open) → Practice (lesson problems, Step 1 folded as done, Step 2 open with its first problem's Open filled; the sheet card) → A2Z (2,796px) → Progress (Step 2 of 14, Sunday lit, "1 day practised, 3 problems solved", First Goal earned plus the next two) → Topics (the path's topics) → Badges.
- **The flow bar check**, in that walk: at the Watch landing, the Solve landing and five scroll positions, the number of visible elements in the scroll area that overlap the bar's box was **0** every time, in both themes (the scroll area ends at 610, the bar starts at 622).
- **Smart, with your real data** (screenshots only; the theme switched by attribute, not saved; the ⋯ menu opened and closed with Esc): Today, Learn (2,147px), Today's problems (1,041px) with the menu open, NeetCode 150, Overview (three scroll positions), the Topics list, the map, and `/progress/achievements` redirecting to `/progress/badges`.
- **Fixed during the check:** the lesson video now sizes against `100vh - 410px` (was 380) so its title and "Main video, NeetCode, 15 min" clear the bar now that the scroll area ends above it; the Badges card fills its three tiles with the next badges to earn when fewer than three are earned; the ⋯ menu loads lazily (`RowMenu.tsx`), because the Topic panel puts `ProblemRow` in the main chunk and the dropdown had added 42 KB to it. Main chunk: 515 KB (512 KB after step 2a; its 500 KB warning was there before).
- **Tests:** `npm test` 436 pass (new: beginner goals, library dedupe and step grouping, lesson problems, section windows, Practice tabs per mode, Progress tabs, the topic list, path topics, week dots, badges, routes and redirects). `npm run build` passes. `npm run tauri dev` built Rust in 52s and ran the whole check; it was stopped afterwards.
- **Not run:** the impeccable critique pass (no agents, usage limits). DESIGN.md has a new "No empty or overloaded screens (v1.4 step 2b)" section by hand, and CLAUDE.md's screen table matches the new structure.
- **Still open:** at 1100x700 the Topics map page scrolls a little (the canvas keeps its 440px minimum under the tab row and the "Show as list" row; it scrolled under the old tab row too). Settings, Contests' first-visit note and the beginner milestone table (sheets at step 5, level at step 3) are later parts of the plan.

**Screenshots** (`docs/audit-v1.4/step2b/`, each `-light` and `-dark`): beginner `b01-today`, `b02-lesson-watch`, `b03-solve-guide`, `b04-solve`, `b04-solve-bottom`, `b05-step-done`, `b06-today-after-step`, `b07-learn`, `b07-learn-2`, `b08-learn-library`, `b09-practice`, `b09-practice-2`, `b10-sheet-a2z`, `b11-progress`, `b12-progress-topics`, `b13-progress-badges`; smart `s01-today`, `s02-learn`, `s02-learn-2`, `s03-practice`, `s03-practice-menu`, `s03-practice-2`, `s04-sheet-neetcode`, `s05-progress`, `s05-progress-2`, `s05-progress-3`, `s06-progress-topics`, `s07-progress-map`, `s08-progress-badges`.

## Previous: v1.4 step 2a, a beginner's first 5 minutes (branch `v1.4`)

Not released. The plan is `docs/audit-v1.4/AUDIT.md`; screenshots are in `docs/audit-v1.4/step2a/`.

### Part 0: Codeforces empty answers, Suggested-for-you video (2026-10-25)

- **CF empty answers are retried.** Codeforces sometimes answers OK with an empty list. A first `user.status` that's empty for someone with rated rounds is now an error (nothing saved, so the next update fetches the whole history again), and an empty `contest.status` for a rated round is skipped and retried instead of saving "Solved –" forever. Rated rounds already saved without your solves are looked up again.
- **"Suggested for you" plays the topic's own video.** Lesson videos only count for the topic their step is mainly about, so Implementation no longer suggests Step 1's Big-O video (`suggestVideo` in `src/engine/learn.ts`).
- **Checked:** `npm test` 389 pass. Real Tauri window with your data (backup first: `algocompass.db.bak-v1.4` plus its `-wal`/`-shm`, and `settings.json.bak-v1.4`): an update finished with every step ok, Today's Codeforces card shows **Solved 73**, and all 9 past rounds have solve counts. Your DB had 122 CF submissions before and after, so the "Solved 0" in the audit was the browser run's empty answer, which this now retries. Screenshot: `after-part0-real-smart-today.png`.
- **Decision:** a rated round whose `contest.status` stays empty is retried on every update (the results step shows an error). That's honest; the alternative, guessing "0 solved", would be a fabricated number.

### Part 1: plain language everywhere (2026-10-25)

- **One glossary:** `src/lib/glossary.ts` holds the labels (`LABELS`), the explained terms (`TERMS`) and the retired names (`RETIRED`). Screens, Ctrl+K, the shortcut sheet, the tray, toasts and notifications read from it.
- **Renamed:** quests → **Today's goals** (and "Goal complete" notifications, the "First Goal" badge), Today's mix → **Today's problems** ("New mix" → "New set"), Upsolve → **Unfinished problems**, Sync → **Update** ("Update now", "Updated 5m ago", "after the first update"; the tray says "Update now" and "Goals 1/3"), blind spots → **Topics you haven't tried** ("Not tried yet" on the map's filter and nodes), Topics map → **Topics**. Quest titles say "of difficulty 1100+" instead of "rated 1100+". Handles are "usernames" in the nav hints.
- **Terms explained:** `<Term>` (`src/components/Term.tsx`) is a dotted underline with a one-line tooltip from the glossary: XP (Level card), Level, Strength (Where you stand, the Topic panel), Div. 2 (every contest name on Contests, via `ContestName`). Rating and difficulty are explained where Today shows them (Part 5).
- **Test:** `src/lib/glossary.test.ts` scans every user-facing string (string literals and JSX text in `src/`, plus the tray in `lib.rs`) and fails on a retired name. Code identifiers (`useTodayQuests`, `"syncing"`) and the hidden Debug page don't count.
- **Decisions:** terms get a tooltip every time rather than a one-time hint: it's the same help on every screen, and there's no extra "seen" state to keep. Search keywords keep the old words (typing "sync" or "mix" in Ctrl+K still finds Update now and Today's problems). Engine and table names (`quests`, `upsolve`) are unchanged.

### Part 2: one sidebar (2026-10-25)

- **Both modes:** Today · Learn · Practice · Progress · Contests, Settings at the bottom; Ctrl+1–5 follow it (`navFor`). In smart mode Learn moved up, so Ctrl+2 and Ctrl+3 swapped once. Beginners still get Contests at step 9 (Recursion), with the New badge, on Ctrl+5. The tray lists the screens in the same order (a test compares `lib.rs` with `navFor`).
- **Tour v4** (`TOUR_VERSION` 4): smart mode sees it again, in sidebar order (Today → Learn → Practice → Sheets → Progress → Contests); the Learn tip says it moved above Practice.
- **Decision:** beginners get no tour. Onboarding now drops them straight into Step 1 (Part 3), and every tip would walk them away from it; the sidebar already has labels and a one-line hint per item. The audit's single coach mark can come later.

### Part 3: onboarding (2026-10-25)

- **Beginners are asked two things:** "New to DSA?" → Yes, then "Lesson videos in English / Hindi". No LeetCode or Codeforces fields at all. **Start lesson 1** (a new 44px `lg` button size) saves the mode and language and opens Step 1's lesson directly (`/learn/path/basics`), not Today. Beside it: "No account needed. You can change this later in Settings."
- **Above the fold:** the welcome screen is shorter (the compass mark sits in the title row, one line of intro, shorter choice cards). At 1100x700 the button's bottom edge is at 580px, even with the preview banner showing.
- **Smart users:** unchanged: language, Codeforces username (required), LeetCode (optional), the handle check and the first update with its step list.
- **The rules are data** (`src/features/onboarding/flow.ts`: fields per mode, validation, button label, landing path), tested in `flow.test.ts`.
- **Decision:** a beginner who typed a username before switching from "No" to "Yes" gets nothing saved: the beginner form has no fields, so nothing hidden is submitted.

### Part 4: top bar (2026-10-25)

- **Beginners:** **Search** (with its word) and **Step X of 14** (opens the current lesson; "All 14 steps done" at the end). No Update control, no goals chip, no flame, no "Lv –". After Step 3 (`STATUS_UNLOCK_STEPS` in `src/engine/learn.ts`, next to the contests milestone) the streak and level join, each with words: "3 days", "Level 2". XP keeps accruing before that, so nothing is lost.
- **Smart:** the same controls, each with a word or a clear tooltip: search (tooltip "Search screens, topics and lessons · Ctrl K"), "Updated 1m ago", "Goals 0/4", "No streak" / "3 days", "Level 14" (the plate's "Lv" is now "Level"; before any XP it says "No level yet"). The streak and level tooltips explain the terms from the glossary.
- **Rules as data:** `src/components/shell/topBarItems.ts` (which items per mode and step, and every label), tested in `topBarItems.test.ts`.
- **Decision:** a beginner without an account has no synced activity, so after Step 3 the streak chip stays hidden rather than showing "No streak yet" forever; it appears with their first update. Counting hand ticks toward the streak would change the streak engine for everyone, so it waits for a later step.

### Part 5: Today, one "do this next" (2026-10-25)

- **Beginner Today:** two cards. **Do this next** (7 columns): "Step 1 of 14: Basics", its subtitle, the 14-segment strip, one line on what's involved, and one big button with the exact next action: **Watch the video (15 min)** → **Read the lesson** → **Solve problem 2 of 3: Running Sum**. It opens the lesson scrolled to that part (Read or Solve). Beside it, **Today's goals** in plain words, with no streak line. Gone: the "See all 14 steps" link, the followed-sheet card and the "Let your solves tick themselves" card (connecting LeetCode now happens inside the lesson, Part 6). Nothing on it says "after the first update".
- **Smart Today:** three cards, all visible at 1100x700. **Do this next**: the first unsolved of today's problems ("Codeforces · difficulty 1100 · Sorting", why it was picked, **Open on Codeforces**, "I solved it" for LeetCode ones, the run meter "0 of 5 done today · All in Practice"); once those are done, the followed sheet's next problem. **Today's goals** (the streak is in the top bar only). A compact **Codeforces rating** card: rating, rank chip and progress to the next rank, "73 solved · 8 rated rounds · last change +29", and the next round.
- **Moved:** Activity, LeetCode and Where you stand to Progress → Overview (Where you stand full width, its three groups side by side). Removed from Today: today's problem list (it's the Practice tab), Work on next (it repeated the same problems as the list: the duplicate the audit found; Practice's By topic has them), Later contests (they're on Contests), the followed sheet card (Practice → Sheets; its next problem feeds Do this next).
- **Ctrl+K:** beginners get **Continue my lesson** first; **Update now** only appears once there's an account, and Today's problems is hidden for a beginner without one.
- **Rules as data:** `todayLessonAction` (`src/engine/learn.ts`) and `pickDoThisNext` (`src/engine/today.ts`), tested. `WorkOnNext.tsx` and the unused `ContestStrip` component are deleted; `LcCard` and `RunMeter` moved to their own files.

### Part 6: "How to solve on LeetCode" (2026-10-25)

- **The guide** (audit problem #1): a beginner's first Solve part opens with a step-by-step panel above the problems: 1 make a free LeetCode account (with a Sign up link) → 2 read the problem → 3 write your code (pick C++, Java or Python) → 4 press Run → 5 press Submit, green "Accepted" means solved → 6 come back and tick it, or connect your username. It's there by the time the flow bar's "Open problem 1 of 3" is pressed (that scrolls to Solve). **Got it** dismisses it for good (setting `solveGuideSeen`); **How to solve on LeetCode** in the Solve header reopens it, in either mode.
- **Connect inline:** under the problems, "Connect LeetCode to tick automatically" with a username field and **Update**: it checks the username on LeetCode, saves it and runs an update. Once connected, a beginner (who has no Update in the top bar) keeps an Update button here: "Problems you solve as *name* on LeetCode tick themselves when you update."
- **Steps, not problems:** the Beginner Path's progress reads "Step X of 14" everywhere (Learn's roadmap pill, the sheet list row and followed card, the sheet page header), never "7/59". The Solve pill says "0 of 3 solved", and extra Codeforces problems say "difficulty 800" with the tooltip.
- **Rules as data:** `src/features/learn/solveGuide.ts` (the steps, when the guide is open, the connect state), tested.
- **Decisions:** the guide panel sits above the problem list and the Connect row below it, so the problems stay the main thing once the guide is dismissed. The path counts in steps in smart mode too: one number in both places (the audit's double count, problem 7).

### Part 7: check (2026-10-25)

- **A beginner's first five minutes, in the real Tauri window** (Debug → Preview first launch, then Preview a fresh beginner; separate wiped DB, in-memory settings), 1100x700, Light and Dark. Welcome → "Yes, I'm new" → English → **Start lesson 1** (bottom edge at 580px of 700) → Step 1's lesson → I've watched the video → I've read it → the How-to-solve guide is open above the problems → Got it → three problems ticked by hand (the script never pressed Open, so no browser tab opened on your machine) → "Step 1 done" toast and **Next step: Arrays** → Today shows "Do this next: Step 2 of 14: Arrays, Watch the video (12 min)" and today's goals 2/2 → Practice → Sheets lists the Beginner Path as "Step 2 of 14, 1 step done" → Ctrl+K leads with Continue my lesson. Each preview was exited at the end.
- **Smart, with your real data** (only screenshots; the theme was switched by attribute, not saved): Today's three cards fit at 1100x700; Progress → Overview now has two independent columns (the first layout left a 400px hole under This week, fixed) with Activity, LeetCode and Where you stand; Practice says Today's problems / New set; Contests explains Div. 2.
- **Tests:** `npm test` 411 pass (glossary scan, onboarding flow, top bar per mode and unlock, Do this next for both modes, the solve guide, tour v4, tray order). `npm run build` passes (main chunk 512 KB; its 500 KB warning was there before). `npm run tauri dev` rebuilt Rust after each tray change and ran the whole session.
- **Not run:** the impeccable critique pass (you're usage-limited and asked for no agents; DESIGN.md got a "Plain words and one next action (v1.4)" section by hand).
- **Still open (later parts of the plan, not step 2a):** a beginner's Progress is still "Your progress starts after the first update" (`after-b09-progress-*`); Practice keeps its mode-specific tab order; Settings, the Learn library and the Topics list are unchanged.

**After screenshots** (`docs/audit-v1.4/step2a/`, each in `-light` and `-dark`): `after-b00-fresh-beginner-today`, `after-b01-welcome`, `after-b02-lesson-watch`, `after-b03-solve-guide`, `after-b04-solve`, `after-b05-step-done`, `after-b06-today`, `after-b07-practice-sheets`, `after-b08-ctrlk`, `after-b09-progress`, `after-s01-today`, `after-s02-progress` (`-2`, `-3` scrolled), `after-s03-practice`, `after-s04-contests`, `after-s05-learn`; plus `after-part0-real-smart-today.png`. The "before" set is the audit's `b…`/`s…` screenshots in `docs/audit-v1.4/` and the two `before-*` files here.

## Previous: v1.3, Sheets + Beginner Path + video lessons (branch `v1.3`, released as v1.3.0/v1.3.1)

### v1.3 Learn: a top-level screen for every lesson (2026-10-18)

**Why:** you couldn't find where to watch the lectures. In smart mode the Beginner Path tab didn't show at all, and topic videos were hidden in the Topic Detail side panel.

**Summary**
- **Learn** is a new top-level screen (`/learn`, lazy), in the sidebar in both modes:
  - **Smart mode:** Today · Practice · **Learn** · Progress · Contests.
  - **Beginner mode:** Today · **Learn** · Practice · Progress. **Contests** stays hidden until the Recursion step (step 9) is done. Then it appears with a **New** badge, and a toast says "You're ready for contests". The badge clears the first time you open Contests.
  - Ctrl+1–5 follow the sidebar order in each mode. The shortcut sheet, Ctrl+K, the tour and the tray menu were all updated.
- **What's on Learn**, top to bottom:
  1. **Continue learning:** your current lesson or last video, with its progress, and one button to resume.
  2. **The Beginner Path roadmap:** 14 steps, marked done, current or locked. It moved here from Practice.
  3. **The video library:** 147 videos across 33 topics (lessons plus `resources.json`), grouped by topic. It has an English / Hindi / Both filter, Not watched yet, a topic picker, lengths, channels and ✓ Watched. In smart mode your weak topics come first.
  4. **Search** across topic names, video titles and channels.
- **Lesson focus mode** (`/learn/path/:step`):
  - A breadcrumb (Learn › Beginner Path › Step N) with Back.
  - A big video sized to the window, then Read and Solve.
  - A sticky bar with Watch → Read → Solve checkmarks and **one Next button**: I've watched the video → I've read it → Open problem 1 of 3: … → I solved … → … → **Next step: Arrays**.
- **A single-video page** (`/learn/watch/:id`) plays the video big, with the topic's other videos below.
- **Links into Learn:**
  - Today's Start here opens the lesson directly.
  - Topic Detail has a two-video preview and a **Watch lessons** button.
  - Every sheet section has **Learn this topic**.
  - In Ctrl+K, typing a topic offers **Watch (topic) videos**.
  - The tour is v3, and beginners meet Learn first.
- **Old routes still work:** `/practice/path` → `/learn` and `/practice/path/:step` → `/learn/path/:step`. In Beginner mode Practice is now Sheets · Today's mix.

**Checked**
- **`npm test`:** 384 pass (22 new):
  - `engine/learn.test.ts`: library build and dedupe, ordering per mode, filters and search, continue learning, the contests milestone, the Next flow;
  - `components/shell/nav.test.ts`: nav per mode, shortcuts, the New badge, redirects, tour v3;
  - `router.test.ts`: the new routes and redirects matched against the real route table;
  - `data/learn.test.ts`: continue-learning history that survives a restart.
- **Build:** `npm run build` is green, and Learn, Lesson and Watch are their own lazy chunks. The main chunk grew 1.2 KB (its 500 KB warning was already there before this work). `cargo check` passes after the tray change.
- **The beginner's first day, walked in the "Preview a fresh beginner" sandbox** (browser mode, Light and Dark, 1100x700). Today showed one primary button, Start the lesson. It opened Step 1, and Next walked the whole lesson: watched → read → Open Fizz Buzz (LeetCode opened) → I solved Fizz Buzz → … ×3 → Next step: Arrays. Back returned to Step 1, and Learn's Continue learning showed Step 2. No decisions and no dead ends, once two were fixed (below).
- **First launch as a beginner** (Preview first launch): "Yes, I'm new" → Start learning → the tour goes Learn → Practice → Progress → Today and ends on Start here.
- **The contests milestone, end to end:** I finished steps 1–9 through the Next button. After step 8 the sidebar had no Contests. After step 9 it read "Contests New", and the toast said "You're ready for contests: Contests is now in the sidebar". Ctrl+5 opened Contests and cleared the badge. Collapsed, the badge is a dot on the icon.
- **`npm run tauri dev` (the real window, your real data):** Rust built in 1m 24s. Smart mode showed Today · Practice · Learn · Progress · Contests, the six-step tour v3, and Learn with Continue learning suggesting your weakest topic. I only took screenshots and didn't dismiss the tour, so nothing in your settings changed.
- **Smart mode, with a real sync of your handles** (browser mode, not your desktop data):
  - Learn is one click from the sidebar (or Ctrl+3).
  - Continue learning suggests a video from your weakest topic (Two pointers & sliding window).
  - The library leads with Two pointers, Prefix sums, Stacks & queues…
  - Playing a video makes it the thing Continue learning resumes.
  - Ctrl+K "binary search" offers Binary search, then Watch Binary search videos. Both that and Topic Detail → Watch lessons land on `/learn?topic=binary-search`.
  - NeetCode 150 has 18 "Learn this topic" links.
  - `/practice/path/hashing` redirects to `/learn/path/hashing`.

**Fixed after the walk-through and the critique**
- **P0:** the "Step 1 done" toast sat right on top of the sticky Next button, so "Next step" couldn't be clicked for about 4 seconds. On lesson pages, toasts now sit above the bar.
- **P1:** a beginner's tour ended on Progress, away from Start here. It now ends on Today.
- **P1:** at 1100x700 the lesson video's title and Mark as watched sat under the Next bar. The header is tighter, and the video is sized to the window.
- **P2:** the library toolbar wrapped the topic picker onto its own row at 1100px. It's one row now.
- **Also:** a new screen now opens scrolled to the top. Going from a lesson to the next one used to start halfway down the page.

**Impeccable critique** (one pass; **degraded: single context**, because you asked for no background agents):
- **Covered:** Learn, the lesson page, the watch page and the sidebar in both modes, Light and Dark at 1100x700.
- **Score:** 32/40 (Good).
- **Detector:** 0 findings on the new UI files.
- **Open, P3:** when two steps finish within seconds, the two stacked toasts can cover a Solve row's Open button. In real use steps finish far apart.
- Questions skipped: you asked for no questions.

**Screenshots:** 34 in `docs/screenshots/v1.3/learn/`:
- Today and Learn in Beginner mode;
- a lesson at start, read, solve and done;
- Learn and the library in smart mode;
- the watch page and the topic filter;
- Contests unlocked (expanded and collapsed);
- the tour (beginner and smart);
- Ctrl+K, Topic Detail → Watch lessons, a sheet's Learn this topic, and the shortcut sheet.

**Decisions (Learn)**
- **Shortcuts follow the sidebar,** so Learn is Ctrl+2 for beginners and Ctrl+3 in smart mode. That way Ctrl+N always matches the Nth item you see. In Beginner mode Ctrl+5 does nothing until Contests appears.
- **Contests stays reachable** in Beginner mode by URL and from the tray. Only the sidebar hides it. The tray menu is static (built in Rust), so it lists all five screens in smart order; making it follow the mode would need a new IPC call for little gain.
- **The New badge** is stored as the setting `contestsSeen`. It's set the first time `/contests` opens after the milestone, from anywhere.
- **The milestone is "Recursion done"** using the path's own rule: main video watched and the 3 required problems solved. Recorded steps never re-lock, so Contests never disappears again.
- **A single-video page** (`/learn/watch/:id`) wasn't asked for. Continue learning needed somewhere to resume a video in one click, and a big player there matches the lesson page. Picking a video there starts it playing; lesson videos still wait for a click, so nothing loads from YouTube until you ask.
- **Continue learning** resumes whichever is more recent, the last lesson or the last video. A finished lesson resumes at the current step instead. With no history:
  - Beginner mode starts Step 1.
  - Smart mode suggests the first unwatched video (in your language) from your weakest topic.
  - Smart mode without topic data falls back to the path.
- **History is a setting, not SQLite** (`learn`: last lesson, last video, lessons read). That needed no migration, and a Debug preview keeps it in memory.
- **Read now has a record:** "I've read it" adds the step to `learn.read`, which gives Read its checkmark. Unlocking is unchanged (main video watched + required problems solved).
- **"I've watched the video"** marks the main video in your current language, the same as Mark as watched. **"I solved …"** is a hand tick, exactly like the tick box (it also writes `manual_solves`). Problems that a sync has already ticked are skipped.
- **The library's language filter** is English / Hindi / Both. It defaults to your lesson language but doesn't change it. Settings and the lesson's toggle still own that pref.
- **The roadmap is open in Beginner mode and folded in smart mode,** so the library sits near the fold for smart users. The breadcrumb's "Beginner Path" (`/learn#path`) opens it.
- **Library topics:** lesson videos join every topic their step teaches (Basics shows under Implementation and Math). A video listed by both a lesson and `resources.json` appears once per topic, as the lesson. Beginner mode orders topics by step, then the step's own topic order.
- **Topic Detail** previews 2 videos in your language. The old "Also in Hindi" toggle gave way to **Watch lessons**, because Learn shows both languages.
- **"Learn this topic"** uses the section's most common lead topic (the same rule as the row chips). It only shows when that topic has videos, and it sits beside the section toggle, not inside it.
- **Beginner mode's Practice** is now Sheets · Today's mix, and `/practice` lands on Sheets, since the lessons moved to Learn.
- **Tour v3:**
  - Beginners: Learn → Practice → Progress → (Contests) → Today. Learn comes first, as asked, and Today comes last, so "Got it" leaves them on Start here.
  - Smart mode: Today → Practice → Sheets → Learn → Progress → Contests.
- **The route table** is exported as `routes`, and the router is created by `getRouter()`, so tests can match paths without a browser.
- **No 21st.dev component:** the breadcrumb and the New badge are a few lines each, built from the existing `Pill` and tokens.


### Summary
- **Sheets** (Practice → Sheets), all built from the creators' original sources and verified. You can follow one: it's pinned first, shows on Today with its next problem, and adds a daily quest.

  | Sheet | Problems |
  |---|---|
  | Striver's A2Z | 436 |
  | Striver's SDE Sheet | 151 |
  | NeetCode 150 | 150 |
  | Blind 75 | 75 |
  | Love Babbar 450 | 419 |

- **Ticking:**
  - **Auto:** problems tick themselves from LeetCode and Codeforces solves, in every sheet that lists them.
  - **By hand:** one click for GFG, takeUforward and Code360 problems (it reuses Mark solved for LeetCode problems).
  - **Mark sections done** imports finished steps, with Undo.
  - Ticks can be unticked and say where they came from.
- **Sheet page extras:** smart **Next in this sheet** (sheet order weighted toward your weak topics, skipping Premium), private searchable **notes**, filters and search.
- **Beginner Path and Beginner mode:**
  - **Onboarding** asks "New to DSA?" and the video language (English or Hindi). Beginners need no handles and start on Step 1 in well under a minute.
  - **The path:** 14 lessons (watch, read five lines, solve 3–5 easy problems) that unlock in order.
  - **Today in Beginner mode** is one Start here card ("Step 3 of 14: Hashing · Watch 12 min · then solve 2 problems").
  - **Existing installs stay in smart mode,** unchanged.
- **Video lessons:** 147 YouTube videos (196 uses across lessons and topics) in English and Hindi. Every one is verified by oEmbed with an exact title and channel, and plays inside the app (youtube-nocookie). Topic Detail leads with them. Mark as watched is stored in SQLite.
- **Checks:**
  - `npm test`: 362 passing (75 new).
  - `npm run check:links`: passes (articles, 1,281 sheet problems, 59 path problems, 147 videos).
  - `npm run build`: green.
  - **`npm run tauri dev`:** the embedded video **played in the real Tauri window** under the new CSP (`currentTime` 5.9 s → 9.0 s, no player or CSP errors), and **your real data was intact** (smart mode, rating 1008, Level 14).

**Partial or unverified:** none of the sheets are partial, and every video and problem is verified. Thin spots:
- Six advanced topics have only one video per language: geometry (English only), game theory, interactive, constructive, prefix sums and number theory.
- Four topics have no Hindi video: probability, geometry, advanced graphs, design.
- Three lesson main videos fall outside 10–25 min (details in Part 5).
- Video **language** is labelled by channel. It can't be checked through an API; I left out channels whose language I couldn't vouch for.

**To preview:**
1. `git checkout v1.3`, then `npm run tauri dev` from PowerShell.
2. Your real profile opens in smart mode. The six-step tour shows once, because `TOUR_VERSION` is now 3. Learn is the third item in the sidebar (Ctrl+3).
3. To see a fresh beginner without touching your data: Ctrl+Shift+D (Debug) → **Preview a fresh beginner**, or **Preview first launch** for the new welcome screen. Exit from the banner.
4. Sheets: Practice → Sheets → Follow this sheet.

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

### Part 4: Beginner Path and mode choice
- **Onboarding** (`Welcome.tsx`) is one form:
  1. "New to DSA?" as two radio cards ("Yes, I'm new" / "No, I already practise");
  2. the video language (English / Hindi);
  3. handles.
  - **Beginner:** both handles are optional. "Start learning" checks any handle you typed, saves, and opens Today right away. The first sync runs in the background, so a beginner is learning in under a minute.
  - **Smart:** the flow from before (Codeforces required, first sync with its step list).
  Both modes set a new `onboarded` flag, so a beginner with no handles never sees the welcome screen again. Existing installs don't need the flag: their Codeforces handle already gets them past onboarding.
- **Mode, language and followed sheet** are prefs: `mode` (smart by default, so **existing users stay in smart mode**), `videoLang` and `followedSheet`. Settings has a new **Mode** card (Beginner / Smart, plus the lesson video language). In Beginner mode Settings marks the Codeforces handle optional, and removing it clears its cache (otherwise the old profile would be re-adopted on start).
- **Sync without handles:** an empty Codeforces handle is now a skipped step (it used to be a failed one). It still never counts as a handle change, so nothing is wiped. With no handles at all, sync doesn't run, and the top bar says "No handles yet" with a link to Settings instead of "Not synced".
- **Beginner Path** (`src/data/path/beginner-path.json`, `src/engine/path.ts`, `src/data/path.ts`) has 14 steps in the agreed order: Basics → Arrays → Strings → Hashing → Two Pointers → Sliding Window → Stack and Queue → Binary Search → Recursion → Linked List → Trees → Graphs → Greedy → Dynamic Programming.
  - **Each step is a lesson:**
    - **Watch:** one main video plus 1–2 extras per language.
    - **Read:** five lines, in my own words: when to use it, the idea (2 lines), common mistakes (2 lines).
    - **Solve:** 4–5 problems, the first 3 required.
  - **Problems** are LeetCode Easy and free, plus two Codeforces bonus problems (4A Watermelon, 230A Dragons). All are verified, and titles and difficulty come from the platforms (`npm run fill:media`).
  - **Topics:** each step maps to unified topics (basics → implementation and math, hashing → arrays-hashing, sliding window → two-pointers…), so the topic engine and Topics map stay consistent.
  - **As a sheet:** the path is exposed as a sheet (steps are sections), so ticks, cross-sheet matching and the daily sheet quest all work on it. Two Sum in the path is the same key as in A2Z.
  - **Unlocking:** a step is done when its main video (either language) is marked watched and its required problems are solved. That unlocks the next. Done steps are recorded in `path_steps`, so they never re-lock if you untick something later. Steps unlock strictly in order: solving a later step's problems early doesn't skip ahead.
  - **Finishing a step** plays the restrained reward (the aura pulse on the step) once, with a toast naming what unlocked. No confetti.
- **Path view** (Practice → Beginner Path, `/practice/path`): steps done (n/14), the section strip with one segment per step (the current one filling as you watch and solve), Continue, the language toggle, and the 14 steps as a list (Done / the next action / Locked).
- **Lesson page** (`/practice/path/:step`):
  - **Header:** "Step 3 of 14", the title, and two status pills (main video watched; n/3 required problems).
  - **1. Watch:** the player, Mark as watched, Watch on YouTube, and the extras (play them in place).
  - **2. Read:** the five lines.
  - **3. Solve:** tick boxes, required or extra, LeetCode or Codeforces, and Open.
  - **States:** a done step shows "Step done. Step 4 is unlocked" with Go to step 4. A locked step shows only Read, with "Locked. It opens when step 3 is done" and a button to the current step.
- **Today in Beginner mode** (`BeginnerToday.tsx`) leads with one big **Start here** card: "Step 3 of 14: Hashing", the subtitle, "Watch 12 min · then solve 2 problems", the 14-step strip and **one primary button**. Today's quests sit beside it; they work without handles, since hand ticks count. The streak line only appears once a handle is connected. There's no rating hero, chart, heatmap or contest card. Until you add a handle, a small card explains how solves can tick themselves.
- **In Beginner mode,** Practice leads with the Beginner Path tab (Path · Sheets · Today's mix), and `/practice` lands there. Screen subtitles and sidebar hints have beginner wording. The path counts as the followed sheet for the daily quest ("Solve 1 problem from Beginner Path").
- **Debug → Preview a profile.** "Preview a fresh beginner" and "Preview first launch" reload the app on a **separate database** (`sqlite:algocompass-preview.db`, migrated like the real one and wiped on entry; in-memory in the browser) and **in-memory settings**. While a preview runs:
  - the reminder schedule, tray text, notifications, autostart and the theme mirror are never written;
  - a banner under the title bar says it's a preview and offers Exit preview.
- **Tests:**
  - `src/engine/path.test.ts` (25): the path's shape, unlocking, re-lock safety, order, rewards once, the Start here line;
  - `src/data/prefs.test.ts` (4): mode switching, and existing installs staying smart;
  - `onboarding.test.ts` (+5): onboarded beginners with no handles or LeetCode only, smart installs unchanged.

### Part 5: video lessons
- **Every video ID came from YouTube itself:** its own search and playlist listings for the channels you named, plus the videos already in `resources.json`. None was typed from memory.
- **`npm run fill:media`** fills each video's **title and channel from oEmbed** and its **length from the watch page** (`lengthSeconds`), so I never typed any of them. Videos oEmbed refuses (deleted, private or not embeddable) are removed and reported. It removed **2**: Errichto's "Algorithms Lecture #1 - Sums and Expected Value" and "#2 - EV and Sums of Small Powers" (HTTP 401, embedding disabled). Probability uses Khan Academy, Colin Galen and NeetCode instead.
- **`npm run check:links`** now checks every video: oEmbed 200, with an exact match on title and author_name (`scripts/lib/check-media.mjs`). It passes for **147 videos (196 uses)**, along with the Beginner Path's 59 problems, the sheets and every article link.
- **`resources.json` upgraded:** videos moved out of the learn and deeper tiers into a `videos` list per topic (id, lang en/hi, role intro / full lecture / problem walkthrough, minutes, title, channel). Coverage:
  - 32 of 33 topics have 2–6 videos, with English in all 33 and Hindi in 29.
  - Thin spots, where nothing better and embeddable came up: geometry (1, English), game theory and interactive (1 + 1), constructive (1 + 1), prefix sums and number theory (1 English each, plus Hindi).
  - No Hindi for probability, geometry, advanced graphs or design.
- **Channels:**
  - **Path lessons** use only the channels you named. English: takeUforward, NeetCode, Errichto, William Fiset, Abdul Bari. Hindi: CodeHelp, Aditya Verma, Apna College, Luv.
  - **Topic videos** add a few others for advanced topics: Colin Galen, Gaurav Sen, TLE Eliminators, Pepcoding, College Wallah, Simple Quant, Khan Academy.
  - **Languages are labelled by the channel's language.** I dropped videos whose language I couldn't vouch for (Vivek Gupta, Yash Poonia, Harisam Sharma, Rachit Jain).
- **Main videos are 10–25 minutes,** with three exceptions (lengths from YouTube): English Binary Search (NeetCode, 10 min), Hindi Two Pointers (Apna College, 32 min) and Hindi Greedy (Apna College, 9 min). No named Hindi channel has a 10–25 minute video on those two.
- **In-app player** (`VideoPlayer.tsx`):
  - A thumbnail (`i.ytimg.com`) with a play button. Nothing loads from YouTube until you press it.
  - Then the **youtube-nocookie.com** embed (`referrerpolicy="strict-origin-when-cross-origin"`).
  - **Watch on YouTube** is always next to it and opens the browser. Nothing is downloaded or rehosted.
  - **Mark as watched** is stored in `video_watched`.
- **Topic Detail → Resources** now leads with **Watch**: the topic's videos in your language (Intro / Full lecture / Problem walkthrough, channel, minutes, a check when watched). One click plays it in the panel, and "Also in Hindi/English" shows the rest.
- **Tauri CSP** (looked up via context7): `csp` was `null`, so it's now a real policy:
  - `default-src 'self' ipc: http://ipc.localhost`, `connect-src ipc: http://ipc.localhost`, `script-src 'self'`;
  - `style-src 'self' 'unsafe-inline'` (framer-motion and React Flow set inline styles);
  - `img-src 'self' data: blob: https://i.ytimg.com`, `frame-src https://www.youtube-nocookie.com`;
  - `object-src 'none'`, `base-uri 'self'`.
  - `devCsp` adds Vite's websocket and inline script for `tauri dev`.
  - No capability change was needed. The iframe gets no IPC, and Watch on YouTube uses the opener plugin the app already has.

### Part 6: check
- **Tests:** 362 pass (75 new):
  - `engine/sheets.test.ts`: auto-tick matching across sheets, manual and bulk ticks, unticking, distinct progress, smart next and Premium;
  - `data/sheets.test.ts`: real-schema ticking and undo, notes, sheet data validation;
  - `engine/path.test.ts`: step unlocking, re-lock safety, order, path data validation;
  - `data/prefs.test.ts`: mode switching, existing installs staying smart;
  - `onboarding.test.ts`: beginners with no handles;
  - `quests.test.ts`: the sheet quest;
  - `catalog.test.ts`: video data;
  - `nav.test.ts`: tour v2.
- **`npm run check:links` passes:** articles and lists, 1,281 sheet problems (336 LeetCode slugs), 59 Beginner Path problems (2 Codeforces), and 147 videos with exact titles and channels. `--deep` also passed all 607 takeUforward links.
- **`npm run tauri dev`** (Rust built in 1m 13s; run with WebView2's remote-debugging port so I could drive the real window):
  - **Real data intact:** smart mode, rating 1008, Level 14, the usual Today. I only took a screenshot and didn't dismiss the new tour, so nothing was written to your settings.
  - **Video playback:** tested inside the Debug beginner preview. The main Basics video played in the embedded player under the new CSP, with `currentTime` advancing 5.9 s → 9.0 s, not paused, no player error and no CSP violations. The only console noise is WebView2's harmless Tracking Prevention notes on googlevideo storage. The fallback button was never needed, so it stays as a convenience.
  - **Preview isolation:** the preview wrote only to `algocompass-preview.db`. After Exit preview, your real Today came back unchanged.
- **Impeccable critique** (one in-context pass; **degraded: single context**, because you asked for no background agents, and the skill's two sub-agents would have been background agents). It covered Sheets, a sheet page, Today in Beginner mode, the Path view and a lesson, in Light and Dark at 1100x700. The detector was clean on all new UI files. Fixed:
  - **P1:** the followed sheet appeared twice (lead card and list). The list is now "Other sheets".
  - **P1:** on a lesson, the header pushed the video below the fold at 1100x700. The header is tighter (the pills already say what's left), and the play button is now above the fold.
  - **P2:** every row repeated its section's topic chip. A chip now shows only for a topic beyond the section's.
  - **P2:** in Beginner mode, today's quests included a recommender topic quest that competed with Start here. Beginner quests are now the path quest plus consistency.
  - **P2:** the built-in Beginner Path's credit linked out to GitHub. It's now plain "Built into AlgoCompass: lessons with videos".
  - **P2:** a locked step's only card said "2. Read". It's now "Read ahead".
  - Questions skipped: you asked for no questions.
- **Build:** `npm run build` warned that the Path view, imported by Today's Beginner card, wasn't really lazy. Its shared pieces moved to `features/path/shared.tsx`, and the warning is gone.
- **Screenshots:** 21 in `docs/screenshots/v1.3/`, at 1100x700 in Light and Dark: welcome, Today in Beginner and smart mode, the Path, lessons (open, solve, locked), Sheets (pick and following), a sheet page (header, rows, Mark sections done), Settings → Mode, and Topic Detail → Watch. Captured in browser mode on a real sync of your handles.
- **Docs:**
  - **CLAUDE.md:** the v1.3 screens, modes, sheet, path and video rules, the CSP and the preview.
  - **DESIGN.md:** appended "Sheets, Beginner Path and lessons (v1.3)".
  - **PRODUCT.md:** beginners and sheet followers are now target users, plus a new principle ("no decision before the first step").
  - **README:** a "New in v1.3" section, sheet credits, the new first-launch flow, scripts and privacy.

**Decisions (Part 4)**
- **Required problems:** 3 per step, with 1–2 more as extra practice. "Required problems" needed a number, and 3 keeps a step to roughly a sitting.
- **Main video:** the main video in either language counts as watched. Switching language shouldn't undo progress.
- **Locked steps can be read but not worked:** Read is shown, Watch and Solve aren't. That way the order means something without hiding what's coming.
- **Quests for beginners without handles** stay on Today, because hand ticks complete them and the top bar already counts them. Only the streak line waits for a handle, since there's no activity to count.
- **Subtitles:** Today and Practice have beginner-mode subtitles, so they don't promise a rating that isn't there.

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
