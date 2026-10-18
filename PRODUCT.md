# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Windows desktop app built with Tauri 2. The UI is a web view, so web conventions apply, inside a frameless window with a custom title bar. The minimum window size is 1100x700. There are no mobile targets.)

## Stack

Tauri 2 + React 18 + Vite + TypeScript (strict), Tailwind, shadcn/ui, Framer Motion, Recharts, @xyflow/react, Zustand, TanStack Query, tauri-plugin-sql (SQLite), tauri-plugin-http, tauri-plugin-notification, tauri-plugin-autostart, tauri-plugin-store, and the Tauri tray. The user chose this stack.

## Users

A single user per install, one of three kinds (v1.3):

- **Competitive programmers** (smart mode, the original user). They enter their Codeforces handle (required in this mode) and LeetCode username (optional). They open the app as a **quick daily check-in**, usually from the tray: the streak, today's quests and their rating progress, then they close it. Visits last seconds, not minutes. Deeper Topics map and topic exploration is occasional.
- **Beginners** who are new to DSA (Beginner mode). They answer "New to DSA? Yes" and may enter no handles at all. They need to start learning in under a minute without deciding where to start. Today is one Start here card for the next Beginner Path lesson (watch, read, solve), with videos in English or Hindi. Lesson visits are longer, a video plus a few problems.
- **Sheet followers**, in either mode. They work through a popular DSA sheet (Striver's A2Z or SDE Sheet, NeetCode 150, Blind 75, Love Babbar 450) and want progress that mostly ticks itself from their LeetCode and Codeforces solves, plus a one-click tick for the rest.

## Product Purpose

The app tracks competitive programming across Codeforces and LeetCode, analyzes topic strengths, recommends what to study next, and keeps the user consistent. Success means a rising Codeforces rating and an unbroken daily practice habit. For a beginner, success is finishing the Beginner Path's steps one after another. For a sheet follower, it's a sheet that keeps moving toward 100%.

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

- Screens (v1.2): Today, Practice, Progress (Overview · Topics map · Achievements), Contests, Settings, and the Topic Detail side panel. v1.3 adds tabs inside Practice (Today's mix · Sheets · Beginner Path), not new screens.
- Two modes (v1.3): Smart (default; every install from before v1.3 stays here) and Beginner. They're chosen at onboarding and changeable in Settings.
- Sheets come only from each creator's own published list, credited with a link to the original. No other tracker's (e.g. Codolio's) data, text or design is used.
- Videos are YouTube embeds (youtube-nocookie.com), verified by oEmbed. They're never downloaded or rehosted.
- Platform API calls go only through adapters.
- Open (undecided): the exact recommendation algorithm, quest and XP economy rules, and the achievement catalogue.

## Brand Commitments

- The name is "AlgoCompass". The visual identity is "Skill Tree RPG" (the user pinned it).
- The app wears a clean Light or Dark theme (System by default, following Windows) with one restrained indigo accent. The user's current Codeforces rank colour marks their rank: the rating number, the rank chip and progress to the next rank.

## Evidence on Hand

- The user's own handles, entered on first launch. All other data comes from the platforms at runtime. Don't fabricate stats, ratings or problem counts anywhere a real value is expected. Demo or empty states must say they are empty.

## Product Principles

1. **Glanceable first.** A daily check-in answers "am I on track today?" within a couple of seconds.
2. **Never slow.** Nothing stands between the user and their numbers. Rewards are quick and never block input.
3. **Never dry.** Progress should feel earned and alive. The app gives a reason to come back tomorrow.
4. **CF is the goal, LC is the classroom.** Recommendations route new topics to LC and hardening to CF.
5. **Honest data.** Show real data, stale data marked as stale, or nothing. Never fake numbers.
6. **No decision before the first step (v1.3).** A beginner is never asked where to start: the next lesson is always one button away.
