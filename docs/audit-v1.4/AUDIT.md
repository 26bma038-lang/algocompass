# AlgoCompass v1.4: beginner usability audit and restructure plan

**Status:** audit and plan only. No code was changed.
**Method:** I walked through v1.3.1 (master `7640962`) at 1100x700 in browser mode (Vite plus sql.js, light theme) in two passes:
- **Beginner:** the Debug preview profile (`algocompass:preview` = `welcome`). That's a first launch, then "Yes, I'm new", with no handles.
- **Smart:** a real onboarding with a Codeforces and a LeetCode handle, a full first sync, then every screen.

The screenshots are in this folder. `b…` files are the beginner pass and `s…` files the smart pass. A `-2`, `-3` suffix is the same screen scrolled down by 560px. There's an index at the end.

**The persona:** a first-year student who has never opened LeetCode or Codeforces, doesn't know what a "handle", "rating" or "Div. 2" is, and has heard of "Striver's sheet" from a senior. They opened the app because someone said it teaches DSA.

---

## TL;DR

The core of v1.3 is good, and the restructure must keep it:
- the Start here card;
- the lesson page's Watch → Read → Solve flow bar, with its single literal Next button;
- auto-ticking sheets.

The confusion comes from four things that sit on top of that core:

1. **The app assumes the user already knows LeetCode and Codeforces.** The one step that matters most, solving the first problem, happens on a website the app never explains.
2. **Gamer and competitive-programming jargon is everywhere**, including the always-visible top bar: quests, XP, Lv, sync, handles, mix, upsolve, sharpen, rating 1100, Div. 2, strength 8/100, blind spots, Topics map.
3. **Too many parallel "what should I do" systems**, each with its own name and its own counts: Beginner Path, six sheets (which include the Beginner Path again), Today's mix, quests, Work on next, By topic, Upsolve.
4. **Dead ends.** For a beginner without handles, 4 of the 7 views reachable from the sidebar say "appears after the first sync": Today's mix and the three Progress tabs. Contests, which the tray still opens, says the same. Their real progress, the lessons and the problems they ticked, shows up nowhere in Progress.

The plan has three parts:
- **One sidebar order for both modes:** Today · Learn · Practice · Progress (· Contests).
- **Every screen leads with one big "do this next" button.**
- **Progressive disclosure:** a beginner starts with only lessons. Sheets, streak and level, the topic map and contests appear as they become meaningful.

Nothing is deleted. Every feature moves, gets renamed, or waits until it's earned.

---

## 2a. Usability problems, ranked by severity

Severity:
- **S1 (blocker):** a beginner gets stuck or gives up.
- **S2 (major):** a beginner is confused or overloaded, but can push through.
- **S3 (minor):** friction or polish.

"B" means it affects beginners, "S" smart users.

### S1: blockers

| # | Problem | Who | Where (screenshot) |
|---|---|---|---|
| 1 | **Solving a problem is never explained.** The Solve card says "Solve them on LeetCode and they tick themselves after the next sync. Solved one somewhere else? Tick it here." Open sends a beginner to leetcode.com, which needs an account and shows a code editor in a language they may not have picked. Nothing tells them to sign up (free), pick a language, write code, press **Submit**, and then come back and press "I solved it". The flow bar's "Open problem 1 of 3" leaves the app with no guide. The extra problem "Watermelon · Codeforces · 800" shows a bare number with no meaning. | B | `b06-lesson-3` |
| 2 | **Onboarding asks a beginner for accounts they don't have.** After "Yes, I'm new", the form asks for a *LeetCode username* and a *Codeforces handle* ("Both are optional…") with no word on what these sites are. At 1100x700 the **Start learning** button is below the fold, so the first screen looks like a sign-up form for two other websites. | B | `b02-welcome-new-selected` |
| 3 | **The top bar shows five cryptic controls on every screen:** a search icon, "No handles yet" / "Synced just now", a scroll icon with "0/2", a flame with "–", and "Lv –". None has a visible label. "Handles", "sync", "quests" and "Lv" are jargon, and a dash for an unearned streak or level reads as broken. This is the first thing a beginner sees above every page. | B S | `b04-today`, `s05-today` |
| 4 | **Dead-end screens for beginners.** Practice → Today's mix, Progress → Overview, Topics map and Achievements, and Contests (still reachable from the tray) all show "…after the first sync / Add your handles in Settings". A beginner who finishes three lessons still sees an empty Progress page, because Beginner Path steps and hand-ticked problems aren't shown there. | B | `b09`, `b10`, `b11`, `b12`, `b13` |
| 5 | **The first choice in Practice is "Pick a sheet to follow"** from six lists: Beginner Path (59), A2Z (436), SDE (151), NeetCode 150, Blind 75 and Babbar 450. That breaks PRODUCT.md principle 6 ("A beginner is never asked where to start"). Opening A2Z shows 436 rows, with "Pattern 1 … Pattern 22" first, each opening another site (takeUforward). There's also a filter bar (search, All/Unsolved/Solved, Easy/Medium/Hard, Expand all), Mark sections done, a note icon per row, and a paragraph about "LeetCode's API only shows your 20 most recent solves". | B | `b07-practice-sheets`, `b08-sheet-a2z`, `b08-sheet-a2z-2` |

### S2: major

