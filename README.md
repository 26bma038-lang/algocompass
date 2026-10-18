# AlgoCompass

**Your competitive programming compass: one desktop app for Codeforces and LeetCode that finds your weak topics, tells you what to solve next, and keeps your streak alive. New to DSA? It teaches you step by step, with video lessons in English or Hindi. Following Striver's A2Z or NeetCode 150? It ticks your progress for you.**

![AlgoCompass: Today](docs/screenshots/today.png)

**[Download for Windows](https://github.com/26bma038-lang/algocompass/releases/latest)** · Windows 10/11 · free · no account needed

## Why I built this

I practice on two sites. LeetCode is where I *learn* a topic (clean problems, good editorials), and Codeforces is where I *sharpen* it under contest pressure, which is where my rating lives. Neither site knows about the other, so there was no single answer to the questions I actually had every day:

- Which topics am I weak at, across **both** platforms?
- What should I solve **next**: something to learn on LeetCode, or something to sharpen on Codeforces?
- Am I staying consistent, or did I quietly skip three days?

AlgoCompass answers those in a two-second glance, from the tray, without logins or uploads. The Codeforces rating climb is the goal; LeetCode is the classroom.

## New in v1.3: start learning, or follow a sheet

**New to DSA?** Pick "Yes, I'm new" on the first screen and you're on Step 1 in under a minute. No handles are needed and there's nothing to decide.

![Today in Beginner mode: Start here](docs/screenshots/v1.3/today-beginner-dark.png)

- **The Beginner Path:** 14 steps in order, from loops and complexity through arrays, strings, hashing, two pointers, sliding window, stacks and queues, binary search, recursion, linked lists, trees, graphs (BFS/DFS) and greedy, to dynamic programming. Each step is a lesson:
  - **Watch:** a 10–25 minute video in **English or Hindi**, played inside the app.
  - **Read:** the pattern in five lines: when to use it, the idea, common mistakes.
  - **Solve:** a few easy problems.
  Watch the main video and solve the required problems to unlock the next step.
- **Sheets:** follow **Striver's A2Z**, **Striver's SDE Sheet**, **NeetCode 150**, **Blind 75** or **Love Babbar's DSA 450**, in their original order and sections.
  - **Ticking:** problems you solve on LeetCode or Codeforces tick themselves, in every sheet that lists them. Anything you solved elsewhere (GFG, takeUforward, Code360) is one click.
  - **Bulk import:** "Mark sections done" catches you up if you're already halfway through.
  - **Next in this sheet:** picks the next problem in order, leaning toward your weak topics.
  - **Notes:** private notes per problem, searchable.
- **Video lessons:** every topic has verified videos (intro, full lecture, problem walkthrough) in English and Hindi, from takeUforward, NeetCode, Errichto, William Fiset, Abdul Bari, CodeHelp, Aditya Verma, Apna College, Luv and others. They play in the app through YouTube's privacy-enhanced player, and you can mark each one watched.

| | |
|---|---|
| ![A lesson: watch, read, solve](docs/screenshots/v1.3/lesson-light.png) | ![The Beginner Path](docs/screenshots/v1.3/path-dark.png) |
| ![Sheets](docs/screenshots/v1.3/sheets-light.png) | ![Striver's A2Z with Next in this sheet](docs/screenshots/v1.3/sheet-dark.png) |

**Already practising?** Pick "No" and AlgoCompass is the Codeforces + LeetCode tracker it always was, with the sheets in Practice. Switch between the two modes any time in Settings.

### Sheet credits

The sheets belong to their creators. AlgoCompass only links to them and tracks your progress:
- **Striver's A2Z DSA Sheet** and **Striver's SDE Sheet** by Striver (Raj Vikramaditya), [takeUforward](https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet).
- **NeetCode 150** by [NeetCode](https://neetcode.io/practice).
- **Blind 75** by Yangshun Tay, from the [original Blind post](https://www.teamblind.com/post/New-Year-Gift---Curated-List-of-Top-75-LeetCode-Questions-to-Save-Your-Time-OaM1orEU) (2018).
- **DSA 450** by [Love Babbar](https://drive.google.com/file/d/1FMdN_OCfOI0iAeDlqswCiC2DZzD4nPsb/view).

Each sheet is built from its creator's own published list by `npm run gen:sheets`. Every LeetCode and Codeforces link is verified against the platforms, and every sheet in the app shows "Sheet by …" with a link to the original. Videos are embedded from YouTube and never downloaded or rehosted.

#### Features

Four screens with plain names: **Today, Practice, Progress, Contests**, plus Settings. A short tip tour shows you around on first launch.

![The tip tour](docs/screenshots/tour.png)

### Today: the daily check-in
Answers "what do I do today?" at a glance:
- **At the top:** today's three quests with your streak, beside today's mix (the problems to open right now).
- **The hero:** your Codeforces rating in your real rank colour, a rating sparkline, progress to the next rank, and a countdown to the next round.
- **Below:** the topic to work on next, LeetCode, your activity heatmap, where you stand, and the later contests.

### Practice: what to solve
Practice has tabs: **Today's mix** and **Sheets** (and the **Beginner Path** first, in Beginner mode).
- **Today's mix:** 3 Codeforces problems, one for each of your weakest topics, rated just above your rating. Plus 2 LeetCode problems for the next topic you're learning.
- **Upsolve:** problems you tried and never got accepted, and problems you didn't solve in a recent contest.
- **By topic:** every weak topic with its own problems.

Feedback (Skip / Too easy / Too hard) moves a topic's difficulty window up or down. Quests are picked from the mix and check themselves off when a sync sees the accepted submission.

![Practice](docs/screenshots/practice.png)

### Progress: how you're growing
Three tabs:
- **Overview:** your full rating chart against the rank bands, your level and XP, weekly goals with progress rings, and a weekly review every Sunday.
- **Topics map:** 33 topics on a prerequisite graph (built with React Flow). Each node has a mastery ring scored 0–100 from your own solves. Topics unlock as their prerequisites reach Developing. The three most urgent ones lead as "Work on next" tiles, each with its reason.
- **Achievements:** your level and title (Novice Coder → Pattern Hunter → Algorithm Smith…), plus 31 achievements across Consistency, Codeforces, LeetCode, Topics and Fun. Locked ones show your progress, e.g. "Best streak 13/30". Rank promotions get a short "Aura Shift" moment; there's no confetti, ever.

![Progress overview](docs/screenshots/progress.png)

![Topics map](docs/screenshots/topics-map.png)

![Achievements](docs/screenshots/achievements.png)

### Topic Detail
Open any topic to see its strength and where it comes from (Codeforces vs LeetCode), hardest solve, struggle rate, what you've solved and what's still open. It also lists recommended problems (LeetCode to learn, Codeforces to sharpen) and curated resources (CP-Algorithms, USACO Guide, NeetCode, CSES and more).

![Topic Detail](docs/screenshots/topic.png)

### Contests
Upcoming Codeforces rounds come first, with LeetCode weekly and biweekly contests below them. Each shows a countdown, local start time, duration and division, plus a Register button. Mark "I'll attend" to get Windows reminders 1 hour and 10 minutes before. Past rounds show your rank, problems solved and rating change.

![Contests](docs/screenshots/contests.png)

### Ctrl+K, everywhere
A command palette to jump to any screen or topic, sync, or open today's mix or the next contest, all from the keyboard. Ctrl+1–4 switch screens, Ctrl+R syncs and `?` lists every shortcut.

![Command palette](docs/screenshots/palette.png)

### Settings
- Your handles and the theme.
- Weekly goals: Codeforces problems, LeetCode problems and contests per week.
- A toggle for each notification, with the evening reminder time.
- Launch on Windows startup.

![Settings](docs/screenshots/settings.png)

### Light and Dark
**System** (the default) follows your Windows light/dark setting and switches with it; you can also pin **Light** or **Dark**. Both are contrast-checked to WCAG AA, including the Codeforces rank colours, which stay on the things they belong to: your rating, your rank and your progress to the next rank.

| Light | Dark |
|---|---|
| ![Light theme](docs/screenshots/theme-light.png) | ![Dark theme](docs/screenshots/theme-dark.png) |

# Desktop
- Lives in the system tray, with a tray menu showing today's quest progress and links to each screen.
- Can launch on Windows startup, minimized.
- Windows notifications fire even while the window is hidden: contest reminders, an evening "streak at risk" nudge, and quest completions.
- Works offline from a local cache, and stale data is marked as stale.

### First launch
Answer "New to DSA?" and pick the lesson video language (English or Hindi).
- **Yes:** you start on the Beginner Path right away. A LeetCode username (optional) lets lesson problems tick themselves.
- **No:** enter your Codeforces handle (required) and LeetCode username (optional). Both are checked against the sites before the first sync starts, which takes about a minute.

![Welcome screen](docs/screenshots/v1.3/welcome-light.png)

## How it works

```
Codeforces API ─┐                       ┌─ topic engine ─┐
                ├─ adapters ─ SQLite ───┤                ├─ recommender ─ screens
LeetCode GQL ───┘   (normalize)  (cache)└─ quests / XP ──┘
```

1. **Adapters** (`src/adapters`) are the only code that talks to the platforms. They turn Codeforces and LeetCode responses into shared domain types, so nothing else knows either site's response format.
2. **Sync** stores everything in a local **SQLite** database:
   - It runs on start, every 2 hours, or on demand.
   - It's incremental: new submissions only, and the Codeforces problemset is cached for 24 hours.
   - Each platform fails independently.
3. **The topic engine** (`src/engine`, pure TypeScript, unit-tested) maps 38 Codeforces tags and 75 LeetCode tags onto 33 unified topics and scores each one 0–100:
   - **Codeforces solves** are weighted by the problem's rating relative to yours: 1× at your rating, ×2 for every +300, clamped to 0.2–4×.
   - **LeetCode solves** count Easy 1, Medium 2.5, Hard 5, at half weight (LeetCode is the classroom).
   - **Recency:** every solve decays with a **90-day half-life**, so a topic you haven't touched in months fades.
   - **Struggle:** a topic loses up to 30% for struggle (the share of your judged Codeforces submissions there that weren't accepted).
   - **Mastered** additionally needs a solve at or above your rating.
4. **The recommender** ranks topics by *how often they appear at your rating × weakness² × staleness*.
   - A topic stays in **Learn** mode (LeetCode, a curated Easy → Medium path) until you have 5 solves in it.
   - After that it's in **Sharpen** mode: unsolved Codeforces problems rated between your rating and +200, recent rounds first.
5. **Screens** render it all (React, TanStack Query over the cache), and quests, XP and achievements are derived from the same history.

**About LeetCode:** LeetCode has no public API, so AlgoCompass uses its **unofficial GraphQL endpoint** (the same one leetcode.com uses). It's isolated behind a single adapter that validates every field and fails soft. If LeetCode changes or blocks it, LeetCode data goes stale and everything else keeps working. LeetCode also only exposes your 20 most recent accepted solves, so older ones can be marked solved by hand.

## Download and install

1. Download the `AlgoCompass_…_x64-setup.exe` installer (or the `.msi`) from the **[latest release](https://github.com/26bma038-lang/algocompass/releases/latest)**.
2. Run it. The app isn't code-signed, so Windows SmartScreen will warn: click **More info → Run anyway**.
3. Enter your Codeforces handle (and optionally your LeetCode username) on the welcome screen.

Requires Windows 10 or 11 with the WebView2 runtime. It's already on Windows 11, and the installer fetches it on Windows 10 if needed.

## Build from source

**Prerequisites**
- [Node.js](https://nodejs.org/) 20 or newer, with npm
- [Rust](https://rustup.rs/) (stable, MSVC toolchain)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++** and a **Windows 11 SDK**

```powershell
git clone https://github.com/26bma038-lang/algocompass.git
cd algocompass
npm install
npm run tauri dev      # run the desktop app with hot reload
npm run tauri build    # installers in src-tauri/target/release/bundle/{nsis,msi}
```

Use PowerShell (or cmd), not Git Bash, for the Tauri and Cargo commands. Git Bash's `link` shadows the MSVC linker.

`npm run dev` also serves the UI in a plain browser. It uses an in-memory SQLite (sql.js) there and proxies LeetCode through Vite, which is handy for UI work.

### Running tests

```powershell
npm test               # type-check + unit tests (Vitest)
$env:CF_HANDLE="tourist"; $env:LC_HANDLE="<username>"; npm run test:live   # full sync against the real APIs
npm run check:links    # verify every link: articles, sheet problems (LeetCode + Codeforces) and every video
npm run gen:sheets     # rebuild src/data/sheets/*.json from the sheets' original sources
npm run fill:media     # refill video titles, channels and lengths (and path problems) from the platforms
```

`check:links` checks every LeetCode slug with LeetCode's GraphQL and every Codeforces id with `problemset.problems`. Every video must pass YouTube oEmbed with its exact title and channel. `--deep` also opens every takeUforward practice link.

The unit tests cover the adapters (with stubbed fetch), sync against a real SQLite schema, and all of the engine: strength scoring, the recommender, quests, XP and levels, achievements, reminder scheduling, contests and the command palette ranking.

## Tech stack

- **Shell:** [Tauri 2](https://tauri.app/) (Rust) with a frameless window, a system tray, and a reminder scheduler in Rust.
- **UI:** React 18, Vite, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Radix), Framer Motion, Recharts, React Flow (@xyflow/react), cmdk.
- **State:** Zustand for app state, TanStack Query for the data cache.
- **Tauri plugins:** sql (SQLite), http, store, notification, autostart, opener.
- **Data sources:** the official Codeforces API and LeetCode's unofficial GraphQL endpoint.

## Project structure

```
src/
  adapters/      Codeforces + LeetCode clients (the only code that touches the network)
  data/          SQLite schema access, sync, settings, TanStack Query hooks
    sheets/      The five sheets (generated from the original sources, verified)
    path/        The Beginner Path's 14 lessons
  engine/        Pure analysis: topics, strength, recommender, quests, XP, achievements, reminders,
                 sheets (ticks, progress, smart next) and the Beginner Path (unlocking)
  features/      One folder per screen (home, skill-tree, topic, practice, sheets, path, quests,
                 contests, achievements, settings, onboarding)
  components/    Shell (title bar, sidebar, top bar, palette) and shadcn/ui primitives
src-tauri/
  src/lib.rs     Window, tray, plugins, reminder scheduler
  migrations/    SQLite schema migrations
  capabilities/  Permission scope (only codeforces.com/api and leetcode.com/graphql)
docs/screenshots README images
DESIGN.md        The visual system ("The Rank Aura")
```

## Roadmap

- **AI coach:** a weekly plan in plain words from your topic report and contest results, plus explanations of *why* a submission got WA.
- **Revision queue:** spaced repetition for problems you struggled with, resurfacing at 3, 7 and 21 days.
- **Friends comparison:** add a few Codeforces handles and compare ratings, topic strengths and weekly solves.
- **Notes in the palette:** sheet notes (v1.3) searchable from Ctrl+K too, not just inside a sheet.
- **Rating predictor:** expected rating change during a live round, and a projection toward your next rank.
- **Mobile companion:** a read-only phone view of the streak, today's quests and the next round.

## Privacy

Everything stays on your computer.
- Your data lives in a local SQLite database and settings file in `%APPDATA%\com.algocompass.app`.
- The app only calls `codeforces.com/api` and `leetcode.com/graphql`, to read your **public** profiles. The Tauri permission scope enforces that.
- Lesson videos come from YouTube's privacy-enhanced player (`youtube-nocookie.com`). Nothing loads from YouTube until you press play, apart from the video's thumbnail (`i.ytimg.com`). The content security policy allows only those two YouTube hosts.
- Sheet ticks, notes and watched videos stay in the local database.
- No accounts, no analytics, no telemetry, and nothing is uploaded anywhere.

## License

Copyright (c) 2026 Sahil. All rights reserved. You may view the source code and download and use the released app for personal, non-commercial purposes. No part of the source code may be copied, modified, distributed, or used in other projects without prior written permission. See [LICENSE](LICENSE). Contributions: see [CONTRIBUTING.md](CONTRIBUTING.md).
