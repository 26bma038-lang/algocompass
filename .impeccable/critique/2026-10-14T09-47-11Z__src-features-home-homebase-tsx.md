---
target: home base dashboard
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:C:\\dsa tracker\\src\\features\\home\\HomeBase.tsx"
target_fingerprint: "sha256:1523bf4c60f3d80d3de448bdcb966e7db05b27e538237f1bc4b6770c79fde004"
target_path: "C:\\dsa tracker\\src\\features\\home\\HomeBase.tsx"
timestamp: 2026-10-14T09-47-11Z
slug: src-features-home-homebase-tsx
---
Method: dual-agent (A: design review · B: detector + headless Edge captures; live overlay skipped, Chrome extension not connected)

## Design Health Score: 26/40 (Acceptable) before fixes
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | "Nothing solved today" muted; tickers recounted from 0 |
| 2 | Match System / Real World | 3 | Topic scores had no scale |
| 3 | User Control and Freedom | 3 | Contest cards open browser without warning |
| 4 | Consistency and Standards | 2 | Two flame states for one streak; two hero numbers; CF line used accent |
| 5 | Error Prevention | 3 | Little input |
| 6 | Recognition Rather Than Recall | 2 | Reasons only in title=; radar repeated list |
| 7 | Flexibility and Efficiency | 2 | Tonight's contest below the fold at 1100x700 |
| 8 | Aesthetic and Minimalist Design | 3 | Radar bulk; LC equal billing with CF |
| 9 | Error Recovery | 3 | Sync incomplete + retry |
| 10 | Help and Documentation | 2 | Score/blind-spot meaning unexplained |

## Priority issues (all fixed)
- [P1] Today wasn't the lead; tonight's CF round below the fold → Today spans 8 cols with the next CF round inside; actionable "Practice X" link; louder status copy.
- [P1] Newbie-gray drained the data viz → CF line in platform periwinkle, rank bands 10%, dashed next-rank line ("Pupil · 192 to go"), brighter heatmap ramp, today's cell ringed.
- [P2] Inconsistent flame + LC competing with CF → shared flameState rule; LC demoted to compact 32px card; CF 1008 is the single hero number.
- [P2] NumberTicker recounted every visit / role-less aria-label → counts once per app launch, settles on interrupt, sr-only value.
- [P3] Radar repeated the list → ranked bars with visible reasons, "Not tried" for blind spots, "Strength / 100".
Evidence fixes (B): heatmap overflow at 1100 (now fits measured width), reduced-motion infinite loops (iteration-count 1), nameless Recharts tab stops (accessibilityLayer off + summaries), "1 days" plural, date wrapping.
