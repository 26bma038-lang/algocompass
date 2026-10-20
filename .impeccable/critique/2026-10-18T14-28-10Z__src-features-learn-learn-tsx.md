---
target: Learn, lesson page and sidebar
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\dsa tracker\\src\\features\\learn\\Learn.tsx"
target_fingerprint: "sha256:753142eb503a10134504461aca7ecbdedca459dee772ea77a10cd08078953784"
target_path: "C:\\dsa tracker\\src\\features\\learn\\Learn.tsx"
timestamp: 2026-10-18T14-28-10Z
slug: src-features-learn-learn-tsx
---
⚠️ DEGRADED: single-context (user asked for no background agents)

Targets: Learn (src/features/learn/Learn.tsx), lesson focus page (Lesson.tsx), watch page (Watch.tsx), mode-aware sidebar (Sidebar.tsx). Light and Dark at 1100x700, beginner preview and smart mode with a real sync.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 4 | Stepper checks, n/3, toasts on step done, sidebar active state, breadcrumb |
| 2 | Match system / real world | 3 | "I've watched the video" is self-reported; plain language elsewhere |
| 3 | User control and freedom | 3 | Back + breadcrumb everywhere; unticking works; no undo for "I've read it" (harmless) |
| 4 | Consistency and standards | 3 | Reuses SegmentedTabs/Pill/CardHeader/section strip; library chip vs segmented mix |
| 5 | Error prevention | 3 | Locked steps can't be worked; extras never block a step |
| 6 | Recognition over recall | 4 | Continue learning, labels on every nav item, topic filter chip says what's shown |
| 7 | Flexibility and efficiency | 3 | Ctrl+1..5 per mode, Ctrl+K "Watch <topic> videos"; no keyboard shortcut for Next |
| 8 | Aesthetic and minimalist | 3 | One primary per screen; "Topic details" repeated on each library group |
| 9 | Error recovery | 3 | "No videos match" with Clear filters; bad lesson/video links get an empty state |
| 10 | Help and documentation | 3 | Tour v3, sidebar hover hints, card descriptions |
| **Total** | | **32/40** | **Good** |

Design specificity: authored for this product. The lesson is a three-step trail on the Float plane, the roadmap reuses the chamfered section strip, and step 9 says "Unlocks Contests", which only this app can say. The library is dense rows with real thumbnails, not a card grid.
Deterministic scan: impeccable detect on src/features/learn, Sidebar.tsx, TopicVideos.tsx: 0 findings. Browser overlay: not injected (headless Playwright only, no user-visible tab).

Priority issues
- [P0, fixed] The "Step done" toast sat bottom-right on top of the sticky Next button: "Next step" couldn't be clicked for ~4 s (dead end). Toasts now sit above the bar on lesson pages.
- [P1, fixed] A beginner's tour ended on Progress, away from Start here. It now ends on Today ("Ready? Press it now").
- [P1, fixed] At 1100x700 the lesson video's title and Mark as watched sat under the Next bar. The header is tighter and the video is sized to the viewport (calc((100vh - 380px) * 16/9)).
- [P2, fixed] The library toolbar wrapped the topic picker onto its own row at 1100px. Search now flexes; one row.
- [P3, open] When two steps finish quickly, stacked toasts can cover a Solve row's Open button on the lesson page. Real use finishes steps far apart.

Persona red flags
- Jordan (first-timer): none blocking. Every screen has one primary button; the lesson's Next always says what happens.
- Alex (power user): no shortcut for Next (Enter on the focused button works); Ctrl+K "Watch <topic> videos" and Ctrl+3 to Learn in smart mode cover the rest.
- Sam (keyboard/screen reader): the stepper is an ordered list with aria-current; the library's language and status filters use radio/pressed semantics; the locked roadmap rows have aria-labels that mention the Contests milestone.

Minor: "Topic details" on every library group is repetitive; "I've watched the video" can be pressed without playing (same honesty model as hand ticks).
