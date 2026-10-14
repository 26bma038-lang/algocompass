# AlgoCompass

A Windows desktop app that tracks the user's competitive programming on Codeforces (`enkrid`) and LeetCode (`xfO61DFAh6`). It analyzes topic strengths, recommends what to study next, and keeps the user consistent. **The CF rating climb is the goal. LeetCode is where new topics are learned, and Codeforces is where they get sharpened.** CF contests are the main event, and LC contests are listed as secondary.

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

## Screens (planned)

| Screen | Purpose |
|---|---|
| **Home Base** | Daily check-in. Shows CF rating and the ascent bar, the streak, today's quest, and the next contest. It must answer "am I on track today?" in about 2 seconds. |
| **Skill Tree** | Topic graph (@xyflow/react). Nodes show mastery rings. |
| **Topic Detail** | One topic's strength, history, recommended LC (learn) and CF (sharpen) problems. |
| **Quests** | Daily and weekly goals, XP. |
| **Contests** | Upcoming and past CF contests first, LC contests secondary. Reminders. |
| **Achievements** | Level, unlocked achievements. |
| **Settings** | CF and LC handles (tauri-plugin-store), notifications, autostart. |

## Gamification and reward rules

- **No confetti. Ever.** No XP popups on routine clicks, and no looping motion that isn't tied to data.
- Quest completion and level-ups use a **restrained reward moment** that fits DESIGN.md: a short aura pulse (the accent Aura glow) on the quest card, plus the XP bar filling with a number ticker. Keep it within DESIGN.md's motion durations. Bigger ceremonies (up to 1.2s) are only for rank promotions (the "Aura Shift") and achievement unlocks. They can be skipped with a click or Esc, and they never block input.
- The accent color is always the user's real current CF rank color (`--accent`). See "The Earned Light Rule" in DESIGN.md.

## Tooling rules

- **context7:** Before writing code that uses Tauri 2 (core or any plugin), React Flow (@xyflow/react), shadcn/ui, TanStack Query, Drizzle/tauri-plugin-sql, Framer Motion or Recharts, look up the current docs with context7. Never rely on memory for Tauri plugin APIs or capability/permission config.
- **frontend-design:** Use it to decide the aesthetic direction for any NEW screen before building it.
- **impeccable:** Use it to maintain the design system (DESIGN.md) and to critique and polish every screen after it's built.
- **21st:** Before hand-building a common UI component (sidebar, command palette, animated card, number ticker, glow/spotlight effect, progress ring, badge), search 21st.dev for a good one and adapt it to our design tokens. Never paste a component that clashes with DESIGN.md.
