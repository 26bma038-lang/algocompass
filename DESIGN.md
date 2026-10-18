---
name: AlgoCompass
description: A Skill Tree RPG compass for a competitive programmer's Codeforces climb.
colors:
  abyss: "#070B16"
  abyss-raised: "#0B1122"
  abyss-sunken: "#050812"
  glass: "rgba(20, 29, 54, 0.55)"
  glass-hover: "rgba(26, 37, 68, 0.66)"
  glass-border: "rgba(150, 172, 230, 0.10)"
  glass-border-strong: "rgba(150, 172, 230, 0.20)"
  ink: "#E7ECF7"
  ink-muted: "#9AA5BF"
  ink-faint: "#7A85A3"
  rank-newbie: "#A4ACBD"
  rank-pupil: "#4CDB84"
  rank-specialist: "#27D5C7"
  rank-expert: "#5B8CFF"
  rank-candidate-master: "#B46CFF"
  rank-master: "#FF9B3D"
  rank-grandmaster: "#FF4F5E"
  ember: "#FF8A3D"
  ember-core: "#FFD27A"
  success: "#6EE7A8"
  warning: "#FBBF24"
  danger: "#F87171"
  platform-cf: "#7FA2FF"
  platform-lc: "#FFA116"
  nebula-deep: "#2A3A78"
typography:
  hero-number:
    fontFamily: "Chakra Petch, Geist, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  display:
    fontFamily: "Chakra Petch, Geist, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Chakra Petch, Geist, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.01em"
  button:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.55
  numeric:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.2
    fontFeature: "\"tnum\" 1"
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  pill: "999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
components:
  card-glass:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.lg}"
    padding: "20px"
  card-glass-lead:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.lg}"
    padding: "24px"
  button-primary:
    backgroundColor: "{colors.rank-expert}"
    textColor: "{colors.abyss}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.glass-hover}"
  button-outline:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "36px"
  button-outline-hover:
    backgroundColor: "{colors.glass-hover}"
  button-outline-sm:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.abyss-sunken}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "38px"
  chip:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "24px"
  tooltip:
    backgroundColor: "{colors.abyss-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "6px 10px"
  kbd:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "0 4px"
  topbar-control:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "32px"
  level-badge:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink-muted}"
    padding: "0 12px"
    height: "32px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 13px"
    height: "40px"
  nav-item-active:
    textColor: "{colors.ink}"
  sidebar:
    backgroundColor: "{colors.abyss-raised}"
    width: "64px"
  sidebar-expanded:
    width: "220px"
  titlebar:
    backgroundColor: "{colors.abyss-raised}"
    height: "36px"
  caption-button:
    textColor: "{colors.ink-muted}"
    width: "46px"
  topbar:
    height: "48px"
    padding: "0 24px"
  ascent-bar:
    backgroundColor: "{colors.glass-border-strong}"
    height: "2px"
---

# Design System: AlgoCompass

## Overview

**Creative North Star: "The Rank Aura"**

AlgoCompass should feel like the character screen of a premium RPG, the one you open between runs to see how far you've come. It is still a precise instrument you read in two seconds. The ground is a deep navy night (never pure black). Data sits on frosted glass slabs that catch a single colored light, and that light is **your current Codeforces rank**. A pupil sees the app in green. An expert sees it in blue. Promotion to Candidate Master repaints the whole interface violet. The accent is not a brand color you chose. It is a status you earned, and that is what makes the app addictive without making it noisy.

Everything else stays disciplined. The type is a clean, chamfered display face for numbers and titles over a quiet workhorse sans. Density is moderate and glanceable. Motion is fast. One ambient layer (a slow nebula in the accent color behind the glass) keeps the screen alive while you aren't touching it. Rewards are quick and celebratory (streak flame, level badge, node unlocks), but they never get between the user and the numbers. "Too slow" and "too dry" are the two failures this system exists to avoid.

Before the first sync there is no data, and the shell says so honestly. Unearned things stay unlit: the level badge sits on plain glass, the streak flame is a faint outline, numbers are an en dash in faint ink, and the skill tree is a locked silhouette with no labels or values. Light arrives with real data, never ahead of it.

**Key Characteristics:**
- Deep navy-black ground with frosted glass cards and soft hairline borders.
- One accent, driven by one CSS variable, whose value is the live Codeforces rank color.
- Display face for numbers, ranks and screen titles. Workhorse sans for everything you read.
- Glow is a reward, not a texture. Only a few elements per screen are lit.
- Fast, responsive motion. One ambient layer. Ceremonies only on real events.
- Honest empty states: unearned elements stay unlit until real data exists.

## Colors

Restrained in structure, committed in light: tinted navy neutrals carry the surface, and one rank-driven accent supplies every glow, selection and progress fill.

### Primary
- **Rank Aura** (`--accent`, one of the rank tokens below): the single accent. It drives the active nav item, the primary button, progress fills, the focus ring, the caret and text selection (35% tint), the title-bar compass mark, empty-state icon tiles, the lit level badge, and the ambient nebula. Its derived tints all come from `color-mix(in oklab, ...)` on this one variable: `--accent-soft` (14%, active and lit fills), `--accent-line` (45%, the hairline ring of a halo), `--accent-glow` (50%, the halo itself), and `--accent-ink` (abyss navy, text on an accent fill). `--accent-next` holds the next rank's color for the ascent bar. When the next rank is unknown (before the first sync, or at the top rank) it equals the current accent. No screen hard-codes a rank hue for chrome.

