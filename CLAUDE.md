# AlgoCompass

A Windows desktop app that tracks the user's competitive programming on Codeforces and LeetCode (handles are entered on first launch; there are no built-in defaults). It analyzes topic strengths, recommends what to study next, and keeps the user consistent. **The CF rating climb is the goal. LeetCode is where new topics are learned, and Codeforces is where they get sharpened.** CF contests are the main event, and LC contests are listed as secondary.

- Product truth (users, purpose, principles): `PRODUCT.md`
- Visual system (tokens, type, motion, the "Rank Aura" direction): `DESIGN.md`. Read it before touching any UI. Its tokens are normative.

## Stack

- **Shell:** Tauri 2 (Rust), with a frameless window (min 1100x700), a custom draggable title bar, and the Tauri system tray.
- **Frontend:** React 18, Vite, TypeScript in `strict` mode.
- **UI:** Tailwind (with DESIGN.md tokens exposed as CSS variables), shadcn/ui, Framer Motion, Recharts, @xyflow/react (Skill Tree).
- **State/data:** Zustand (UI and app state), TanStack Query (remote and async data, caching, refetch).
- **Tauri plugins:**
  - `tauri-plugin-sql` (SQLite): local cache and history
  - `tauri-plugin-http`: all network calls
  - `tauri-plugin-notification`: streak and contest reminders
  - `tauri-plugin-autostart`: launch on login
  - `tauri-plugin-store`: settings (handles, preferences)

## Folder layout

```
src/
  adapters/        Platform API clients. The ONLY place that talks to Codeforces or LeetCode.
    codeforces/    Official CF API.
    leetcode/      Unofficial LeetCode GraphQL. Isolated, because it can break at any time.
  engine/          Pure analysis logic: topic strength, recommendations, streaks, XP/levels, quests.
                   No I/O and no React. Unit-testable.
  data/            SQLite schema and queries (tauri-plugin-sql), the store wrapper, TanStack Query hooks.
  features/*/      One folder per screen: its route component, local components and hooks.
  components/ui/   shadcn/ui primitives and shared design-system components (adapted to DESIGN.md).
src-tauri/         Rust side: window, tray, plugin registration, capabilities/permissions.
```

## Architecture rules

- **Platform API calls go only through `src/adapters`.** Features, engine and UI never call `fetch` or the HTTP plugin directly for CF or LC data, and never import platform response shapes.
- Adapters normalize platform responses into shared domain types (problems, submissions, contests, ratings, tags). Everything above the adapter layer is platform-agnostic.
- **LeetCode uses an unofficial GraphQL API.** Keep it fully isolated in `src/adapters/leetcode/`, validate responses defensively, and fail soft: an LC outage degrades LC data, and nothing else breaks.
- Data flow: adapters → `data/` (cache in SQLite) → `engine/` (pure analysis) → features (rendering). The app works offline from the cache, and stale data is marked as stale.
- Never fabricate numbers. If real data is missing, show an honest empty or stale state.

## Screens (v1.2 simplify: four screens)

| Screen | Purpose |
|---|---|
| **Today** (Ctrl+1, `/`) | Daily check-in. Today's quests + streak beside today's mix at the top, then the CF rating hero with the next round, Work on next, LeetCode, activity, standing and later contests. It must answer "what do I do today?" in about 2 seconds. |
| **Practice** (Ctrl+2) | What to solve: today's mix (with feedback and New mix), Upsolve, problems by topic. |
| **Progress** (Ctrl+3) | Tabs, each its own route: **Overview** (`/progress`: rating chart, level, weekly goals, weekly review) · **Topics map** (`/progress/topics`: the Skill Tree canvas) · **Achievements** (`/progress/achievements`). |
| **Contests** (Ctrl+4) | Upcoming CF rounds first, LC contests secondary, "I'll attend" reminders, past results. |
| **Topic Detail** | A side panel over any screen. `/topics/:id` deep links open it on the Topics map. |
| **Settings** (Ctrl+,) | Handles, theme, weekly goals, notifications, launch on startup. Bottom of the sidebar. |

- Nav lives in `src/components/shell/nav.ts` (labels, shortcuts, one-line descriptions used for the sidebar hover hint and the subtitle under each title). v1.1 routes (`/skill-tree`, `/quests`, `/achievements`) redirect via `LEGACY_REDIRECTS`; keep them.
- The sidebar shows labels by default. A one-time 4-step tip tour (`TipTour.tsx`, pref `tipTourSeen`) introduces the screens; bump `TOUR_VERSION` to show it again after a nav change.
- The tray menu has links to the four screens (`tray-navigate` event).

App-wide: Ctrl+K command palette, Ctrl+R sync, `?` shortcut sheet, Ctrl+B sidebar, Ctrl+Shift+D hidden Debug page (raw tables, ceremony previews).

## Build and performance rules

- Run cargo/tauri from **PowerShell**, never Git Bash (its `link` shadows MSVC's linker).
- Every screen except Today is `React.lazy` in `src/router.tsx`; keep new screens lazy. Recharts (Progress → Overview) is lazy too.
- `import.meta.env.TAURI_ENV_PLATFORM` (via `envPrefix` in vite.config.ts) is set by the Tauri CLI. Use it to keep browser-only code (the sql.js driver) out of the desktop bundle.
- Never edit an applied migration in `src-tauri/migrations/` (sqlx checksums them). Add a new one.
- The bundle identifier stays `com.algocompass.app`: the user's data folder is named after it (see PROGRESS.md, v1.0).

## Gamification and reward rules

- **No confetti. Ever.** No XP popups on routine clicks, and no looping motion that isn't tied to data.
- Quest completion and level-ups use a **restrained reward moment** that fits DESIGN.md: a short aura pulse (the accent Aura glow) on the quest card, plus the XP bar filling with a number ticker. Keep it within DESIGN.md's motion durations. Bigger ceremonies (up to 1.2s) are only for rank promotions (the "Aura Shift") and achievement unlocks. They can be skipped with a click or Esc, and they never block input.
- **Themes and colour roles (v1.2):** Light, Dark, or System (default; follows Windows live) in `src/lib/theme.ts`, tokens on `<html data-theme="light|dark">` in globals.css. One restrained indigo accent (`--accent`). Old theme ids migrate to System. The user's real CF rank colour (`--rank`) is reserved for rank elements only (rating number, rank chip, rank progress) and has a darker set in Light. Every new colour must be a token with a value for both themes and meet WCAG AA; never hard-code dark-only colours. See "Light and Dark (v1.2)" in DESIGN.md.
- **Layout (v1.1):** every screen is a bento grid (12 columns, 24px gaps, `glass-card` panels with 24px padding). Use `CardHeader` (`src/components/CardHeader.tsx`) for card titles (22px Chakra Petch), descriptions and count pills. See "Bento across the app" in DESIGN.md.

## Tooling rules

- **context7:** Before writing code that uses Tauri 2 (core or any plugin), React Flow (@xyflow/react), shadcn/ui, TanStack Query, Drizzle/tauri-plugin-sql, Framer Motion or Recharts, look up the current docs with context7. Never rely on memory for Tauri plugin APIs or capability/permission config.
- **frontend-design:** Use it to decide the aesthetic direction for any NEW screen before building it.
- **impeccable:** Use it to maintain the design system (DESIGN.md) and to critique and polish every screen after it's built.
- **21st:** Before hand-building a common UI component (sidebar, command palette, animated card, number ticker, glow/spotlight effect, progress ring, badge), search 21st.dev for a good one and adapt it to our design tokens. Never paste a component that clashes with DESIGN.md.
