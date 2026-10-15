# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Windows desktop app built with Tauri 2. The UI is a web view, so web conventions apply, inside a frameless window with a custom title bar. The minimum window size is 1100x700. There are no mobile targets.)

## Stack

Tauri 2 + React 18 + Vite + TypeScript (strict), Tailwind, shadcn/ui, Framer Motion, Recharts, @xyflow/react, Zustand, TanStack Query, tauri-plugin-sql (SQLite), tauri-plugin-http, tauri-plugin-notification, tauri-plugin-autostart, tauri-plugin-store, and the Tauri tray. The user chose this stack.

## Users

A single user per install: a competitive programmer who enters their own Codeforces handle (required) and LeetCode username (optional) on first launch. They open the app as a **quick daily check-in**, usually from the tray. They look at the streak, today's quest and their rating progress, then close it. Visits last seconds, not minutes. Deeper Skill Tree and topic exploration is occasional.

## Product Purpose

The app tracks competitive programming across Codeforces and LeetCode, analyzes topic strengths, recommends what to study next, and keeps the user consistent. Success means a rising Codeforces rating and an unbroken daily practice habit.

## Positioning

AlgoCompass is one personal compass across both platforms, with distinct roles for each:
- **LeetCode is where new topics are learned.**
- **Codeforces is where topics are sharpened until they're strong.** The CF rating climb is the main objective.
- Contests: **Codeforces contests are the main event**. LeetCode contests are listed too, as secondary.

## Operating Context

- Launched at startup (autostart), and it lives in the system tray. Notifications nudge before the streak breaks and before contests.
- Data comes from the official Codeforces API and LeetCode's unofficial GraphQL API. The LeetCode source is fragile and isolated behind an adapter.
- It works offline from a local SQLite cache and syncs when online.

## Capabilities and Constraints

- Screens: Home Base, Skill Tree, Topic Detail, Quests, Contests, Achievements, Settings.
- Platform API calls go only through adapters.
- Open (undecided): the exact recommendation algorithm, quest and XP economy rules, and the achievement catalogue.

## Brand Commitments

- The name is "AlgoCompass". The visual identity is "Skill Tree RPG" (the user pinned it).
- The app wears a vibrant theme the user picks (Neon Arcade, Ember or Ocean). The user's current Codeforces rank colour marks their rank: the rating number, the rank chip and progress to the next rank.

## Evidence on Hand

- The user's own handles, entered on first launch. All other data comes from the platforms at runtime. Don't fabricate stats, ratings or problem counts anywhere a real value is expected. Demo or empty states must say they are empty.

## Product Principles

1. **Glanceable first.** A daily check-in answers "am I on track today?" within a couple of seconds.
2. **Never slow.** Nothing stands between the user and their numbers. Rewards are quick and never block input.
3. **Never dry.** Progress should feel earned and alive. The app gives a reason to come back tomorrow.
4. **CF is the goal, LC is the classroom.** Recommendations route new topics to LC and hardening to CF.
5. **Honest data.** Show real data, stale data marked as stale, or nothing. Never fake numbers.