### Rank palette (the accent's possible values)
Codeforces colors, re-tuned to glow on navy at matched perceived brightness:
- **Newbie Slate** (rank-newbie): newbie and unrated.
- **Pupil Fern** (rank-pupil): pupil.
- **Specialist Lagoon** (rank-specialist): specialist.
- **Expert Azure** (rank-expert): expert. This is also the fallback accent before the first sync, applied at startup.
- **Candidate Violet** (rank-candidate-master): candidate master.
- **Master Ember** (rank-master): master and international master.
- **Grandmaster Crimson** (rank-grandmaster): grandmaster, international GM and legendary GM.

Rank tokens also color other people's handles and contest-rank chips, wherever CF itself would color them.

### Secondary
- **Streak Ember** (ember → ember-core): the streak flame only, as a bottom-to-top gradient fill. Fire is fire, so it doesn't follow the rank accent.
- **Platform marks**: **CF Periwinkle** (platform-cf) and **LeetCode Amber** (platform-lc) appear only as small platform identifiers (a 6px dot on a chip or a field label, a chart series). They never color chrome.

### State
- **Success Mint**, **Warning Amber**, **Danger Coral**: state only. Every state color is paired with an icon and text, because the accent can be green or red and must never be mistaken for a status. Danger Coral also fills the close caption button on hover.

### Neutral
- **Abyss** (abyss): app ground, the deep navy-black behind everything, and the text color on accent and danger fills.
- **Abyss Raised** (abyss-raised): title bar, sidebar (at 85% so the nebula bleeds through faintly) and the opaque Float plane (tooltips, popovers).
- **Abyss Sunken** (abyss-sunken): input wells, recessed icon tiles, locked skill-tree nodes, and the edge vignette over the nebula.
- **Nebula Deep** (nebula-deep): a fixed deep-indigo blob in the ambient layer that gives the nebula depth under any rank color. Ambient layer only.
- **Glass / Glass Hover** (glass, glass-hover): translucent card fill over the ambient layer, and the hover fill for every interactive surface.
- **Glass Border / Strong** (glass-border, glass-border-strong): 1px hairlines. The default border on everything is glass-border. The strong variant is for hover, outline buttons, tooltips, kbd keys, the ascent bar track and the locked tree's lines.
- **Starlight Ink** (ink), **Mist** (ink-muted), **Dusk** (ink-faint): primary text, secondary text, and tertiary text (hints, placeholders, not-yet-known values). Dusk was retuned for WCAG AA (about 4.5:1 on glass), so it stays legible as real text and must not be dimmed further.

### Named Rules
**The Earned Light Rule.** The accent is always the user's real rank color. Never pick it for aesthetics, and never show a rank color the user hasn't earned as chrome. A future rank may appear only as the *destination* tip of the ascent bar. Anything that represents an unearned status (a level, a streak, a node) stays unlit until real data exists.

**The Three Lights Rule.** At most three elements per screen glow (halo shadow) at rest. The active nav rail always counts, and so does the ascent bar fill once a real rating exists. Everything else uses accent fills and borders without a halo.

## Typography

**Display Font:** Chakra Petch 500 and 600 (with Geist, system-ui)
**Body Font:** Geist Variable (with Segoe UI, system-ui)

**Character:** Chakra Petch's clipped, chamfered corners read as game-menu numerals and RPG stat plates without tipping into sci-fi cosplay. Geist is calm and engineered, and it does the reading. Both are bundled locally (fontsource), so the app never fetches fonts.

### Hierarchy
- **Hero number** (Chakra Petch 600, 56px, 1.0): the CF rating on Home Base and the level on Achievements. One per screen.
- **Display** (Chakra Petch 600, 32px, 1.1): the lead card's title on a screen (Home Base's "Today") and big stat values.
- **Headline** (Chakra Petch 600, 22px, 1.2, -0.005em): the screen title in the top bar, and stat values inside a card (current streak, solved today).
- **Title** (Geist 600, 16px, 1.35): section and card headings inside screens, empty-state titles, and list-item primaries. The level badge numeral uses this size in Chakra Petch.
- **Body** (Geist 400, 14px, 1.55): all reading text and nav labels (at 500). Max line length is 68ch. Empty-state and card copy is held near 46 to 56ch.
- **Body small** (Geist 400, 13px, 1.5): metadata, field hints, inline errors, and small buttons. The title-bar wordmark is Chakra Petch 500 at this size.
- **Label** (Geist 500, 12px, +0.01em, sentence case): field labels, stat labels, chip text, tooltips, kbd keys, the sync control.
- **Button** (Geist 600, 14px): button text.
- **Numeric** (tabular figures): every number that changes or sits in a column, such as tickers, tables, counters, the streak count, the level and shortcut keys.

### Named Rules
**The Sentence Case Rule.** No all-caps labels and no tracked-out eyebrows. Labels are sentence case at 12px. Hierarchy comes from size and weight.

**The Steady Digits Rule.** Any number that animates or aligns in a column uses tabular figures, so tickers never jitter in width.

## Layout

A fixed desktop shell (the window is 1100x700 at minimum). From the top: a 36px custom title bar (drag region, caption buttons at the right). Below it, a left icon sidebar (64px collapsed, 220px expanded) and the content column. A 48px top bar inside the content column (24px side padding) holds the screen title on the left and, on the right, the sync control, the streak flame and the level badge, 6px apart. Directly under the top bar runs the 2px **ascent bar**, the progress to the next CF rank. Only the content area below it scrolls.

