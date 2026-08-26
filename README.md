# Acts of Life

**Your days are full. Your story isn't.**

A personal life-audit and story app derived from Hannah Arendt's
labour/work/action distinction — deliberately adapted, not faithfully
reproduced. The app opens on the **Arc**: one composed scene with three
altitudes — maintenance as ground texture, chapters of work as lines
(with their phases ticked along them), and acts as stars (turnings as
crescents). Zoom is the hierarchy: from orbit, only the stars survive.

- **Onboarding** — four intro screens set the purpose, vocabulary, and
  promises (no confetti, no comparison, no judgment of the past), and
  offer the AI choice, before five proud moments seed the arc. A guided
  tour follows the reveal.
- **Excavation** (the past) — a generous historian that teases acts out
  of proud moments; placements, never judgments; no rejection path. A
  sensitive-content gate offers to keep grief whole and private, before
  any questions.
- **Declaration** (the future) — a demanding editor: four tests, a date,
  exposure, and a witness as strong default. At most five declared acts
  stand open at once.
- **Chapters** — life's work as lines, with ordered **phases** (drawn on
  the line, dated or evenly spaced) holding **steps** (visible when a
  phase is opened).
- **The ground** — rituals (rhythmic) and one-offs (done once, then
  gone). What's due today waits as tappable rings by the now-line.
- **The Mirror** — weekly, two minutes, flat and factual.
- **The Library** — ~30 acts doable with no money, authority, or
  audience; contrast pairs and counterfeits teach the four tests.

See [acts-of-life-spec_1.md](acts-of-life-spec_1.md) for the full
specification (§12 records the as-built amendments).

## Privacy

All data lives **only on your device** (browser local storage). No
account, no server, no analytics, no trackers. Seven silent daily
on-device safety copies; JSON export/import; the Telling exports as a
document. The only external requests are the Google Fonts stylesheets —
plus, **only if you opt in** (Settings → "A second reader"), calls to
Anthropic's Claude API with your own key to
shape questions during entry flows. The model interrogates; it never
authors your entries.

## Run it

Static site — no build step, no dependencies:

```
python -m http.server 5173
```

then open http://localhost:5173. Installable as a PWA (offline-capable).

## Checks

```
python tools/lint_strings.py
```

fails if the banned vocabulary appears in UI strings, or if the sentence
escapes its three call sites.

## Stack

Vanilla HTML/CSS/JS (ES modules). Design: night-side Arc (deep ink,
cream stars, ember accent) with paper sheets; Fraunces + Figtree.
Built with Claude Code.
