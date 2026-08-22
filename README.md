# Acts of Life

**A telescope for a life — labour, work, action.**

A small, local-first life planner after Hannah Arendt's *vita activa*. One world,
five zoom levels: the act in front of you → the stream it extends → today →
your areas → life's horizon.

- **Labour · the loop** — anchors you tend so everything else can move (rituals, streaks)
- **Work · the line** — paths you extend that outlast the day (streams, phases, deadlines)
- **Action · the star** — acts that define your life; five principles walked daily,
  reflected on each evening

## Privacy

All data lives **only on your device** (browser local storage). Nothing is ever
sent to a server — there is no server. The app keeps 7 daily on-device safety
copies and offers JSON export/import for backup and moving devices. The only
external requests are the two Google Fonts stylesheets.

## Run it

It's a static site — no build step, no dependencies:

```
python -m http.server 5173
```

then open http://localhost:5173. Installable as a PWA (offline-capable).

## Stack

Vanilla HTML/CSS/JS. Design system: Organic (cream ground, ember accent,
Caprasimo/Figtree), built with Claude Design; implementation with Claude Code.
