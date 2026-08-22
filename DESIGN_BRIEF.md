# Acts of Life — Design Brief

## Concept

A personal life planner built around one metaphor: **a telescope**. You zoom continuously between the task in front of you and the arc of your life. Every screen is a zoom level of the same world, not a separate page.

## The philosophy (drives all structure)

Life is organized into three **Modes**:
- **Circle** (green) — anchors you maintain: Health, Home
- **Line** (blue) — paths you advance: Work, Learning
- **Web** (purple) — connections: Family, Friends, Community

The zoom ladder, closest to widest:
**Item (task/ritual) → Stream/Goal (with phases) → Area → Mode → Timeline (life's arc)**

## Data hierarchy

- **Modes** (fixed 3) contain **Areas** (user-defined, each has a color)
- Areas contain **Goals** ("Streams" in Line mode) — optional start date, deadline, and ordered **milestones/phases** (e.g. Build → Test → Launch), first undone phase is "current"
- Goals contain **Items**: one-off **tasks** (scheduled/unscheduled) and recurring **rituals** (daily, weekdays, specific days) with completion history and streaks (🔥 n)

## Screens

1. **Today's Acts (home)** — single list in sections: Overdue (red, with "→ Today" reschedule chip), Today, Upcoming (dated), "Rituals · not due today" (dimmed), Someday, Archived (collapsed). Mode chips at top; FAB to add; header icons: 🗓 timeline, 📊 review, ⚙ backup.
2. **Stream/Goal view** — numbered phase sections with tap-to-complete circles, "current" badge, target dates; items grouped under phases; or classic Rituals/Scheduled/Someday grouping when no phases.
3. **Area view** — goal rows with phase progress ("⚑ 1/3 · Test • Deadline: …"), completed goals collapsed.
4. **Mode overview** — area rows with color dot, counts, per-stream progress line; tagline per mode.
5. **Timeline** — horizontal Gantt-lite: one bar per dated goal (area color), milestone dot ticks, red Today line, month markers, Fit/−/+ zoom with horizontal scroll centered on today. "Needs dates" list below.
6. **Review** — Week/Month toggle; per-ritual dot rows (done/missed/off) grouped by area with consistency %.
7. **Onboarding** — 4-step wizard: philosophy → pick areas → first goal → first action.
8. **Modals** (bottom sheet on mobile, centered on desktop): item editor (type toggle chips, phase select), goal editor (milestone rows: check/title/date/reorder/delete), area editor (color swatches), backup export/import.

## Signature interactions to preserve/amplify

- **Zoom feel**: every level change plays a scale+fade "camera" animation (in: 0.93→1, out: 1.07→1). Tapping a card's meta line ("Work • NextCandle") zooms out to its stream. Back buttons climb the ladder one level; ⌂ jumps home.
- Checkbox circles for completion; streak flames; phase momentum prompts.

## Current visual language (feel free to improve boldly)

- Inter font (400/600), light gray `#f5f5f5` bg, white cards, slate `#2c3e50` primary, muted gray text
- Mode colors: green `hsl(150,60%,40%)`, blue `hsl(210,60%,45%)`, purple `hsl(280,50%,45%)`
- Single column, max-width 480px, mobile-first; installable PWA (standalone, slate theme color, concentric-rings icon)

## Constraints

- Vanilla HTML/CSS/JS (no framework, no build step); one stylesheet with CSS variables in `:root`
- Must stay a single-column mobile-first layout that also reads well on desktop
- Light theme today; dark mode welcome as an addition

## What we want from the redesign

1. Give each zoom level a distinct visual identity while feeling like one continuous world (the telescope should be *felt*)
2. Stronger hierarchy and calmer rhythm on the home list (six section types currently compete)
3. A more crafted timeline and review screen — these are the "wow" zoom-out moments
4. Better empty states, onboarding polish, and a cohesive icon/emoji strategy
5. A refined palette that keeps the three mode colors meaningful but less saturated/toy-like