Content sits on a 12-column fluid grid with 16px gutters and 24px page padding (40px at the bottom). It grows to 1440px and then centers. The spacing scale is 4px-based (4, 8, 12, 16, 24, 32, 48, 64); icon-to-text gaps inside small controls are 6px. Where a screen stacks several sections, there is more space above a section heading (32px) than below it (12px).

Home Base is glanceable and leads with Today: a two-row lead card (7 of 12 columns, 8 at 1280px and up) holds the streak and solved-today, with today's quest and the next contest stacked beside it, and the CF rating card full-width below. Everything sits above the fold at 1100x700. Screens without data show a single empty state at the top left of the content column; the Skill Tree pairs its empty state with the locked silhouette in a two-column glass card.

## Elevation & Depth

Depth comes from glass translucency over the ambient layer, not from heavy shadows. There are three planes: **Abyss** (ground plus ambient nebula), **Glass** (cards, with backdrop blur 16px and saturate 140%), and **Float** (tooltips and popovers, opaque Abyss Raised with a strong hairline and the Float shadow). Each glass card carries a 1px inner top highlight to sell the slab edge.

The ambient nebula is three heavily blurred (80px) blobs: two in the accent (at 18% and 12% opacity) and one in Nebula Deep (24%), drifting on independent 44 to 61s transform loops, with a radial vignette that pulls the edges back to Abyss Sunken so the glow reads as light, not fog.

### Shadow Vocabulary
- **Slab** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px -16px rgba(2,6,18,0.8)`): every glass card at rest.
- **Float** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 64px -20px rgba(2,6,18,0.9)`): tooltips, popovers and dialogs.
- **Aura** (`box-shadow: 0 0 0 1px var(--accent-line), 0 6px 24px -6px var(--accent-glow)`): lit elements only (see the Three Lights Rule). The active nav rail at rest, the primary button on hover.
- **Ascent glow** (`box-shadow: 0 0 10px var(--accent-glow)`): the ascent bar fill, only once it has real progress.
- **Focus** (`box-shadow: 0 0 0 2px var(--abyss), 0 0 0 4px var(--accent)`): keyboard focus on every interactive element, applied globally on `:focus-visible`.

### Named Rules
**The Glow Is a Reward Rule.** A halo means "this is yours, current, or earned": the active nav item, your rank progress, today's quest, a mastered node. It never decorates a neutral container.

## Shapes

The shapes are soft slabs with one hard edge of personality. Cards are gently rounded (16px). Inner tiles are 12px, controls 8px, tooltips and kbd keys 6px, and chips and top-bar controls are pills. Corner radius steps down as elements nest, so a child is always tighter than its parent. Skill tree nodes are circles wrapped in a mastery ring, a segmented arc that fills as a topic strengthens; locked, the ring is a dashed glass-border arc around an Abyss Sunken disc. Edges between nodes are 1.5px lines that brighten to the accent when unlocked. The level badge is the one chamfered shape (a plate with its top-left and bottom-right corners clipped at 7px, echoing Chakra Petch), reserved for level and rank.

## Components

### Buttons
- **Shape:** gently rounded (8px), 36px tall (32px for the small size, with 13px text).
- **Primary:** accent fill, text in accent-ink (abyss navy), Geist 600. It gets the Aura glow only on hover.
- **Outline:** glass fill with the strong hairline and starlight text. Hover shifts to glass-hover. This is the quiet action, used small in empty states and secondary card actions.
- **Ghost:** transparent with starlight text and a transparent border. Hover adds a glass-hover fill and the strong border.
- **Press:** scale 0.97 for 90ms. State changes run 160ms ease-out-quint. Focus uses the Focus ring. Disabled drops to 45% opacity.

### Chips
- **Style:** 24px glass pill with a glass-border hairline, Mist text, 12px label. A platform chip leads with a 6px platform-color dot. A rank chip uses the rank color for its text. Hover brings the strong border and starlight text.
- **Selected:** the accent-soft fill with an accent border.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** glass with backdrop blur. Recessed tiles inside use Abyss Sunken.
- **Shadow Strategy:** Slab at rest. Hover (only when clickable) shifts to glass-hover and the strong border. Clickable cards never lift or scale.
- **Internal Padding:** 20px. A screen's lead card uses 24px.

### Inputs / Fields
- **Style:** Abyss Sunken well, glass-border hairline, 8px radius, 38px tall, Dusk placeholder. Hover brings the strong border. Labels are 12px Mist above the field; a handle field's label leads with its 6px platform dot.
- **Focus:** the border turns accent, plus the Focus ring.
- **Error:** Danger Coral border plus an inline 13px message with an icon below the field, replacing the hint. The message says what's wrong and how to fix it.
- **Hint:** 13px Dusk text below the field when there is no error.

### Tooltips
Opaque Abyss Raised plate, strong hairline, 6px radius, 12px label text, Float shadow. They open after 250ms (150ms when moving between triggers) with a 150ms fade and slight zoom. A shortcut is shown in a **kbd** key inside the tooltip: a 6px-radius strong hairline outline with tabular Mist text ("Ctrl 1").

### Navigation (sidebar)
- **Collapsed** (64px): icons only, with a tooltip on hover that names the screen and shows its shortcut (Ctrl+1 to Ctrl+5 for the five screens, Ctrl+, for Settings). **Expanded** (220px): icon plus a 14px label that fades in after the width. The width animates with the spring. Ctrl+B toggles it, and a collapse control in Dusk sits at the bottom under Settings.
- **Items:** 40px tall, 8px radius, 18px icons.
- **Active item:** accent-soft fill, an accent icon at a heavier stroke, and a 3px by 20px accent rail with the Aura glow on the sidebar's left edge that slides between items (shared layout animation). It is one of the three lights.
- **Hover:** a glass-hover highlight that travels between items on the same spring, and starlight text. Inactive icons are Mist.

