---
target: app shell
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\dsa tracker\\src\\components\\shell\\AppShell.tsx"
target_fingerprint: "sha256:614a895f3ccec79dd69cecbeee72d7f2ae57666596656b2f0a8f9c7263341291"
target_path: "C:\\dsa tracker\\src\\components\\shell\\AppShell.tsx"
timestamp: 2026-10-14T09-07-50Z
slug: src-components-shell-appshell-tsx
---
Method: dual-agent (A: design review · B: detector + headless Edge captures; live overlay skipped, Chrome extension not connected)

## Design Health Score: 24/40 (Acceptable)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Sync status was static text; 2px ascent track invisible |
| 2 | Match System / Real World | 3 | Topic Detail titled with raw slug |
| 3 | User Control and Freedom | 2 | No sync control; Settings had no discard |
| 4 | Consistency and Standards | 3 | Ghost vs outline for the same navigation action; flat heading sizes |
| 5 | Error Prevention | 3 | Handle validation solid |
| 6 | Recognition Rather Than Recall | 2 | Icon-only nav with ambiguous glyphs |
| 7 | Flexibility and Efficiency | 1 | No keyboard shortcuts |
| 8 | Aesthetic and Minimalist Design | 3 | Clean but dry; copy repetition |
| 9 | Error Recovery | 3 | Settings errors specific with icon + fix |
| 10 | Help and Documentation | 2 | Empty states explain the future, not the next step |

## Design Specificity
The system is authored (rank-driven accent, chamfered level plate, Chakra Petch numerals); the rendered surface read generic because every signature element was drawn at zero. Detector: 2 advisories (undocumented #2a3a78 in AmbientBackground; 17px off-ramp in LevelBadge).

## Priority Issues (all fixed in this run)
- [P1] Home Base did not answer "am I on track today?" → Today card leads (streak / solved today), quest + next contest beside it, rating below.
- [P1] No way out of "not synced" → focusable Sync control with explanation; repeated sync copy varied.
- [P1] ink-faint failed AA (~3.3:1) → token retuned to #7A85A3.
- [P2] Streak/Level were role-less focusable divs; window buttons hid focus → now links to Quests/Achievements, clip-path moved inside so focus ring shows; caption buttons out of tab order with inset ring.
- [P2] Flat hierarchy / dry empty states → empty-state titles demoted to 16px with accent icon tile; Skill Tree shows a locked silhouette; Topic Detail titled with humanized topic.

## Persona Red Flags
Alex: no shortcuts (fixed: Ctrl+1–5, Ctrl+, , Ctrl+B). Sam: generic-div aria-labels, no route announcements (fixed: links + polite live region). Daily check-in user: daily signals buried in the top bar (fixed: Today card).

## Minor
Unknown routes now redirect home; humanized topic titles; reduced motion now also shortens tooltip animations; nebula opacity raised slightly.