| # | Problem | Who | Where |
|---|---|---|---|
| 6 | **Too many "what to do" systems with overlapping names.** <br>• Today's quests: "Solve 1 problem from Beginner Path", "Solve 1 Math problem rated 1100+ on Codeforces". <br>• Today's mix (5), Work on next (2 problems, *the same two* as in the mix), By topic (3 topics × 3), Upsolve, the followed sheet's "Next in this sheet", and the Beginner Path's Next. <br>A smart user sees **10 candidate tasks** on Today alone. "What do I do today?" can't be answered in 2 seconds. | S | `s05-today`, `s05-today-2`, `s06-practice-mix` |
| 7 | **The same path is counted two ways.** In smart mode, Learn says "Beginner Path **0/14 steps done**", while Practice → Sheets says "AlgoCompass Beginner Path **11% · 7/59**" (problems solved count, steps don't until the video is marked watched). The Beginner Path also appears both as Learn's roadmap and as a sheet. | B S | `s09-learn`, `s07-practice-sheets` |
| 8 | **Jargon** (full list in 2c, "Plain-language names"). Users meet it before they meet any explanation: <br>• Gamer words: quests, XP, Lv, "Loop Apprentice". <br>• App words: sync, handle, mix, Topics map, nodes, mastery ring, Unlocked. <br>• Competitive-programming words: upsolve, sharpen, rated 1100+, Div. 2, round, Newbie/Pupil, blind spots, strength 8/100, Developing, Struggle rate. <br>• Sheet words: sheet, "Mark sections done", Premium. <br>The tooltips and descriptions also lean on the same words, for example "today's mix" inside the Practice description. | B S | everywhere |
| 9 | **Learn scrolls about 6,900px for a beginner.** The library has 147 videos in 33 groups, and the groups are named after Codeforces tags: "Implementation", "Constructive algorithms", "Brute force", "Math". The same video appears in several groups (NeetCode's Big-O video sits under both Implementation and Math), and one thumbnail is blank ("CSES Introductory Problems", 133 min). The toolbar has four controls (search, English/Hindi/Both, Not watched yet, topic picker). In smart mode, "Suggested for you: Implementation" plays the *Big-O* video, so the suggestion doesn't match its own label. | B S | `b05-learn-3`, `b05-learn-4`, `s09-learn` |
| 10 | **The first-run tour teaches the navigation, not the task.** The beginner tour is 4 tips (Learn → Practice → Progress → Today) and the smart tour 6. Each tip covers half the screen, including the "Start the lesson" button it's about to recommend. Each tip ends with "Ctrl 2 jumps here from anywhere", which is noise for someone who doesn't know what the screen is yet. | B S | `b03-tour-1`, `b03-tour-4`, `s04-tour-*` |
| 11 | **The smart Today is a dashboard, not a check-in.** <br>• Eight cards, scrolling about 1,600px: quests, mix, CF hero, Work on next, LeetCode, Activity, Where you stand, Later contests. <br>• Activity has about 400px of blank space under the heatmap, because it stretches to match Where you stand. <br>• Where you stand repeats Work on next. Later contests repeats the hero's next round. | S | `s05-today` to `s05-today-4` |
| 12 | **Each Practice row has up to five actions:** Mark solved (LeetCode rows), Skip, Too easy, Too hard and Open. All but Open are 12px muted text buttons sitting next to the topic chips. The source line is truncated ("Step 2 of the imple…"), and so is the screen subtitle ("…upsolves and problems b…"). Below the short Upsolve card, the left column is empty for most of the page. | S | `s06-practice-mix`, `s06-practice-mix-2`, `s06-practice-mix-3` |
| 13 | **The Topics map is unreadable at 1100x700.** The fit-to-view graph puts 33 nodes and crossing edges in about 830x350px, with labels around 10px. The filters say "Unlocked 24 / Weak 19 / Blind spots 2". The Topic Detail panel opens with "Strength 8 of 100. 17 points to Developing", "Where the strength comes from", "Struggle rate" and "Hardest Codeforces solve". Useful for a CF regular, opaque for everyone else. | S | `s11-progress-topics`, `s12-topic-detail` |
| 14 | **The sidebar order and shortcuts change with the mode.** Learn is Ctrl+2 in Beginner mode and Ctrl+3 in smart mode. Practice's tabs flip order (Sheets · Today's mix vs Today's mix · Sheets). Switching modes in Settings reshuffles everything the user has learned. | B S | `b04-today`, `s05-today` |
| 15 | **Settings is long and mostly irrelevant to a beginner.** It's six cards, scrolling about 1,350px. A beginner is asked for weekly goals of "Codeforces problems 10 · LeetCode problems 5 · Contests 1", and sees contest reminders and "Quest complete" notifications. The Mode card says "What Today and Practice lead with", which describes the implementation rather than what the user gets. | B | `b14-settings` to `b14-settings-4` |

### S3: minor

| # | Problem | Who | Where |
|---|---|---|---|
| 16 | The Read section of step 1 ("Basics") assumes maths and C++: "About 10⁸ simple operations run in a second, so with n = 10⁵ an O(n²) idea is too slow", "use long long (C++) or long (Java)". That's heavy for someone who has never coded. | B | `b06-lesson-2` |
| 17 | Ctrl+K leads with **Sync now** (with no handles) and **Open today's mix** (empty) for a beginner. "Continue my lesson" isn't offered. | B | `b15-ctrlk`, `s16-ctrlk` |
| 18 | Important text is small and muted: source lines and hints at 12–13px in Dusk (the three-word "Step 1 of the implementation path…" gets truncated), feedback buttons at 12px, Topics map labels at about 10px, and the strip label "0 of 14 steps done" at 13px. Everything passes contrast, but at 1100x700 the *important* lines (what this is, why it's picked) are the smallest. | B S | `s06-practice-mix`, `s11-progress-topics` |
| 19 | Navigation gaps: <br>• On `/contests` a beginner has no active sidebar item, so they can't tell where they are. <br>• "Topic details" in Learn jumps to Progress → Topics map, so the user leaves Learn without a way back. For a beginner that map is empty. <br>• The sheet page's way back is a small "‹ All sheets" link. | B | `b13-contests-direct`, `b05-learn-2`, `b08-sheet-a2z` |
| 20 | The first-sync screen lists 12 technical steps ("Codeforces problemset (about 11,000 problems)", "LeetCode problem details") where one progress bar would do. | S | `s02-first-sync`, `s03-first-sync-done` |
| 21 | The level shows up three times (top bar badge, Progress → Overview, Achievements hero), and so do the streak (top bar, quests card, Achievements) and the next contest (CF hero, Later contests, Contests). Each repeat costs attention. | S | `s05-today`, `s10-progress-overview`, `s13-progress-achievements` |
| 22 | Achievements is a 31-badge wall (it scrolls about 2,300px). Locked badges have dashed outlines and progress bars, which works for collectors but is noise as a Progress tab. | S | `s13-progress-achievements` |
| 23 | The "Let your solves tick themselves" card (beginner Today) relies on "tick themselves" and "sync", and its only action is a text link to Settings. | B | `b04-today` |

---

## 2b. Each screen's one job, and what doesn't serve it

| Screen | Its ONE job | On it today, but not serving that job |
|---|---|---|
| **Welcome** | Get a beginner into lesson 1, or a tracker user synced, in under a minute. | Beginner: the LeetCode and Codeforces fields (2), and the Start button below the fold. Smart: the 12-line sync checklist (20). |
| **Today (beginner)** | One button: the next thing to do. | Mostly right. The top bar's quest pill, flame and Lv (3). The two-quest card repeats the lesson ("Solve 1 problem from Beginner Path"). "See all 14 steps in Learn" competes with the primary button. |
| **Today (smart)** | Say what to solve today and whether you're on track, in 2 seconds. | Work on next (it duplicates the mix), LeetCode stats, Activity heatmap, Where you stand and Later contests (6, 11, 21). Of the 8 cards, three do the job: quests, the mix and the CF hero. |
| **Learn** | Continue the current lesson, or find a video for a topic. | Beginner: the 147-video library open below the roadmap, CF tag names, duplicate videos (9), and "Topic details" links into Progress (19). |
| **Lesson** | Watch → read → solve this step, then go to the next one. | Works well. Missing: how to solve on LeetCode (1). Over the line for step 1: the Read text's maths and C++ (16), and "More videos" competing beside Read. |
| **Practice → Today's mix** | Solve today's 5 picked problems. | Four text feedback buttons per row (12), Upsolve and By topic below (more lists of the same kind), and the 20-solve API paragraph. For a beginner, the whole tab is empty (4). |
| **Practice → Sheets** | Follow one list and do its next problem. | For a beginner: being asked to choose among six (5). Sheet page: filters, Mark sections done and notes all show by default. |
| **Progress → Overview** | Show "you're improving". | Fine for smart users. For a beginner it's empty and ignores lesson progress (4). |
| **Progress → Topics map** | Show which topics are weak. | The canvas is too small to read at 1100x700 (13). The list of weak topics (the three top tiles) does the job better than the graph. |
| **Progress → Achievements** | Celebrate milestones. | A 31-badge wall as a peer tab of Overview (22). |
| **Contests** | The next CF round: register and get a reminder. | Mostly fine. "Div. 1/2/3", "rated" and "upsolve" go unexplained. For beginners it's empty or hidden, as designed. |
| **Settings** | Change accounts, mode, language and theme. | Weekly CF/contest goals and contest notifications for beginners (15), and the Mode wording. |
| **Ctrl+K** | Jump anywhere fast (power users). | Fine for smart users. A beginner gets Sync now and Today's mix first (17). |
| **Top bar** | Status at a glance. | Five unlabeled controls (3) and repeated numbers (21). |

---

## 2c. Proposed structure

### Principles for v1.4

1. **One primary button per screen**, labelled with the literal next action ("Watch Step 1's video", "Open problem 2 of 3: Running Sum", "Solve Hourglass on Codeforces"). Everything else is secondary (outline, ghost or link).
2. **Progressive disclosure, earned by doing.** A beginner sees lessons first. Each feature appears when it's meaningful, with a one-line "New: …" note the first time. Nothing is ever empty because the user hasn't connected an account yet.
3. **Same sidebar, same order, same shortcuts in both modes.** The mode changes *what each screen leads with*, never where things are.
4. **Plain words first.** Jargon may appear only after a plain label, for example "Hard problems you didn't finish (upsolve)", and only where a smart user expects it.
5. **No repeated numbers.** Each number lives in exactly one place.
6. **Fewer, bigger cards.** Today has at most 3 cards, and none of them needs scrolling at 1100x700.

### Sidebar (both modes)

```
Today       Ctrl+1   Your next step
Learn       Ctrl+2   Lessons and videos
Practice    Ctrl+3   Problems to solve
Progress    Ctrl+4   How you're doing
Contests    Ctrl+5   Live coding contests     (beginner: appears at step 9, as now)
─────────
Settings    Ctrl+,
```

- **Smart mode changes:** Learn moves above Practice ("learn, then practise" reads top to bottom and matches "LC to learn, CF to sharpen"), so Ctrl+2 and Ctrl+3 swap once. Bump `TOUR_VERSION` and show a one-line "Learn moved up" note.
- **Beginner mode:** unchanged order, and the four items show from day one. The difference is that **no screen is empty** (see below).
- The hover descriptions use the plain lines above.

### Top bar

| Element | Today | Proposed |
|---|---|---|
| Search | icon | Keep. Tooltip "Search (Ctrl+K)". |
| Sync | "No handles yet" / "Synced 2m ago" | **Smart:** "Updated 2m ago" plus a refresh icon. **Beginner without accounts:** hidden. |
| Quests | scroll icon "0/3" | **Removed from the top bar.** Goals live once on Today. |
| Streak | flame "0" / "–" | **Smart:** "🔥 3 days" (a word, not just a number). **Beginner:** hidden until the first problem is solved, then "🔥 1 day". |
| Level | "Lv 7" | **Smart:** "Level 7". **Beginner:** hidden until step 3 is done, then shown with a "New" note: "You earn points for every lesson and problem." |

A beginner's day-one top bar is just the title, the subtitle and search.

### Each screen, top to bottom

#### Welcome (first launch)

1. "Welcome to AlgoCompass" and one line: "Learn DSA step by step, with videos in English or Hindi."
2. **"Are you new to DSA?"** with two cards: "Yes, I'm new: start with short lessons" / "No, I already practise: track my Codeforces and LeetCode".
3. **If new:** the video language (English / Hindi), then the primary button **Start lesson 1**, above the fold. No account fields. Accounts are offered later, at the moment they help (see Lesson → Solve).
4. **If practising:** Codeforces username (required), LeetCode username (optional), then **Connect and get my stats**. Sync progress is one bar ("Getting your Codeforces history, about a minute"), with the 12-step list folded under "Details".

#### Today: "Your next step"

**Beginner:**
1. **Next step card** (full width, the one bold element): "Step 3 of 14 · Hashing", a one-line subtitle, "About 25 minutes: a 12-min video and 2 problems", the 14-segment strip, and **one big button** whose label is `lessonNext()`'s literal action ("Continue: open problem 2 of 3"). No secondary link beside it.
2. **Today** (small card, one line each): "Problems solved today: 1", and the streak once it exists. The quest system shrinks to this line until step 3 is done.
3. **One helper card at a time**, in this order and only until it's done:
   - "First time solving on LeetCode? Here's how (1 min)", which opens the how-to.
   - "Connect LeetCode so solved problems tick automatically", with a **Connect** button inline instead of a link to Settings.
   - "Ready for more problems? Pick a sheet" (after step 5).

**Smart:**
1. **Do this next** (7 columns): the next unsolved problem from today's picks, with its title, a plain source line ("Codeforces · difficulty 1100 · Math"), a big **Open on Codeforces** button and an "I solved it" check. Underneath: "2 of 5 of today's problems done", the run meter, and the streak line.
2. **Today's goals** (5 columns): the three quests, renamed "goals", with "+N points" in small text.
3. **Rating** (12 columns, compact): the rating hero number, the rank chip and progress, the sparkline, and the next round with **Register**.

Moved off Today: Work on next goes into the Practice list, since it's the same problems. LeetCode stats and Activity go to Progress. Where you stand goes to Progress → Topics. Later contests go to Contests. The followed sheet's "Next problem" joins the Do-this-next queue when a sheet is followed.

#### Learn: "Lessons and videos"

1. **Continue** card, as now. Its one primary button resumes exactly where the user stopped.
2. **Beginner Path** roadmap: open in Beginner mode, folded in smart mode (as now). The count is **steps**, and Practice uses the same count (see Practice).
3. **Videos by topic**:
   - **Beginner mode:** collapsed behind a "Browse all videos (147)" button. When opened, the videos are grouped by the **14 path steps**, not by the 33 CF tags. The remaining tags go under "More topics".
   - **Smart mode:** open, weak topics first (as now).
   - **Either way:** each video appears once, in its best-fitting topic. Topic names are plain (see the table below). The toolbar is search plus a language toggle; "Not watched yet" and the topic picker move into a "Filter" popover.
   - "Topic details" becomes "**How strong am I at this?**" and opens the Topic panel *over Learn* without changing screens.

#### Lesson (focus mode)

Keep the current layout and flow bar, plus these changes:
1. **Solve** gets a one-time "**How to solve on LeetCode**" panel above problem 1, collapsible and remembered:
   1. Make a free LeetCode account.
   2. Pick your language (C++, Java or Python).
   3. Write your code and press **Submit**.
   4. Green "Accepted" means you've solved it. Come back and press **I solved it**.
   Below it: "Connect your LeetCode username and this happens automatically. **Connect**".
2. **The flow bar** stays the one primary action. The "Open problem 1 of 3" step shows "(opens LeetCode in your browser)" under the button the first time.
3. **Read** shows the first three lines of each part, with "Read more". **More videos** moves under Read as one row: "2 more videos on this step".
4. Extra Codeforces problems say "Codeforces · difficulty 800 (easiest)" instead of a bare "800".

#### Practice: "Problems to solve"

Tabs: **Today's problems** · **Sheets**. A beginner gets a third view, described next.

**Beginner, before step 5:** no tabs. The page is "**Problems from your lessons**", the 59 path problems grouped by step, with locked steps greyed out. Each row has a tick box, the title, the difficulty in words and Open. The count is "steps done" plus "problems done", the same numbers Learn shows. At the bottom, one quiet card reads "Want a bigger list? Popular sheets unlock after step 5", with **Show me anyway** for students who were told to follow Striver.

**Beginner, after step 5, and smart:**
- **Today's problems** (formerly Today's mix):
  1. **The list of 5**: each row has a platform dot, title, source line, difficulty, **Open** (primary-sized) and an "I solved it" check. Skip, Too easy and Too hard move into a "⋯" menu, one per row.
  2. "**Unfinished problems** (upsolve)": Codeforces problems you tried but didn't solve. Shown only when there are any.
  3. "**More by topic**", folded: the per-topic lists, without the duplicates that Work on next showed on Today.
- **Sheets:**
  1. Your followed sheet, if any: name, %, strip, and one **Next problem** button.
  2. "**Other sheets**": the dense rows as now. For a beginner it's sorted easiest first (Beginner Path, Blind 75, NeetCode 150, …), with a one-line "how big" note ("75 problems, about 4 weeks").
  3. On a sheet page, the filters, **I've already done some** (formerly Mark sections done) and the API note fold under "Options". Rows keep the tick box, title, difficulty and Open. The note icon only appears on hover.

#### Progress: "How you're doing"

Tabs: **Overview** · **Topics**. Achievements becomes a card on Overview, but the route `/progress/achievements` stays.

**Overview, beginner:**
1. **Your path**: "5 of 14 steps done", the strip, and "23 problems solved". This data already exists.
2. **Your week**: days practised (a 7-dot row) and problems solved this week.
3. **Badges**: the 3 most recent plus "See all", which opens the existing achievements view.
4. Level and points appear here once they're unlocked.

**Overview, smart:**
1. Rating chart (as now).
2. Level and points: one card, with today's points by source.
3. This week's goals.
4. Activity heatmap and LeetCode stats (moved from Today).
5. Weekly review.
6. Badges, the same card as for beginners.

**Topics:**
1. **A list by default.** Each topic is a row with its name, a plain status ("Weak", "Getting there", "Strong", "Mastered", "Not tried yet"), a bar and "why" ("Shows up in 43% of problems at your level"). Weakest first. This is "Where you stand", promoted.
2. **"Show as map"** toggles the existing skill-tree canvas, for the people who love it.
3. Topic panel: it leads with a sentence ("Weak. Solve 3 more Implementation problems to reach Getting there"), then **Watch lessons** / **Practise this topic** as the two buttons. The stat tiles fold under "Details".

**Beginner without accounts:** Topics shows the 14 path topics with done / current / locked, never "after the first sync".

#### Contests: "Live coding contests"

1. **Next round** card (as now). "I'll attend" becomes **Remind me**. "Div. 2" gets a tooltip: "Division 2: for ratings below 2100. Most people start here".
2. More Codeforces rounds, then LeetCode (as now).
3. Past contests (as now), with "upsolve" written as "Unfinished problems" and a link to Practice.

The first visit shows one dismissible line: "A contest is a timed set of problems that everyone solves at the same time. Your rating goes up or down with your result."

#### Settings

The order follows how often each setting matters:
1. **Mode**: "New to DSA (guided lessons)" / "Already practising (tracker)".
2. **Lesson language.**
3. **Accounts**: LeetCode and Codeforces usernames, each with "What's this? Get one free" links.
4. **Theme.**
5. **Reminders.** Beginners see only "Practice reminder"; contest and goal notifications appear in tracker mode or after step 9.
6. **Weekly goals**: tracker mode only.
7. **Launch on startup.**

#### Ctrl+K

The actions depend on the mode:
- **Beginner:** "Continue my lesson", "Go to step…", "Watch a video on…", screens, topics. Sync is hidden until an account exists.
- **Smart:** as now.

#### First-run tour

Replace the 4-tip and 6-tip nav tour with **one contextual coach mark** on the primary button ("Start here: this always shows your next step"). The rest is taught where it appears, with "New: …" notes the first time Sheets, the streak, the level or Contests unlock. Smart users get a 3-tip tour: Today's next step → Learn → Progress.

### What a beginner sees, and when

| Unlocks when… | What appears | Notes |
|---|---|---|
| Day one | Today (next step), Learn (path, videos folded), Practice (lesson problems), Progress (path, week), Settings | No empty screens, no quests, XP, level, sync or sheets prompt. |
| First problem solved | Streak in the top bar ("🔥 1 day") | "New: your streak. Solve one problem a day to keep it." |
| LeetCode connected | Auto-ticks. "Updated …" in the top bar. | Offered inside Solve and on Today, at the moment it helps. |
| Step 3 done | Level and points, and Today's goals (quests) | One "New" note that explains points. |
| Step 5 done | Practice → Sheets and Today's problems tabs | "Ready for more? Pick a sheet", sorted easiest first. |
| Step 9 done (existing milestone) | Contests, plus contest reminders in Settings | Exists today (`CONTESTS_MILESTONE_STEP`). |
| Codeforces connected, or Tracker mode | Rating, the Topics map toggle, the Topic panel stats | Smart mode starts here. |

The thresholds are suggestions. They should live in one table in `src/engine/learn.ts`, next to `CONTESTS_MILESTONE_STEP`.

### Plain-language names for every label

| Today | Proposed | Notes |
|---|---|---|
| Smart mode / Beginner mode | **Tracker** (already practising) / **Guided** (new to DSA) | In Settings and onboarding the cards carry the long form. |
| Handle / username | **Codeforces username** / **LeetCode username** | |
| Sync, Synced just now, No handles yet | **Update**, **Updated just now**, hidden when there's no account | |
| Quests, Today's quests | **Today's goals** | |
| XP, "+10 XP" | **points**, "+10 points" | |
| Lv 7, "Loop Apprentice" | **Level 7**, title kept as the subtitle | |
| Today's mix | **Today's problems** | |
| Work on next | folded into **Do this next** / **More by topic** | |
| Upsolve | **Unfinished problems** (upsolve) | |
| Sharpen on Codeforces / Learn on LeetCode | **Practise on Codeforces** / **Learn on LeetCode** | |
| Mark solved | **I solved it** | |
| Skip / Too easy / Too hard | the same, inside a **⋯** menu | |
| 1100 (bare) | **difficulty 1100** | Tooltip: "Codeforces difficulty. 800 is the easiest." |
| Rated 1100+ (in quests) | **difficulty 1100 or harder** | |
| Div. 2 | Div. 2 + tooltip | "For ratings below 2100" |
| I'll attend | **Remind me** | |
| Sheets | **Sheets** (kept), described as "popular problem lists" | Students already say "Striver's sheet". |
| Follow this sheet | **Follow** | |
| Mark sections done | **I've already done some** | |
| Topics map | **Topics** (list), **Show as map** | |
| Strength 8/100, Weak / Developing / Strong / Mastered | **Weak · Getting there · Strong · Mastered** (+ "8/100" in small type) | |
| Blind spots | **Not tried yet** | |
| Unlocked (filter) | **Started** | |
| Struggle rate | **Wrong tries per solve** | Folded under Details. |
| Achievements | **Badges** | |
| Weekly review | **Your week** | |
| Let your solves tick themselves | **Connect LeetCode to tick problems automatically** | |
| Topic details (link in Learn) | **How strong am I at this?** | |
| Implementation / Constructive algorithms / Brute force (topic names) | **Coding basics (implementation)**, **Build-the-answer problems (constructive)**, **Try everything (brute force)** | The plain name comes first and the CF tag stays in brackets, so tags still match. |

### The single primary action on each screen

| Screen | Primary button |
|---|---|
| Welcome | **Start lesson 1** / **Connect and get my stats** |
| Today (beginner) | `lessonNext()`'s literal action, e.g. **Continue: open problem 2 of 3** |
| Today (smart) | **Open "Hourglass" on Codeforces** (the next unsolved pick) |
| Learn | **Continue step 3** / **Resume video** |
| Lesson | The flow bar's Next (unchanged) |
| Practice → lesson problems | **Open** on the next unticked problem (a primary-filled row) |
| Practice → Today's problems | **Open** on the first unsolved row |
| Practice → Sheets | **Next problem** on the followed sheet, or **Follow** on the recommended sheet |
| Progress | none (it's for reading). The secondary is **Practise my weakest topic**. |
| Contests | **Register** for the next round |
| Settings | per card (**Save**) |

---

## 2d. Wireframes (1100x700, sidebar expanded)

### Welcome: new to DSA

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ◎ AlgoCompass                                                  ─  □  ✕   │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│        Welcome to AlgoCompass                                             │
│        Learn DSA step by step, with videos in English or Hindi.           │
│                                                                           │
│        Are you new to DSA?                                                │
│        ┌──────────────────────────┐  ┌──────────────────────────┐         │
│        │ (●) Yes, I'm new         │  │ ( ) No, I already        │         │
│        │ Short lessons: watch,    │  │     practise             │         │
│        │ read, solve 3 easy ones  │  │ Track Codeforces and     │         │
│        └──────────────────────────┘  │ LeetCode                 │         │
│                                      └──────────────────────────┘         │
│        Lesson videos in   [ English | Hindi ]                             │
│                                                                           │
│        ┏━━━━━━━━━━━━━━━━━━━┓                                              │
│        ┃  Start lesson 1  →┃   No account needed. You can change this     │
│        ┗━━━━━━━━━━━━━━━━━━━┛   later in Settings.                         │
└───────────────────────────────────────────────────────────────────────────┘
```

### Today: beginner, day one

```
┌───────────┬───────────────────────────────────────────────────────────────┐
│ ☀ Today   │ Today                                                      ⌕  │
│ 🎓 Learn  │ Your next step                                                │
│ ◎ Practice├───────────────────────────────────────────────────────────────┤
│ ↗ Progress│ ┌───────────────────────────────────────────────────────────┐ │
│           │ │ Step 1 of 14 · Basics                                     │ │
│           │ │ Loops and how fast code runs                              │ │
│           │ │ About 25 min: a 15-min video, then 3 easy problems        │ │
│           │ │ ▰▱▱▱▱▱▱▱▱▱▱▱▱▱                                            │ │
│           │ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓                          │ │
│           │ │ ┃ ▶  Watch step 1's video      ┃                          │ │
│           │ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛                          │ │
│           │ └───────────────────────────────────────────────────────────┘ │
│           │ ┌─────────────────────────────┐ ┌───────────────────────────┐ │
│           │ │ Today                       │ │ First time on LeetCode?   │ │
│           │ │ Problems solved today: 0    │ │ It's where you'll solve   │ │
│           │ │ Solve one to start a streak │ │ problems. 1-min how-to →  │ │
│           │ └─────────────────────────────┘ └───────────────────────────┘ │
│ ⚙ Settings│                                                               │
└───────────┴───────────────────────────────────────────────────────────────┘
```

### Today: smart

```
┌───────────┬───────────────────────────────────────────────────────────────┐
│ ☀ Today   │ Today            ⌕  ↻ Updated 2m ago  🔥 3 days  Level 7     │
│ 🎓 Learn  │ Your next step                                                │
│ ◎ Practice├───────────────────────────────────────────────────────────────┤
│ ↗ Progress│ ┌──────────────────────────────────┐ ┌──────────────────────┐ │
│ 📅 Contest│ │ Do this next                     │ │ Today's goals   1/3  │ │
│           │ │ Hourglass                        │ │ ✓ Solve any 2        │ │
│           │ │ Codeforces · difficulty 1100 ·   │ │ ○ 1 Math, 1100+   0/1│ │
│           │ │ Math. Your weakest topic         │ │ ○ 1 LeetCode      0/1│ │
│           │ │ ┏━━━━━━━━━━━━━━━━━━━━━━━━┓ ☐ I   │ │                      │ │
│           │ │ ┃ Open on Codeforces   ↗ ┃ solved│ │ +30 points today     │ │
│           │ │ ┗━━━━━━━━━━━━━━━━━━━━━━━━┛  it  │ │                      │ │
│           │ │ ▰▰▱▱▱  2 of 5 of today's done ·  │ │                      │ │
│           │ │ see all in Practice              │ │                      │ │
│           │ └──────────────────────────────────┘ └──────────────────────┘ │
│           │ ┌───────────────────────────────────────────────────────────┐ │
│           │ │ 982  Newbie · 218 to Pupil  ▁▂▄▅▆▇   Next: Round 1129     │ │
│           │ │ ━━━━━━━━━━──────                     in 1d 16h [Register] │ │
│ ⚙ Settings│ └───────────────────────────────────────────────────────────┘ │
└───────────┴───────────────────────────────────────────────────────────────┘
```

### Lesson: the Solve section with the how-to

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ‹  Learn › Beginner Path › Step 1                       [English | Hindi] │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ 3. Solve                                               0 of 3 solved  │ │
│ │ ┌─ How to solve on LeetCode (first time) ─────────────────── hide ─┐  │ │
│ │ │ 1 Make a free account  2 Pick C++, Java or Python                │  │ │
│ │ │ 3 Write code, press Submit  4 "Accepted"? Come back, tick it     │  │ │
│ │ │ Tip: connect your LeetCode username and ticks happen by          │  │ │
│ │ │ themselves.  [Connect]                                           │  │ │
│ │ └──────────────────────────────────────────────────────────────────┘  │ │
│ │ ☐ Fizz Buzz                     LeetCode · Easy             [Open ↗]  │ │
│ │ ☐ Running Sum of 1d Array       LeetCode · Easy             [Open ↗]  │ │
│ │ ☐ Richest Customer Wealth       LeetCode · Easy             [Open ↗]  │ │
│ │   Extra: Watermelon             Codeforces · difficulty 800 [Open ↗]  │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ (✓)Watch ── (✓)Read ── (3)Solve 0/3   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │ │
│ │                                       ┃ Open problem 1 of 3:        ┃ │ │
│ │                                       ┃ Fizz Buzz ↗                 ┃ │ │
│ │                                       ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

### Learn: beginner

```
┌───────────┬───────────────────────────────────────────────────────────────┐
│ ☀ Today   │ Learn · Lessons and videos                                 ⌕  │
│ 🎓 Learn  ├───────────────────────────────────────────────────────────────┤
│ ◎ Practice│ ┌──────────────┬────────────────────────────────────────────┐ │
│ ↗ Progress│ │  [▶ thumb]   │ Continue · Step 3 of 14: Hashing           │ │
│           │ │   12 min     │ Video watched ✓ · 1 of 2 problems          │ │
│           │ │              │ ┏━━━━━━━━━━━━━━━━━━━━━━┓                   │ │
│           │ │              │ ┃ Continue step 3      ┃                   │ │
│           │ └──────────────┴─┗━━━━━━━━━━━━━━━━━━━━━━┛───────────────────┘ │
│           │ ┌───────────────────────────────────────────────────────────┐ │
│           │ │ Beginner Path                            2 of 14 steps done│ │
│           │ │ ▰▰▰▱▱▱▱▱▱▱▱▱▱▱                                            │ │
│           │ │ ✓ 1 Basics            │ 8 Binary Search            🔒      │ │
│           │ │ ✓ 2 Arrays            │ 9 Recursion   unlocks Contests    │ │
│           │ │ ● 3 Hashing ← you're  │ 10 Linked List             🔒      │ │
│           │ │   here, 1 of 2        │ …                                 │ │
│           │ └───────────────────────────────────────────────────────────┘ │
│           │ [ Browse all videos (147) ▾ ]   grouped by step when opened   │
│ ⚙ Settings│                                                               │
└───────────┴───────────────────────────────────────────────────────────────┘
```

### Practice: smart, Today's problems

```
┌───────────┬───────────────────────────────────────────────────────────────┐
│ ☀ Today   │ Practice · Problems to solve       ⌕  ↻ Updated  🔥 3  Lv 7   │
│ 🎓 Learn  ├───────────────────────────────────────────────────────────────┤
│ ◎ Practice│ [ Today's problems | Sheets ]                                 │
│ ↗ Progress│ ┌───────────────────────────────────────────────────────────┐ │
│ 📅 Contest│ │ Today's problems           ▰▰▱▱▱ 2 of 5      [New set ↻]  │ │
│           │ │ Practise on Codeforces                                    │ │
│           │ │ ✓ Hourglass        Math · difficulty 1100     Solved   ⋯  │ │
│           │ │ ☐ Tung Tung Sahur  Strings · 1100      ┏ Open ↗ ┓      ⋯  │ │
│           │ │ ☐ Remilia Plays…   Game theory · 1100     [Open ↗]     ⋯  │ │
│           │ │ Learn on LeetCode: Coding basics                          │ │
│           │ │ ✓ Fizz Buzz        Easy                    Solved      ⋯  │ │
│           │ │ ☐ Pascal's Triangle Easy                  [Open ↗]     ⋯  │ │
│           │ └───────────────────────────────────────────────────────────┘ │
│           │ ┌───────────────────────────────────────────────────────────┐ │
│           │ │ Unfinished problems (upsolve) · 2                       ▾ │ │
│           │ ├───────────────────────────────────────────────────────────┤ │
│           │ │ More by topic: Coding basics, Greedy, Try everything…   ▾ │ │
│ ⚙ Settings│ └───────────────────────────────────────────────────────────┘ │
└───────────┴───────────────────────────────────────────────────────────────┘
```

### Progress: beginner Overview

```
┌───────────┬───────────────────────────────────────────────────────────────┐
│ ☀ Today   │ Progress · How you're doing                                ⌕  │
│ 🎓 Learn  ├───────────────────────────────────────────────────────────────┤
│ ◎ Practice│ [ Overview | Topics ]                                         │
│ ↗ Progress│ ┌──────────────────────────────────┐ ┌──────────────────────┐ │
│           │ │ Your path                        │ │ Your week            │ │
│           │ │ 5 of 14 steps done               │ │ ● ● ● ○ ● ○ ○        │ │
│           │ │ ▰▰▰▰▰▱▱▱▱▱▱▱▱▱                   │ │ M T W T F S S        │ │
│           │ │ 23 problems solved               │ │ 4 days, 9 problems   │ │
│           │ │ Next: Step 6, Sliding Window  →  │ │                      │ │
│           │ └──────────────────────────────────┘ └──────────────────────┘ │
│           │ ┌───────────────────────────────────────────────────────────┐ │
│           │ │ Badges                                       See all (31) │ │
│           │ │ [◆ First solve]  [◆ 3 days in a row]  [◇ Step 5 done]     │ │
│ ⚙ Settings│ └───────────────────────────────────────────────────────────┘ │
└───────────┴───────────────────────────────────────────────────────────────┘
```

### Progress: Topics (list first)

```
│ [ Overview | Topics ]                         [ List | Show as map ]      │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ Weakest first                                                         │ │
│ │ Coding basics (implementation)  Weak       ▰▱▱▱▱▱▱▱▱▱  8/100           │ │
│ │   Shows up in 43% of problems at your level · [Watch] [Practise]      │ │
│ │ Greedy                          Weak       ▰▱▱▱▱▱▱▱▱▱ 10/100           │ │
│ │ Try everything (brute force)    Weak       ▰▱▱▱▱▱▱▱▱▱ 10/100           │ │
│ │ Strings                         Getting there ▰▰▰▰▱▱▱▱ 45/100          │ │
│ │ Arrays & hashing                Strong     ▰▰▰▰▰▰▰▱▱▱ 72/100           │ │
│ │ Graph traversal                 Not tried yet                         │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
```

---

## 2e. What stays the same

Nothing is lost. Every change is a rename, a move, a fold, or a delay until the feature is unlocked.

**Data and sync (unchanged):**
- `src/adapters/*` (Codeforces API, the isolated LeetCode GraphQL), the sync pipeline, the SQLite schema and every migration, the cache, the stale-marking and offline mode.
- Handles and prefs: `mode`, `videoLang`, `followedSheet`, `onboarded`, `contestsSeen`, the `learn` history.
- The Preview sandbox and the Debug page.

**Engine (unchanged logic):**
- Topic strength, recommendations (the mix, by topic, upsolve), the quests and XP economy, levels, the 31 achievements, streaks, Beginner Path unlocking (`path.ts`), `lessonNext`, sheet ticks (auto, manual, bulk, untick) and `CONTESTS_MILESTONE_STEP`.
- New: one small unlock table for the beginner milestones, next to `CONTESTS_MILESTONE_STEP`.
- XP keeps accruing for beginners even while the level is hidden, so nothing is lost when it appears.

**Content (unchanged):**
- The six sheets' JSON, the 14 lessons, all 147 verified videos, `check:links`, the CSP and the VideoPlayer.
- Grouping videos by path step and deduping them is a *view* over the same data.

**Routes:**
- Every current route keeps working, including `/progress/topics`, `/progress/achievements`, `/practice/mix`, `/practice/sheets/:id`, `/learn/path/:step`, `/learn/watch/:id`, `/topics/:id`, the legacy redirects and the tray links.
- Only labels and what each page leads with change.

**Where each moved piece goes:**

| Feature | Now | v1.4 |
|---|---|---|
| Quests | Today card + top bar pill | Today's goals card (smart; beginners after step 3) |
| Today's mix | Today card + Practice tab | Practice → Today's problems; Today shows the next one |
| Work on next | Today card | The Do this next picks + Practice → More by topic |
| CF rating hero | Today | Today (compact) |
| LeetCode card, Activity heatmap | Today | Progress → Overview |
| Where you stand | Today | Progress → Topics (list) |
| Later contests | Today | Contests |
| Followed sheet card | Today + Practice → Sheets | Practice → Sheets; its next problem feeds Do this next |
| Upsolve | Practice | Practice → Unfinished problems |
| By topic | Practice | Practice → More by topic (folded) |
| Topics map (skill tree) | Progress tab | Progress → Topics → Show as map |
| Topic Detail panel | Over any screen | Same, opens over Learn too, with stats under Details |
| Achievements | Progress tab | Badges card on Overview + See all (same route) |
| Level, XP | Top bar + Overview + Achievements | Top bar (Level N) + Overview |
| Weekly goals, weekly review | Progress → Overview | Same (tracker mode) |
| Video library | Learn (open) | Learn (open in smart, folded for beginners) |
| Tip tour | 4 or 6 tips | 1 coach mark + "New" notes; 3 tips for smart |
| Shortcuts, Ctrl+K, `?`, Ctrl+B, Ctrl+R | — | Same keys; Ctrl+2 and Ctrl+3 swap once in smart mode |
| Themes, reward moments, the no-confetti rule | — | Unchanged |

---

## Suggested order of work (for when v1.4 is implemented)

1. **Words and the top bar** (cheap, high impact): the renames in 2c, the labelled top-bar items, and hiding the quest, streak and level items for beginners until they're unlocked.
2. **Beginner onboarding and the Solve how-to**: no account fields on Welcome, the Start button above the fold, the "How to solve on LeetCode" panel and the inline Connect.
3. **No empty screens for beginners**: Practice → lesson problems, Progress → Your path / Your week / Badges, the Topics list from the path.
4. **Smart Today down to three cards**, with the moved cards going to Progress and Contests, and the Practice row ⋯ menu.
5. **One sidebar order**, the tour replaced by the coach mark and "New" notes, and `TOUR_VERSION` bumped.
6. **Learn library**: grouped by step for beginners, deduped, plain topic names.

Before step 1, decide whether the smart-mode Ctrl+2/Ctrl+3 swap is worth the one-time relearning. The alternative is to keep the smart order and only fix beginner mode.

---

## Also noticed (not usability, worth checking)

- In the browser-mode smart run (handle `enkrid`, 7 rated rounds, rating 982), the CF hero said **Solved 0**, Topic Detail said "0 Codeforces, 2 LeetCode", and every past contest showed "Solved –". It may be a browser-mode artefact of the CF submissions fetch, but it should be checked in the real app. If it's real, the "Sharpen on Codeforces" recommendations are being built without any CF solve history.
- Smart Learn's "Suggested for you: Implementation" picked NeetCode's *Big-O Notation* video. The Implementation topic's video mapping in `resources.json` looks too broad.

---

## Screenshot index

| File | What |
|---|---|
| `b01-welcome` | First launch |
| `b02-welcome-new-selected` | "Yes, I'm new" picked; the Start button is below the fold |
| `b03-tour-1` … `b03-tour-4` | Beginner tour (Learn → Practice → Progress → Today) |
| `b04-today` | Beginner Today |
| `b05-learn`, `-2` … `-5` | Learn: Continue, roadmap, library (scrolls about 6,900px) |
| `b06-lesson`, `-2`, `-3` | Lesson step 1: Watch, Read, Solve |
| `b07-practice-sheets`, `-2` | Practice → Sheets (lands here in Beginner mode) |
| `b08-sheet-a2z`, `-2`, `-3` | Striver A2Z sheet page |
| `b09-practice-mix` | Today's mix, empty for a beginner |
| `b10-progress-overview`, `b11-progress-topics`, `b12-progress-achievements` | Progress tabs, all empty for a beginner |
| `b13-contests-direct` | `/contests` for a beginner, with no active sidebar item |
| `b14-settings`, `-2` … `-4` | Settings |
| `b15-ctrlk`, `b15-ctrlk-array` | Ctrl+K, empty and searching "array" |
| `b16-shortcuts`, `b17-sidebar-collapsed` | `?` sheet; collapsed sidebar |
| `s01-welcome-practise` | Onboarding, "No, I already practise" |
| `s02-first-sync`, `s03-first-sync-done` | First sync, with its 12-line checklist |
| `s04-tour-1` … `s04-tour-6` | Smart tour |
| `s05-today`, `-2` … `-4` | Smart Today (8 cards, scrolls about 1,600px) |
| `s06-practice-mix`, `-2` … `-4` | Practice → Today's mix, Upsolve, By topic |
| `s07-practice-sheets`, `s08-sheet-neetcode`, `-2` | Sheets list and the NeetCode 150 page |
| `s09-learn`, `-2`, `-3` | Smart Learn |
| `s10-progress-overview`, `-2` | Rating, Level, This week, Weekly review |
| `s11-progress-topics`, `s12-topic-detail` | Topics map and the Topic panel |
| `s13-progress-achievements`, `-2`, `-3` | Achievements |
| `s14-contests`, `-2`, `-3` | Contests |
| `s15-settings`, `-2` … `-4` | Settings |
| `s16-ctrlk` | Ctrl+K (smart) |
| `s17-level-tooltip` | The level badge tooltip (Level 7 · Loop Apprentice, XP) |