### Title bar
A 36px Abyss Raised strip with a hairline bottom border, the accent compass mark and the Chakra Petch wordmark on the left, and minimize, maximize and close on the right (46px wide each). Close hides the window to the tray and turns Danger Coral (with abyss icon) on hover; the others take a glass-hover fill. The whole strip is a drag region except the controls. Like native caption buttons, they are out of the tab order.

### Top bar controls
32px pill hit areas that take a glass-hover fill on hover, each with a tooltip.
- **Sync control:** a refresh icon with "Not synced" in 12px Mist. Until the platform adapters exist it is aria-disabled (still focusable, so its tooltip explains why) with a not-allowed cursor.
- **Streak flame:** links to Quests. An ember-gradient flame icon plus the day count (numeric). Without data, the flame is an unfilled Dusk outline and the count is an en dash. When today's practice is done, the flame is steady. If it's 8pm or later with nothing done, the flame gets a slow 2s breathing glow. This is the only looping motion tied to data.

### Level badge
Links to Achievements. A 32px chamfered plate: a 12px "Lv" label and the level numeral in Chakra Petch. A 2px accent XP line runs along the plate's bottom edge and fills with progress to the next level (420ms ease-out-quint). It is unlit (glass fill, Mist text, en dash) until a real level exists, then takes the accent-soft fill with starlight text. The chamfer is clipped on an inner plate so the link's focus ring stays whole.

### Ascent bar
A 2px full-width meter under the top bar on a strong-hairline track. It fills with a gradient from the current rank color to `--accent-next`, showing rating progress within the band, and carries the Ascent glow once there is progress. Before the first sync it is an empty track, and its accessible value says rank progress appears after the first sync. When the user is promoted, it is the starting point of the Aura Shift ceremony.

### Empty state
The honest "nothing here yet" pattern. A 40px accent-soft tile (12px radius) with a 20px accent icon, a 16px title, a body paragraph that says what will appear and when, and optionally an outline small button for the next step. Left-aligned, capped near 52ch.

## Do's and Don'ts

### Do:
- **Do** drive every accent usage from `--accent` (with derived tints from `color-mix()`), so a rank change recolors the whole app from one variable.
- **Do** keep motion fast: 90ms press, 160ms hover and state, 240ms panel and route, 420ms number tick and reveal. Use ease-out-quint `cubic-bezier(0.22, 1, 0.36, 1)` for entrances and ease-in-out `cubic-bezier(0.65, 0, 0.35, 1)` for movement. Use a spring (stiffness 380, damping 32) for the sidebar and the active-nav rail.
- **Do** animate only `transform`, `opacity`, `filter` and `box-shadow`. Number tickers animate value changes, not every render.
- **Do** settle route changes with a 240ms fade and a 6px rise, with no exit animation.
- **Do** reserve ceremony (up to 1.2s, the Aura Shift, achievement unlock) for real events. It is skippable with a click or Esc, and it never blocks input. The nebula crossfades to a new rank color over 1.2s.
- **Do** keep the ambient nebula GPU-cheap: three blurred gradients drifting on 40–60s transform loops, paused when the window is hidden, and static under `prefers-reduced-motion`.
- **Do** pair every state color with an icon and words.
- **Do** show an honest empty or unknown state (an en dash in Dusk, an unlit badge, a locked silhouette) instead of a placeholder number.
- **Do** give every icon-only control a tooltip, and show its keyboard shortcut in a kbd key when it has one.

### Don't:
- **Don't** use pure black (#000) or neutral greys. Every neutral is navy-tinted.
- **Don't** make more than three things glow at rest on one screen.
- **Don't** stagger-animate every card on every visit. Home Base gets one orchestrated reveal per day (first open). After that, content is just there.
- **Don't** add confetti, XP popups on routine clicks, or anything looping that isn't tied to data.
- **Don't** animate layout properties (width and height except the sidebar spring, top/left, margins), and don't replay chart entrance animations on refetch.
- **Don't** use all-caps labels, monospace data labels, or color-only status.
- **Don't** let any transition delay input. If the user clicks during an animation, the animation yields.
- **Don't** light an element for a status the user hasn't earned yet, even as a preview.

<!-- Appended 2026-10-14 (Home Base dashboard build). Additions only; nothing above changed. -->
### Data-viz additions (Home Base)
- **Do** draw Codeforces data series in **CF Periwinkle** (platform-cf) and LeetCode series in **LeetCode Amber**, not in the accent. The accent stays the rank's chrome color. At Newbie it's gray, and a gray series on a gray band disappears.
- **Do** show rank bands on rating charts at 10% of each rank color, with a dashed `accent-next` line at the next rank's floor labelled "<Rank> · N to go". This echoes the ascent bar's destination tip.
- **Do** use the accent as the activity heatmap's single sequential hue (35/55/78/100% steps, outlined empty step). Mark today's cell: ember ring when practiced, dashed Dusk outline when not. Streak-family ember use is allowed here because it's tied to data.
- **Do** follow one flame rule everywhere: ember fill = practiced today, ember outline = streak running but nothing today (breathes from 8pm), Dusk outline = no streak.
- **Do** count up hero numbers once per app launch. Revisits show the settled value, and counts animate only when the value changes.
- **Do** keep one hero number per screen. On Home Base it's the CF rating, and LeetCode's total uses display size.

