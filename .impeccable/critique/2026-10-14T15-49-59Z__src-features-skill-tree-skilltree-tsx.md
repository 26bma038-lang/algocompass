---
target: Skill Tree + Topic Detail panel
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:C:\\dsa tracker\\src\\features\\skill-tree\\SkillTree.tsx"
target_fingerprint: "sha256:0533d630acf4c3f5bc367d9ba60a2371e5d5ca6ef036f5c12abe958bc85419d1"
target_path: "C:\\dsa tracker\\src\\features\\skill-tree\\SkillTree.tsx"
timestamp: 2026-10-14T15-49-59Z
slug: src-features-skill-tree-skilltree-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + Playwright sub-agent)

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 2 | No-match search is silent (sr-only count); unlocks animate without words; panel covers top-bar sync status |
| 2 | Match system / real world | 3 | Native CF vocabulary; "Weak" filter also includes Developing |
| 3 | User control and freedom | 3 | Esc / clear / fit work; filter resets each visit |
| 4 | Consistency and standards | 2 | twMerge strips custom font-size tokens (status words, chips render 14px); "Weak" means two things; legend ranges partial; aria-pressed used for "panel open" |
| 5 | Error prevention | 3 | Low-risk surface |
| 6 | Recognition rather than recall | 2 | Status relies on legend + segment counting; work-on-next meaning only in legend; unlabeled tag subtitle |
| 7 | Flexibility and efficiency | 2 | No shortcut to search; Enter picks engine-order match; no keyboard graph navigation |
| 8 | Aesthetic and minimalist design | 2 | Legend, minimap, attribution, edge bundles, en-dash tiles, two placeholder boxes |
| 9 | Error recovery | 2 | Silent no-match state |
| 10 | Help and documentation | 3 | Good tooltips and unlock-condition sentences |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict
Half authored. The Topic panel and mastery ring are product-specific (honest copy, unlock conditions, upsolve, LC half-weight note). The canvas reads as a stock React Flow org chart (dot grid, minimap, +/- controls, attribution, bundled dagre edges), and at Newbie gray it is a monochrome wiring diagram. Detector CLI: 0 findings. Browser overlay: undersized attribution text, nested-cards (legend, placeholders), text-occlusion (minimap over Divide & conquer / Interactive; attribution over a score badge at 1100), dark-glow (intended accent aura, false positive).

## Priority Issues
- [P1] The screen doesn't answer "what should I work on?" Work-on-next is a 12px gray pulsing dot with no label or reason. Fix: a "Work on next" plate with the 3 topics + reasons that focuses nodes; a labeled "Next" marker on nodes.
- [P1] Custom type tokens stripped by tailwind-merge (status words, filter chips, prerequisite chips render 14px). Fix: extendTailwindMerge with the DESIGN.md font-size scale.
- [P1] Keyboard/screen-reader path: 33 nodes before filters/search in tab order; engine order not visual order; focusing an off-canvas node doesn't pan; aria-pressed for "open"; unlocks unannounced. Fix: toolbar before canvas, nodes in visual order, pan on focus, aria-expanded/aria-controls, live unlock message.
- [P1] Default view readability: bundled edges, bottom clipped, minimap occludes nodes, legend/filters cover nodes at 1100 with panel. Fix: highlight the selected/hovered node's lineage and fade the rest; legend behind a toggle; fit padding for minimap.
- [P2] Panel covers the top bar; tag subtitle unlabeled and truncated; empty topics show four en-dash tiles and empty lists; Upsolve below Solved; two dashed placeholder boxes. Fix: start below the top bar, "Covers" line, collapse untouched topics, Upsolve first, quieter placeholders.
- [P3] Score plate hides ring segments 5-6; legend gives ranges for only 2 tiers; vague "Weak" filter hint.

## Persona Red Flags
Alex: no shortcut to search, Enter opens engine-order match, filters reset. Sam: 33 tab stops before search, focus lands on invisible off-canvas nodes, verbose labels. Daily check-in CP: 33 gray circles and no single next action within 2 seconds.

## Minor Observations
Truncated names; minimap colors meaningless at Newbie; label plates box over edges; unlock animation unexplained.

## Questions to Consider
Should the tree open on the frontier? What does "Strong" promise relative to rating band? What carries the RPG feeling when the earned accent is gray?
