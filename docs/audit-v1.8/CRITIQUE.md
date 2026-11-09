# v1.8 critique: "the home page and every page is difficult to navigate"

⚠️ DEGRADED: single-context (the task asked for no background agents, and this harness's sub-agents run in the background). Assessment A (design review) was written first from a screenshot sweep; Assessment B (the `impeccable detect` scan) ran after it. The detector's in-page overlay was not injected; the sweep below stands in for it.

**How it was looked at:** browser mode (`vite`, the sql.js driver), 1100x700, Light, every screen and sub-page in both modes. Smart mode is a real sync of the owner's public Codeforces and LeetCode profiles (rating 1011, 73 solved, 9 rated rounds, 23 LeetCode solves). Beginner mode is Debug → Preview a fresh beginner. Each screen was captured at the window size and again at its full scroll height. Evidence: `critique/` (`s-` smart, `b-` beginner; `-full` is the whole scroll).

| Screen (smart) | Scroll height at 1100 wide | Cards | Controls in the header row |
|---|---|---|---|
| Today | 726 | 3 | – |
| Learn | 3,266 | 4 (two of them topic-by-topic browsers) | – |
| Practice → Today's problems | 1,331 | 3 | 2 tabs |
| Progress → Overview | 2,148 | **8** | **4 tabs + Share my week + Continue today's practice** |
| Contests | **3,295** | 6, one long column | – |
| Settings | 2,550 | 8, left half of the window only | – |

## Design health (Nielsen, 0–4)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Update status, step counter and "Recommended next" are clear. Progress hides which of its four tabs matters. |
| 2 | Match with the real world | 3 | The plain-words glossary works. Raw YouTube titles ("Strivers A2Z-DSA Course \| DSA Playlist \| Placements") read like search results, not a course list. |
| 3 | User control and freedom | 2 | Five different "back" patterns; Sheet and Badges have no way back above the card. |
| 4 | Consistency and standards | 2 | Back links, Stuck? (a word on Practice, an icon elsewhere), two watched buttons on one page, two filter bars on one screen with separate state. |
| 5 | Error prevention | 3 | Virtual contest and revisions confirm; nothing destructive is one click. |
| 6 | Recognition rather than recall | 2 | Notes and Friends sit under Progress; the playlist you want is under one of 22 topics, the video under one of 31, in two different cards. |
| 7 | Flexibility and efficiency | 3 | Ctrl+K, Ctrl+1–5 and `?` are good. Settings can't be jumped through. |
| 8 | Aesthetic and minimalist design | 2 | Progress (8 cards) and Contests (3,300px) are walls; Learn stacks two near-identical browsers. |
| 9 | Error recovery | 3 | Offline and LeetCode failures say what happened. |
| 10 | Help and documentation | 2 | Several empty states say "after the first update" with no button to do it. |
| **Total** | | **25/40** | **Acceptable** (significant work before it feels easy) |

**Cognitive load:** 4 of 8 checks fail on Progress and Contests (single focus, chunking, minimal choices, progressive disclosure); 2 fail on Learn (grouping, minimal choices). Today and Practice pass.

## Design specificity

**Review:** the app is clearly authored (the plain-words layer, the flow bar, the rank colour reserved for rank, the chamfered strips). The navigation problem isn't the look; it's that every release added a card to the screen nearest to hand. v1.7 alone put seven features on Progress and Contests. The screens no longer have one job.

**Detector:** `impeccable detect --json src`: 1 finding, `font-size: 10px is off the DESIGN.md type ramp` at `src/styles/globals.css:334`. It's the React Flow attribution, which DESIGN.md sets to 10px on purpose, so it's a false positive. The detector checks surface rules (type ramp, colours, banned patterns), not information architecture, so it saw none of the problems below.

## Top problems, ranked by how much they hurt navigation

1. **[P1] Progress is a wall, and its tabs are a junk drawer.** Smart Overview has 8 cards over 2,148px: Rating, Rating goal, This week, Activity, Level, Weekly review, Badges, LeetCode, then Where you stand. Where you stand is a topic view, a second one beside the Topics tab. The tab row holds 4 tabs plus Share my week plus Continue today's practice. *Your notes* (per-problem notes) and *Friends* aren't "how am I doing" at all. For a beginner the same row is 6 controls over a 3-card page, and Friends shows an empty table with "–" for every column, because a beginner usually has no handles.
   *Fix:* Overview becomes five cards: Rating (with the goal folded into it), Level and badges (one card), LeetCode, This week (goals with the weekly review folded in, and Share my week in its header), Activity. Where you stand moves to the top of Topics. Notes move to Practice. Tabs: Overview · Topics · Friends (Friends only once you have a handle or a friend).
2. **[P1] Contests is one 3,300px column with the same rounds listed twice.** The next round, then two large Contest review cards, push the upcoming rounds to 1,300px down. Past contests lists the same 9 rounds as Contest review. Virtual contest sits in the middle of the column.
   *Fix:* three tabs, each its own route: **Upcoming** (`/contests`: next round, more Codeforces rounds, LeetCode), **Your rounds** (`/contests/rounds`: review cards, then the table), **Virtual contest** (`/contests/virtual`). A running virtual contest still leads every tab.
3. **[P1] Learn stacks two topic-by-topic browsers, each with its own filters.** Playlists (22 topics) and the Video library (31 topics) are separate cards, both grouped by topic, each with its own English/Hindi and coding-language controls that don't share state. Pick Hindi in one and the other stays English. In smart mode the roadmap is 3,000px down. Playlist titles are YouTube's raw titles, two lines with pipes, cut off in the breadcrumb and the parts card.
   *Fix:* one browse card with one toolbar (language, coding language, topic, search) and a Playlists / Single videos switch (`?view=videos`). Add a curated short `name` per playlist ("Striver's A2Z course", "Binary search, beginner to advanced"); the YouTube title stays for verification and shows on hover.
4. **[P1] The playlist page has two "watched" buttons.** The primary *I've watched it, next part* sits next to an outline *Mark as watched* that does the first half of the same thing.
   *Fix:* one primary action. Not watched: *I've watched it, next part*. Already watched: *Next part*, with the quiet *Watched ✓* state (click to undo) beside it.
5. **[P2] Five ways back.** Lesson, Watch and Playlist use a breadcrumb with a back chevron. The Sheet page has "‹ All sheets" inside its card. Badges has "‹ Overview", the map "‹ Show as list", the beginner's sheet list "‹ Problems from your lessons". The topic panel has ×.
   *Fix:* every page below a tab or screen gets the same breadcrumb row above its first card ("Practice › Sheets › Striver's A2Z", "Progress › Badges"). Panels keep ×.
6. **[P2] Today is good once data exists, but it starts as a dead end.** Before the first update, *Do this next* says "Today's problems come after the first update" with no button, and Today's goals says the same. Once there's data, the lead card has three lines of meta before its button. When everything is done, the only way forward is a text link.
   *Fix:* every Today state has exactly one primary button: *Update now* before data, the problem once it's there, the followed sheet's next or Learn's weakest topic once everything is done. The meta drops to one line.
7. **[P2] Beginners see Hard problems early.** Practice this keeps two Easy problems and fills the rest with the best-ranked harder ones, Hard and unrated included, on every video a beginner opens.
   *Fix:* in Beginner mode the list is Easy-first with at most one Medium, never Hard or unrated (the problem the video itself solves still leads).
8. **[P2] Stuck?'s video can be off-topic.** It uses the problem's first topic, often Codeforces' broad "implementation" or "math" tag, and then any video filed under that topic. A Greedy + Implementation problem gets "How to start Competitive Programming? For beginners!".
   *Fix:* skip the broad tags when the problem has a specific one, and only offer a video whose title names the topic (or the Beginner Path lesson for it). Otherwise say there's no video we're sure about, and link to the topic's videos.
9. **[P2] Empty states that don't say what to do.** Today (above), Contests ("No contests loaded", no button), Progress before the first update, and Your notes ("Add one from any problem's ⋯ menu", but no way to get to a problem).
   *Fix:* every empty state ends in a button: Update now, Open Practice, Open Settings.
10. **[P3] Settings is 2,550px in the left half of the window** with no way to jump to a section. Its weekly goals line still says "Progress rings" (they've been meters since v1.4).
    *Fix:* a sticky section list in the empty right column (Handles, Mode, Language, Theme, Weekly goals, Notifications, Startup, App updates) and the copy fix.
11. **[P3] Stuck? is a word on every Practice row** (5 on screen), an icon everywhere else.
    *Fix:* the ? icon with its tooltip everywhere; the word stays only on the recommended row.

## Persona red flags

- **The daily check-in (smart, seconds per visit):** Today passes. But "how did last round go?" means scrolling past two review cards on Contests. "Am I on track this week?" is the third card down on Progress, under the rating goal.
- **Jordan, first-time beginner:** Progress offers Friends, Your notes and Share my week before they've solved anything. Learn's Practice this shows Medium and Hard problems on their first video. The Video library opens as a separate folded card under 22 topics of playlists.
- **Alex, power user:** can't deep-link to "my rounds" or "virtual contest" (one route), and can't jump through Settings. Filters set in Playlists don't carry to the library.

## Minor observations

- The badge toast on the first update covers the rating card's next-round tile at 1100x700 (expected once).
- The Topics list rows have no strength bar in view while the topic panel is open (the panel covers the right side; fine).
- Practice → More by topic is folded, and that works: keep it.

## Information architecture (v1.8)

One job per screen, one primary action per screen, nothing deleted. Every route keeps working; anything moved gets a redirect.

| Screen | Its one job | The one primary action | What lives there |
|---|---|---|---|
| **Today** `/` | What do I do now? | The *Do this next* button (always present: Update now / Open problem / Open the sheet's next / Watch the weakest topic) | Smart: Do this next, Today's goals, the compact rating card. Beginner: Do this next (lesson), Today's goals. Unchanged otherwise. |
| **Learn** `/learn` | What do I watch? | Continue learning | Continue learning, then **one browse card** (one toolbar; Playlists / Single videos switch, `?view=videos`), then the roadmap (beginner: roadmap before the browse card, as now). Playlist rows and pages use the curated short name. |
| Learn → Playlist `/learn/playlist/:id` | Watch this course in order | *I've watched it, next part* (or *Next part* once watched) | Breadcrumb, part, parts list, Practice this. The second watched button goes. |
| **Practice** `/practice` | What do I solve? | The recommended row's Open | Tabs (smart): Today's problems · Sheets · **Your notes** (moved from Progress; `/progress/notes` redirects to `/practice/notes`). Beginner: Problems from your lessons, Follow a popular sheet, and a "Your notes" link once there are notes. |
| **Progress** `/progress` | How am I doing? | Continue today's practice (the one button beside the tabs) | Tabs: Overview · Topics · Friends (Friends only with a handle or a friend). Smart Overview: Rating (+ goal), Level and badges, LeetCode, This week (+ weekly review, + Share my week), Activity. Topics: Where you stand, then the list. Badges and the map stay pages under them, reached by a breadcrumb. |
| **Contests** `/contests` | When is the next round, and how did the last go? | Register for the next round | Tabs: **Upcoming** (`/contests`), **Your rounds** (`/contests/rounds`: review, then the table), **Virtual contest** (`/contests/virtual`). A running virtual leads every tab. |
| **Settings** | Change a setting | – | Same cards, plus a sticky section list on the right. |

**Folded or moved:**
- Rating goal: into the Rating card (a one-line summary; the plan behind "Show the plan").
- Weekly review: into This week (behind "This week so far", as it already was behind "Show").
- Level and Badges: one card.
- Where you stand: Progress → Topics, above the list.
- Your notes: Progress → Practice (`/progress/notes` → `/practice/notes`).
- Share my week: from the tab row into This week's header (beginner: into Your week).
- Contest review, Past contests: Contests → Your rounds. Virtual contest: its own tab.
- Playlists + Video library: one browse card.

**Kept as they are:** the five sidebar screens and their order, Ctrl+1–5, every existing route and redirect, the lesson flow bar, Practice → Today's problems, the topic panel.

## Build order (biggest wins first)

1. Progress: five-card Overview, tabs, notes to Practice, Where you stand to Topics.
2. Contests: three tabs.
3. Learn: one browse card, curated playlist names, one watched action on the playlist page.
4. Today: never a dead end, one line of meta.
5. One back pattern: the shared breadcrumb on every sub-page.
6. Beginner-gentle Practice this; an on-topic Stuck? video.
7. Empty states with an action; Settings section list; Stuck? as an icon on Practice rows.
8. Polish pass, docs, checks.

Questions skipped: the task said no questions; it lists 11 priority issues, and the order above is my call.