<!-- Appended 2026-10-14 (Skill Tree + Topic Detail build). Additions only; nothing above changed. -->
### Skill Tree and Topic Detail additions
- **Do** treat the Skill Tree canvas as one light under the Three Lights Rule. Inside it, glow encodes status and only two statuses may glow: **Mastered** wears the Aura on its disc, **Strong** a faint 6px accent drop-shadow on its ring. Weak, Developing, Not tried and Locked never glow.
- **Do** draw nodes as a 46px disc (topic icon) inside a 64px, 10-segment mastery ring (one segment per 10 points). Below the ring sits a soft abyss label plate with the name (13px semibold, two lines max) and "score status" (score in Chakra Petch). Locked = sunken disc, lock icon, dashed hairline ring, Dusk text. Not tried = bare ring, Mist icon.
- **Do** mark work-on-next topics with a 24px ink badge holding an abyss crosshair. Its slow 2.4s pulse is the tree's one data-tied loop (static under reduced motion). The same three topics lead the screen in a "Work on next" strip above the canvas, each with its reason.
- **Do** draw edges as 1.5px beziers: accent when the parent is at least Developing (unlocked path), **dashed** glass-border-strong when not, so lit vs unlit never hangs on color (at Newbie the accent is gray). Hovering or opening a topic lights its whole prerequisite chain and what it leads to (2px) and fades the rest to 18%.
- **Do** mark selection with a 2px ink ring 5px outside the mastery ring, never with the accent alone.
- **Do** play the unlock moment once per change: newly earned ring segments fade in clockwise (160ms each, 50ms stagger) and a 2px accent ring expands and fades (700ms). The baseline is the status snapshot from your last look, so revisits don't replay it. A "Since your last look" line names what rose, so the change is announced in words too.
- **Do** open Topic Detail as a non-modal 440px Float-plane sheet from the right, below the top bar and ascent bar (they stay visible), sliding 24px in over 240ms. Esc or × closes it and focus returns to where it came from. Changing screens closes it. Order: ring + status sentence, "Builds on" chips (dashed when below Developing), Codeforces vs LeetCode strength bar (platform colors), four stat tiles, Upsolve, Solved, then next-phase sections as one muted line each. Untried topics show only the unlock path.
- **Don't** hide React Flow's attribution. Keep it in Dusk at 10px in the canvas's empty top-left corner.

<!-- Appended 2026-10-15 (Recommender, Practice, Resources build). Additions only; nothing above changed. -->
### Practice and recommendation additions
- **Do** say where a topic is practiced with a mode chip: "Learn on LeetCode" (LC dot) or "Sharpen on Codeforces" (CF dot). It's a plain glass chip; the platform dot carries the identity, never the accent.
- **Do** build every recommended problem as one row: platform dot, title, a plain-words source line ("From a Jul 2025 round", "Step 2 of the sorting path, NeetCode 150"), the CF rating in Chakra Petch (tabular) or LC's difficulty in Geist, then Open. Feedback (Skip, Too easy, Too hard) is 12px Dusk text buttons with tooltips: always visible on Practice, revealed on hover/focus in compact rows (Home Base, Topic Detail), where it sits on the second line so it never squeezes the title. Collapsed feedback keeps zero width but stays focusable.
- **Do** mark Today's mix progress with the run meter: one 24x8px chamfered segment per problem (clip-path echoes the level-badge plate), filling with the accent via scaleX over 420ms when solved. No halo, so Practice stays at two lights (nav rail, ascent bar). Solved rows dim and say "Solved" with a Success check, never color alone.
- **Do** confirm feedback with a toast that names the effect and offers Undo. No reward motion for feedback; it's a routine action.
- **Don't** show the same problem twice on one screen: By topic leaves out what's already in Today's mix.

<!-- Appended 2026-10-15 (Quests, Contests, Notifications build). Additions only; nothing above changed. -->
### Quests, contests and settings additions
- **Do** show a quest as a sunken tile (12px radius): a 28px status tile (platform dot, a Repeat icon for the consistency quest, or a Success check when done), the quest sentence in 14px semibold, "+N XP" in 12px Mist, the count as "0/1" in Chakra Petch, and a 4px accent progress bar (scaleX, 420ms). Done quests say "Done" in words next to the check.
- **Do** play the quest reward moment once, when a sync (or a manual mark) completes a quest: one 720ms Aura pulse on its card (`.aura-pulse`), the bar filling, and the XP number ticking. It waits for the window to be visible, so a quest finished in the tray still gets its moment. No confetti, no popups, never on routine clicks.
- **Do** put today's quest count in the top bar as a pill right before the streak flame ("0/3", ScrollText icon in Mist, a Success check when all are done), and as a checklist tile under the next contest in Home Base's Today card.
- **Do** draw weekly goal rings as a 64px SVG: a 5px glass-border-strong track and an accent arc. A hit goal adds a Success check and the words "Goal hit"; otherwise "N to go".
- **Do** lead Contests with the next Codeforces round in a lead card (Chakra Petch countdown at display size, Register as the primary button, the "I'll attend" switch beside it). Later CF rounds and LeetCode contests are rows in their own cards below. Division is a plain glass chip.
- **Do** show rating change as an arrow icon (Success up, Danger down) plus a signed number in Chakra Petch, with words for screen readers. Unrated rounds say "Unrated" in Dusk.
- **Do** use the Switch (20x36 sunken pill, accent fill and an abyss thumb when on) for every on/off setting. The thumb's position carries the state, never color alone.
- **Don't** show a total you can't vouch for: when a round's problem list is partial, show "1 solved" instead of "1 of 2".

<!-- Appended 2026-10-15 (Achievements, levels and progression build). Additions only; nothing above changed. -->
### Progression additions
- **Do** use the chamfered plate for achievement badges too (48px, 9px clips; 28px in toasts): earned = accent-soft plate with an accent icon; locked = Abyss Sunken silhouette with a Dusk icon at 60%. Earned cards have a strong hairline and say "Earned <date>" (or "Earned before tracking") next to a Success check; locked cards have a dashed hairline, the hint, and a Dusk progress meter ("Best streak 13/30"). At Newbie the accent is gray, so the check and the words carry "earned", never the color.
- **Do** make the level the hero number on Achievements, with the title in Chakra Petch headline in the accent and a 6px XP bar.
- **Do** show the level badge's tooltip as a small Float panel: "Level N · Title", the XP bar and "X of Y XP to level N+1", then today's XP by source.
- **Do** play the level-up moment as a Float plate under the level badge: the number, the title revealed with a left-to-right wipe (done by 0.9s), an accent line drawing in, and one flash on the badge plate. It leaves after 2.6s.
- **Do** run the Aura Shift on promotion: `--accent` is a registered `<color>`, and `html.aura-shifting` crossfades it over 1.2s, so every accent surface repaints at once, with a wash of the new color from the top and a "Promoted · <Rank>" plate. Both moments use `pointer-events: none`; any click or Esc skips them and still reaches its target. Under reduced motion the color snaps.
- **Don't** announce the past: the first evaluation records existing achievements and your level silently. More than three unlocks at once become one summary toast with a View action.

<!-- Appended 2026-10-15 (v1.0 polish). Additions only; nothing above changed. -->
### Command palette and shortcut sheet
- **Do** open the command palette (Ctrl+K, or the search button left of the sync control) as a 560px Float plate 14vh from the top over a 60% Abyss scrim: a 48px input row with a search icon and an Esc key, then groups (Actions, Screens, Topics) with Dusk sentence-case headings. Rows are 40px, icon plus Starlight label plus an optional Dusk hint, with a kbd key on the right. The selected row takes the glass-hover fill; no accent, no glow.
- **Do** rank by name prefix, then word start, exact tag, initials, tag prefix, substring, and only last a loose in-order match on the name. Keywords never match loosely.
- **Do** list every shortcut on the `?` sheet (a 640px Float plate, two columns of label plus kbd).
- **Do** set kbd keys in Geist (font-sans) with tabular figures, never the browser's monospace.
- **Do** turn animations off entirely under reduced motion (`animation: none`), not shorten them: Radix waits for exit animations, and 1ms ones left tooltips stuck open.

<!-- Appended 2026-10-15 (redesign branch: themes and the Home Base bento). -->
## Themes and colour roles (redesign)

**This supersedes the Earned Light Rule for chrome.** The rank colour no longer paints the app; it stays on rank elements only.

- **Rank colour (`--rank`, `--rank-next`, `--rank-line`, `--rank-glow`)**: only the Codeforces rating number, the rank label chip, and rank progress (the ascent bar and the hero's progress bar). `applyRankAccent()` sets it. The Aura Shift ceremony animates `--rank`, registered as `<color>`, and the promotion plate uses it.
- **Theme accent (`--accent`, `--accent-2`)**: everything else that was "the Aura": active nav, primary buttons, focus ring, progress fills, the quest pulse, the level badge, the nebula (accent and accent-2 blobs), heatmap steps, the sparkline (`--accent-2`). The derived tints (`--accent-soft/-line/-glow/-ink`) still come from `--accent` via `color-mix`.
- **Themes** are token sets on `[data-theme]` (`<html>`, or any wrapper for a preview). Each redefines the ground (abyss, abyss-raised, abyss-sunken), glass and glass borders, the ink tint, the two accents and nebula-deep:
  - **Neon Arcade** (default): electric violet `#A274FF` and cyan `#2EE6F2` on violet-black `#0B0816`.
  - **Ember**: orange `#FF9550` and gold `#FFCB47` on charcoal `#121010`.
  - **Ocean**: teal `#2DD4BF` and bright blue `#4DA3FF` on deep navy `#051320`.
- **Contrast floor** (every theme meets it): ink, muted and faint ink ≥ 4.5:1 on glass and ground (faint is ≥ 5.5:1 in all three); accent and accent-2 ≥ 3:1 on ground (actual: 6.1 to 12.9); accent-ink on accent ≥ 4.5:1 (actual ≥ 6.1).
- **Theme picker** (Settings, first card after Handles): a radiogroup of three live swatches, each rendered inside its own `[data-theme]` wrapper so it shows real tokens. Arrows move and select. The choice applies instantly, persists in the settings store (`theme`) with a localStorage mirror, and `main.tsx` applies the mirror before the first render (no flash).
- **Streak ember, platform colours and state colours are unchanged** in every theme. Fire is fire, CF is periwinkle, LC is amber.

### Home Base bento
- **Row 1, the hero** (full width): Codeforces rating as the one hero number in the rank colour, the rank chip and rank progress, a rating sparkline (inline SVG in `--accent-2`, no chart library on first paint), Solved / Contests / Last change, and the next round with its countdown in the accent.
- **Row 2, the two things to do today**, the most prominent cards: **Work on next** (7 columns) and **Today** (5 columns: the streak line plus the three quests, each with its own bar).
- **Rows 3–4**: Activity (8) with LeetCode (4), then Upcoming contests (8) with Where you stand (4).
- **Spacing**: 24px gaps and padding, section titles in Chakra Petch headline (22px). At 1100x700 the hero, Work on next and Today all start above the fold.

<!-- Appended 2026-10-15 (v1.1.0: bento across the app). Additions only; nothing above changed. -->
## Bento across the app

Every screen uses the Home Base bento from the redesign.

- **Grid:** 12 columns with 24px gaps (`grid grid-cols-12 gap-6`). Use `items-start` where neighbours carry very different amounts of content, so a short card doesn't stretch into an empty slab. Home Base keeps equal-height rows.
- **Cards:** `glass-card` with 24px padding (`p-6`) and 16–24px between blocks inside.
- **Card header** (`CardHeader`, `src/components/CardHeader.tsx`):
  - the title in Chakra Petch headline (22px);
  - an optional one-line description (13px, muted, ≤ 62ch);
  - on the right, an optional count pill (`Pill`: accent-soft fill, 12px semibold, words not just numbers, like "0/3 done" or "5 open") and actions.
  - The title block flexes, so the pill and actions stay on the right until the card is genuinely narrow.
- **Inner tiles:** sunken (`bg-abyss-sunken`, 12px radius, 16px padding) for items inside a card: quests, contests, earned achievements, stats. Locked or empty items use a dashed hairline outline instead of a fill.
- **Per screen:**
  - **Practice:** Today's mix leads (12), then Upsolve (5) beside By topic (7).
  - **Quests:** Today's quests (8) beside Level (4), then This week (8) beside the Weekly review (4).
  - **Contests:** the next round leads, with its countdown in the accent. Upcoming rounds (7) sit beside Past contests (5) from 1280px, then the full rating chart (Recharts, loaded only here).
  - **Achievements:** the level hero, then one card per category with a "2 of 7" pill and the achievements as tiles.
  - **Skill Tree:** the three Work on next topics as 64px tiles with their reasons, then the canvas as the hero card, with filters and search in its header. The space above the canvas stays 154px, so it keeps its full height at 1100x700.
  - **Topic Detail:** inside the 440px panel, a hero tile (ring, status in headline, builds on, the Codeforces/LeetCode split), four stat tiles, then Upsolve, Solved, Recommended and Resources as cards with count pills.
  - **Home Base:** every card follows the same header rule (Later contests is now a card with sunken contest tiles).

## Light and Dark (v1.2 simplify)

This section supersedes the three colour themes (Neon Arcade, Ember, Ocean) and the frontmatter ground/ink/glass values above where they differ; `src/styles/globals.css` holds the live tokens.

**Why:** the first outside user found the app too complex and asked for plain white and black themes. The game layer (XP, levels, achievements, glow, ambient background, the Aura Shift) is unchanged; only the palette and where screens live changed.

### Themes

- **System** (default) resolves to Light or Dark from `prefers-color-scheme` and follows Windows live. **Light** and **Dark** are fixed. Saved v1.1 theme ids migrate to System.
- **Dark:** near-black ground `#0A0A0C`, raised `#131316`, sunken `#060607`, white ink `#F4F4F5` (muted `#A1A1AA`, faint `#8B8B94`), neutral white-alpha glass borders. One restrained accent, indigo `#8B9BFF`; `--accent-2` is a lighter tint of it, not a second hue.
- **Light:** off-white ground `#F6F6F7`, white raised, sunken `#ECECEF`, near-black ink `#111114` (muted `#4F4F58`, faint `#63636C`). The same indigo darkened to `#3A4BD0` with white `--accent-ink`.
- **Contrast:** every text token, the accent, state hues (success, warning, danger), platform dots and all seven rank colours are ≥ 4.5:1 on ground, raised, sunken and glass in both themes.

### Rank colours on white

Light redefines the rank palette darker (newbie `#5F6675`, pupil `#127A3A`, specialist `#0B7268`, expert `#2A55CF`, candidate master `#8336D0`, master `#A64A00`, grandmaster `#C41F30`). `--rank` still points at a rank token, so the Aura Shift crossfade works unchanged in both themes.

### Glow and ambient on white

- Light lowers `--accent-soft` (10%), `--accent-line` (38%) and `--accent-glow` (28%), so the Aura and quest pulse read as a soft tint, not a smudge.
- Shadows in Light are short neutral drops (`--shadow-slab`, `--shadow-float`), with no inset highlight.
- The ambient nebula reads its strength from `--ambient-a/b/c`; Light uses a faint tint wash and drops the edge vignette (`--ambient-vignette: transparent`).
- Topics map: `--tree-dots`, `--tree-edge*` and `--tree-mask` are per-theme tokens. Toasts follow the resolved scheme.
- Earned achievement tiles are sunken in Dark but raised white with a slab shadow in Light (sunken grey reads as disabled on white).

### Navigation (v1.2)

- Four screens with plain names: **Today, Practice, Progress, Contests**, then Settings at the bottom. Labels show by default; hovering an item shows a one-line description, and the same line is the subtitle under each screen title (body-sm, ink-muted). The top bar is 64px for the two lines.
- Progress uses a segmented tab row (Overview · Topics map · Achievements): a glass track with a 40px height, the active tab in `accent-soft`. The Topics map subtracts the row through `--tree-above`.
- The tip tour is a Float-plane card beside the sidebar with an accent outline (`shadow-aura`) on the item it describes. No dimming, never blocks input, Esc or Skip ends it.


<!-- Appended 2026-10-18 (v1.3: Sheets, Beginner Path, video lessons). Additions only; nothing above changed. -->
## Sheets, Beginner Path and lessons (v1.3)

**Why:** beginners need to start learning without choosing where to start, and sheet followers want progress that ticks itself. Both live inside the existing four screens, as Practice tabs (Today's mix · Sheets, with Beginner Path first in Beginner mode). The tabs use the shared `SegmentedTabs` (`src/components/SegmentedTabs.tsx`), the same row Progress uses.

### The section strip (the one new visual element)
- **What it is** (`src/features/sheets/SectionStrip.tsx`): one chamfered segment per section (step, day or topic). Each segment fills with the accent as that section is done (scaleX, 420ms). It echoes the run meter and the level plate. There's no halo, so it doesn't count toward the Three Lights.
- **"You are here":** the section holding the next problem stands taller (20px instead of 12px; 14px instead of 8px in the small size). Position carries "you are here", never colour.
- **On a sheet or path page**, every segment is a button (focus ring on an unclipped wrapper; the chamfer sits on an inner track) that opens and scrolls to its section.
- **Where it appears:** the followed-sheet card, every sheet row (small size), a sheet's header, the Path view, Today's Start here card and Today's followed-sheet card.

### Sheets
- **Sheets tab:** the followed sheet leads in its own card (name, "Sheet by …" credit linking the original, % in display size, the strip, and the Next in this sheet tile on the right). Below it, "Other sheets" is one card of dense rows (name and credit, strip, %, done/total, Follow), not a grid of identical cards. The followed sheet is never listed twice.
- **Sheet page header:** credit and fetch month, % with its split ("6 synced, 1 by hand, 90 imported"), the clickable strip, one honest line about LeetCode's 20-solve limit, Following, and Mark sections done (an inline sunken panel: "I've finished [Step 1] through [Step 5]" with a live count, never a modal).
- **Toolbar:** search over titles and notes, a segmented All / Unsolved / Solved, and Easy / Medium / Hard chips (`aria-pressed`, selected = accent-soft fill and accent border).
- **Sections:** collapsible glass cards. A numbered 32px sunken tile, the title, then "4/30" in tabular figures with a 112px accent bar, or "Done" with a Success check. Sub-sections are quiet 12px headings.
- **Problem rows** (44px):
  - **Tick box:** 20px. Checked = Success-tinted fill with a check, and the second line says the source in words: "Solved on LeetCode", "Ticked by hand" or "Imported".
  - **Title:** with a "Premium" chip where it applies.
  - **Topic chip:** only for a topic beyond the section's own (no "Implementation" × 22).
  - **The rest:** difficulty in muted text, a note button (accent icon when a note exists) and Open (outline).
- **Open** prefers LeetCode. Its tooltip says "Solve on LeetCode to tick automatically" or "Opens takeUforward. Tick it here once you've solved it."
- **Next in this sheet:** a sunken tile with the label, the title (16px semibold), "Step 4, Hashing. Medium", the weak topic that picked it (only when one did), and a primary "Open on LeetCode" with the auto-tick hint beside it.

### Beginner Path and lessons
- **Start here** (Today in Beginner mode) is the lead card (7 columns, with quests in the other 5):
  - a 13px "Start here" line, then "Step 3 of 14: Hashing" in display size, the subtitle, and "Watch 12 min · then solve 2 problems" in title weight;
  - the 14-segment strip;
  - **one primary button.**
  There's no rating hero, chart, heatmap or contest card in Beginner mode. A small card explains how to let solves tick themselves until a handle exists.
- **Path view:** steps done as "n/14" in display size, the strip, Continue (primary), the language toggle, then the steps as rows: a numbered tile (a Success check when done; accent-soft when current; sunken and faint when locked), title and subtitle, then "Done" / the next action / a lock icon and "Locked". The current row sits on a sunken fill.
- **Lesson page** (header card, then a 12-column grid with Watch 8 + Read 4, then Solve 12):
  - **Header:** "Step 1 of 14", the title in display size, the subtitle, and two status pills: "Main video watched" / "n/3 required problems". A pill is accent-soft with a Success check when met, sunken and muted when not.
  - **Done banner:** a sunken strip, "Step done. Step 4, Hashing, is unlocked", and Go to step 4.
  - **Locked step:** a dashed-outline notice and only a "Read ahead" card.
- **Video player:**
  - Before play: a 16:9 sunken frame with the YouTube thumbnail, a 64px play disc on a 72% abyss scrim, and the length in the corner. Nothing loads from YouTube before play.
  - After play: the youtube-nocookie embed.
  - Below: the title, "channel, N min", Mark as watched (outline; when watched, a ghost button with a Success check and "Watched") and a ghost Watch on YouTube.
  - Extras are rows that play in place.
- **Reward:** finishing a step plays the existing aura pulse once on the step (and the lesson header), and a toast says what unlocked. No new ceremony and no confetti.
- **Topic Detail** gets a Watch list first: the topic's videos in your language (Intro / Full lecture / Problem walkthrough, channel, minutes, a check when watched), playing in the panel. "Also in Hindi/English" shows the rest.

### Onboarding and Settings
- **Welcome:** "New to DSA?" as two radio cards (an icon, a title, one line). Selected = accent border and accent-soft fill, with a filled radio dot. Then the video language as a segmented English / Hindi, then the handles.
- **Settings → Mode:** the same two cards (Beginner / Smart) and the lesson video language toggle.

### Preview banner (Debug)
- A 36px accent-soft strip under the title bar ("Preview: a fresh beginner profile. Your real data and settings aren't touched. Exit preview"). It only appears while a preview profile runs.
