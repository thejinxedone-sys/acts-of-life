# Acts of Life — Build Specification v2 (integrated)

You are building **Acts of Life**, a personal life-audit and story app derived from Hannah Arendt's labour/work/action distinction — deliberately adapted, not faithfully reproduced. Read this entire spec before writing code. The philosophy section determines interaction design throughout, and several conventional app patterns are explicitly banned. Where this spec conflicts with a standard app pattern, this spec wins.

**Purpose:** help people rise above the minutiae of life, see the big picture of their own story, and chart a better one. Not another to-do list. The app makes a specific absence visible (weeks that are full but leave no mark on a life) and gently lowers the threshold to genuine acts.

**One-liner:** Your days are full. Your story isn't.

**The sentence at the heart of the app:** *"A life is constituted by what it began, not by what it processed."* Usage is rationed — see §8.

**Success metric:** acts per user per year. NOT time-in-app, NOT DAU, NOT streak retention. Internal analytics are built around acts/user/year only.

---

## 1. The frame

Life divides into three activities with different time-shapes and different glyphs:

| Category | Meaning | Time-shape | Glyph |
|---|---|---|---|
| **Maintenance** (labour) | Chores, health, admin, responsibilities — cyclical, never finished, consumed as it happens | stream + ritual | **circle** |
| **Life's Work** (work) | Bounded fabrication that leaves durable things — projects, crafts, sometimes the job | phase (start → intended end → shipped) | **line** |
| **Acts** (action) | Discrete deeds that begin something new, with real stake, reaching beyond the self, that cannot be taken back | discrete events | **star** |

Plus one sibling category:

| **Turnings** | Inward hinges — the moment a self reorganised: exiting a grief spiral, a decision that changed everything internally before it showed externally | discrete events | **crescent** |

**Structural principle:** the categories are NOT peers. Maintenance is the base that frees a person for the other two; acts are the summit. The UI must never present them as three equal tabs or lists — the hierarchy is enforced visually and through zoom behaviour (§5.1).

### 1.1 The four tests of an act

1. **A beginning** — it started something new; not the next step of an existing process.
2. **Skin in the game** — something real was at risk: standing, safety, relationships, self-image, a comfortable illusion. Risk is judged *before the outcome was known*; failed acts count fully. Confronting an uncomfortable truth is stake.
3. **Reach beyond yourself** — it landed in the world of others: touched people, changed something outside the actor's own head. **Anonymity does not disqualify.** An anonymous whistleblower's or RTI activist's deed is fully plural in effect even though authorship is concealed — and this app is the one place such an actor finally gets to sign their deed. Witnesses are NOT required for past acts.
4. **No taking it back** — irreversible; it cannot be deleted and pretended away.

An entry with a beginning and stake but no outward reach is a **Turning**, never a rejected act. The app never tells a user their pivotal inner moment "doesn't count" — it names it a turning and puts it on the arc with equal dignity.

### 1.2 The two regimes (governs all tone)

- **Backward — the generous historian.** For anything the user brings from their past, the app EXCAVATES; it never rejects. Proud moments contain acts the way an award contains the deed behind it. The flow's job is to tease the act out (§5.2a).
- **Forward — the demanding coach.** When the user DECLARES a future act, the app can hold a higher bar: the four tests asked directly, a date, and a **witness as a strong default** (a named person who knows) — because one human who can ask "did you do it?" outperforms any notification system. The witness is encouraged, not forced; safety-sensitive acts may be declared witness-free.

People accept high standards for what they are about to do; they do not accept judgment of what they have survived.

### 1.3 Goodness clause

Deliberately hidden good deeds (anonymous generosity meant to stay unknown even in effect-attribution) are a different category, not a failed act. If a user files one, the copy is: "This doesn't need the arc — and that's exactly what makes it what it is." Offer to keep it as a private note. Never demote it.

## 2. Vocabulary (enforced)

Use ONLY: **begin, beginning, act, turning, chapter, phase, witness, rememberer, arc, mirror, fallow, the Telling, maintenance, ritual, ground, sky.**

BANNED in all UI strings: task, goal, habit, productivity, optimize, streak, points, score, level, crush, win, achievement, badge, gamified "progress". Add a lint check on the strings file that fails the build if a banned word appears.

The vocabulary is the curriculum: users absorb the philosophy by being made to speak it.

## 3. Data model (sketch)

```
Person {
  id, name, relationship?, isRememberer: boolean
}

Entry {                      // acts and turnings share a table
  id
  kind: act | turning
  title
  beginning: string          // what was begun
  stake: string              // what was at risk (skin in the game)
  reach?: string             // who/what it touched — required for kind=act; absent for turning
  irreversibleNote?: string
  witnessIds: PersonId[]     // optional; strong default for declared acts, empty allowed
  anonymous: boolean         // deed was/is anonymous in the world; arc still shows it
  status: declared | done | lapsed | logged   // logged = excavated from the past
  declaredAt?, dueBy?, occurredAt
  chapterId?
  originPhaseId?             // set when the act arose from a phase → renders the stem (§5.1)
  reflection?: string        // written after; material for the Telling
  exposureLevel?: 1–5        // self-assessed size of stake; used by the ladder
}

Chapter {                    // phases of Life's Work, and life-chapters
  id, name, startedAt, intendedEnd?
  shippingCondition: string  // "What will exist when this ends?" — required, with gentle enforcement (§5.3)
  status: open | shipped | closed | fallow
}

MaintenanceItem { id, title, recurrence?, lastCleared }   // deliberately minimal

Ritual { id, title, cadence }   // dignified recurring maintenance; visible as rhythm, never celebrated

FallowPeriod { chapterId?, name?: string, startedAt, endedAt? }  // user-named, first-class

MirrorEntry {  // weekly, generated
  weekOf, attentionByBranch, openLoops: EntryId[], arcAdditions: EntryId[],
  flatStatement: string      // factual, zero adjectives about the person
}
```

**Caps:** max 5 entries with status=declared at any time. Scarcity is a feature: at the cap, the user completes or consciously lapses one before declaring another. Logged past entries are uncapped.

## 4. Retention mechanics (honest ones only)

1. **Arc as possession** — people return to what accumulates identity (photo libraries, logs). The artifact's beauty is the hook; there is no other hook.
2. **Open loops** — a declared act with a date is an unresolved story; hollow stars in the future sky (§5.1) nag wordlessly. Notifications: ONLY (a) the weekly Mirror on the user's chosen day, (b) a declared act's date approaching. Nothing else, ever.
3. **The witness outside the app** — optional share of a declared act with its named witness (share sheet / link; no feed). Accountability lives with a human, not the software.
4. **The Telling** — the annual story draft gives weekly capture its purpose.

## 5. Screens

### 5.1 The Arc — home screen, one composed scene (non-negotiable)

The app opens on the Arc, never on today. The Arc is NOT three lists — it is a single landscape with three altitudes, rendered as one horizontal timeline (SVG/canvas):

- **Ground (bottom strip): maintenance as texture.** Small circles along the bottom edge — a pulse, not items. At arc zoom, individual chores are invisible; what shows is rhythm and density: the hum of a life being kept alive. Rituals render as slightly distinct rings recurring at even intervals, so a kept ritual reads as visible cadence. The ground never rises above its strip and is never brighter than the rest of the scene — it holds the picture up. Tap the ground → the maintenance sweep.
- **Middle band: phases as lines.** Each chapter is a horizontal line spanning its duration: a tick where it began, a terminal mark where it shipped (the durable thing that now exists), an open fade rightward if still running. Concurrent phases stack as parallel lines. **Fallow renders as a soft-textured band — drawn matter, full dignity, never a gap.** Tap a line → chapter detail.
- **Sky (top): acts as stars, turnings as crescents.** Sparse by design (the cap guarantees it). When an act arose from a phase (originPhaseId), draw a **faint vertical stem** from line to star: lineage made visible — this work became this act. Tap a star/crescent → its story card (beginning, stake, reach, reflection).
- **The now-line:** a vertical hairline cursor near the right edge. Left of it, the record. Right of it: **declared acts as hollow stars** that fill when done, and open phases continuing as dotted lines toward intended ends.
- **Zoom = hierarchy enforcement (level-of-detail):** zoomed out to years, the ground fades to plain texture and only stars, crescents, and major lines survive — acts are the only thing visible from orbit. Zoom to a month: lines thicken, ground circles resolve. Maximum zoom on the bottom strip = the day view. One scene, three altitudes, no tabs.
- Long empty stretches of sky render as calm space, with the quiet caption (once per viewport, small): "Most arcs are mostly quiet."

Design intent: the Arc should feel like a possession — beautiful, self-authored, book-like — something reopened the way people reopen a photo library.

### 5.2 Entry flows — two modes, two temperaments

**5.2a Excavation (logging the past) — the generous historian.**
The user brings a moment (often a proud one). The flow asks archaeology questions, one at a time, warm and curious:
- "What did you risk there that nobody made you risk?"
- "What did you start that no one asked you to?"
- "The award/result is the trace — what was the deed behind it?"
- "What did that choice look like from the outside — was there a day it showed?" (this question finds the outward hinge inside inner journeys: the day they went back to work, made the call, walked out)
Verdicts are placements, never judgments: act (star), turning (crescent), phase (line), or — rarely — a gentle note ("this reads as the announcement; shall we log the original moment it announced?"). Redirection replaces rejection everywhere. Hard rejection does not exist in excavation.
**Grief/trauma path:** some entries should not be dissected. Offer, always visible: "Keep this as yours, unclassified." It saves as a private note, no glyph, no interrogation, no follow-up.

**5.2b Declaration (a future act) — the demanding coach.**
Four tests asked directly (a beginning / skin in the game / reach beyond yourself / no taking it back), a date, exposure level 1–5, and a witness as strong default with a visible skip for safety-sensitive acts. Redirections for counterfeits, delivered flat and kind:
- No stake → "Nothing is at risk here — this looks like maintenance. Move it there?"
- Continuation → "This is the next step of [chapter], not a beginning. File it under that phase?"
- Announced-after-safe → "Stake is judged before the outcome. Log the original moment instead?"
- Hidden goodness → the Goodness clause copy (§1.3).
Tone: one sentence of placement, one of redirection. Never snark, never verdicts on the person.

### 5.3 Chapters (Life's Work)
Open/closed/fallow phases. Creating one asks for the shipping condition ("What will exist when this ends?"). If the user can't answer, allow creation but mark the line open-ended and prompt again at the next quarterly review — gentle enforcement, not a wall. Quarterly prompt to close/open chapters and declare fallow where true.

### 5.4 Maintenance
Fast batch-clearing UI reached by tapping the ground. Feels like clearing, not achieving. Completing everything produces silence — no confetti, no praise, no counters. Rituals live here with quiet dignity, shown as rhythm.

### 5.5 The Mirror (weekly)
2-minute generated review on the user's chosen day: attention by altitude (rough, not surveillance-precise), open loops (hollow stars with approaching dates), and what reached the arc. Often: "Nothing reached the arc this week." — stated flatly, once, no adjectives, immediately followed by nothing. The Mirror judges the week, never the person. Available weekly only; scarcity preserves its weight.

<!-- v2.1: the Library additionally holds Making and Preserving families
     (grand-scale but permissionless acts), with quiet Wikipedia links on a
     few examples — unnamed in copy, named only behind the link. -->

### 5.6 The Library
Curated examples organised by family — **repair, speech, promise, convening, asking, refusal, care** — each with an exposure level. Care-acts are prominent, not an appendix: the boundary drawn with a parent, the sibling confronted about an ailing mother's care, the promise made at a bedside, the escape initiated from an abusive situation. Everything in the library is doable by someone with no money, authority, or audience; nothing is dangerous, illegal, or aimed at named individuals.

Teaching happens through **contrast pairs**, side by side:
- voting (anonymous by design, no stake) vs canvassing your neighbours
- the unsent letter (rehearsal) vs the sent one
- the 100-day public streak (labour, displayed) vs the standing monthly table (convening)
- burner-account bravado (no skin in the game) vs signed dissent — vs the third case: **the anonymous whistleblower (real stake, real reach — a full act; only the authorship is concealed, and the arc is where it gets signed)**
Include a "Counterfeits" section naming the failing test for each impostor.

### 5.7 The Telling (annual)
Assembles the year's acts, turnings, reflections, chapter transitions, and fallow periods into a narrated story draft — prose chapters, explicitly NOT a stats dashboard or Wrapped clone. User edits and keeps it; exportable as a beautiful document. Epigraph, always: the sentence (§8).

### 5.8 Onboarding — "Find the acts of your life" (runs before any signup friction)

Framing is discovery, never judgment. The word "qualify" must not appear.

1. Cold open: "Think of five moments in your life you're proud of." Five inputs, nothing else on screen.
2. **Priming, one screen, before any verdicts:** "Acts are rare. Years can pass between them — that's a life, not a failure. Let's find yours."
3. Each moment goes through the excavation flow (§5.2a). Placements land one at a time — star, crescent, line — each with one warm line of why, teasing the act out of the pride rather than testing the pride. The "keep as yours, unclassified" option is present throughout.
4. Reveal: one beat of empty screen with only the sentence — *"A life is constituted by what it began, not by what it processed."* — then their arc draws itself, seeded with their real past. Target: under 10 minutes to this moment.
5. "Who could tell your story?" — up to 3 rememberers.
6. Name the current chapter.
7. Declare one exposure-level-1 act from the Library or written fresh — date attached, witness offered.
8. Pick the weekly Mirror day. Done. The user leaves owning something, not having configured something.

## 6. Banned patterns (hard rules)

- NO streaks, points, badges, levels, confetti, celebration animations on maintenance.
- NO social feed, followers, likes, comments, leaderboards, community tab.
- NO comparison between users of any kind — no benchmarks, percentiles, averages.
- NO daily-engagement pressure; the daily surface is a 20-second capture, and skipping carries zero visible penalty.
- NO shame mechanics: Mirror copy contains no adjectives about the person; fallow is first-class; empty sky is calm space; a user returning after 90 days finds no guilt copy anywhere ("we missed you" is banned).
- NO health or wellbeing claims anywhere in app or store copy — this is a reflection and story tool, never a mental-health product.
- NO AI that authors the user's acts. (v2 may add AI that *interrogates* a draft — probing the four tests — never generating content of acts.)

## 7. Tone of voice

Two registers, one voice. Backward: a warm, curious historian. Forward: a flat, precise, quietly demanding editor. Never a coach-bro, never a cheerleader. No exclamation marks. Verdicts are placements. The app is a witness and record-keeper.

## 8. The sentence — rationed

*"A life is constituted by what it began, not by what it processed."*
Appears in exactly three places, never more:
1. The onboarding reveal beat, before the arc first draws (§5.8.4).
2. The epigraph of every Telling.
3. The quiet copy beneath a long empty stretch of sky, where it reads as reassurance.
It appears nowhere else — the sentence stays rare in the app for the same reason acts stay rare in a life. Enforce via a single shared constant referenced from exactly three call sites.

## 9. Technical direction, privacy, and legal posture

- **Local-first and private by default — this is also the legal moat.** Entries contain confessions, family conflict, named third parties. All data on-device (SQLite or equivalent); full export (JSON + the Telling as document); no account, no server, no analytics SDKs, no trackers in v1. Any future feature that moves data off-device (sync, witness links) is a legal decision (India DPDP / GDPR exposure) as much as a product one, and sync if ever added is end-to-end encrypted and opt-in.
- Plain-language privacy policy stating exactly the above.
- Store positioning: journaling/reflection/lifestyle. No health claims (see §6).
- Before branding hardens: trademark search for the app name in software/wellness classes (Indian registry + USPTO if distributing globally).
- Do not reproduce passages from Arendt's writings anywhere in the app; all copy is original. "Inspired by the work of Hannah Arendt" in the about screen is fine; no implied endorsement.
- Stack: whatever ships fastest for a solo developer — React Native/Expo mobile-first, or local-first web (React + SQLite-wasm/IndexedDB). Justify the choice briefly before scaffolding. Offline-complete.
- Design language: quiet, editorial, typographic, book-like — closer to a well-set book than a dashboard. The Arc rewards craft: spend disproportionate effort there.

## 10. V1 scope (build exactly this)

Onboarding (§5.8) → the Arc landscape with zoom LOD (§5.1) → Excavation + Declaration flows (§5.2) → Chapters (§5.3) → Maintenance (§5.4) → weekly Mirror (§5.5) → static Library with ~30 examples incl. contrast pairs and care-acts (§5.6) → local storage + export.

**V2 (do not build now):** the Telling generator, AI interrogation of drafts, witness share links, exposure-ladder escalation prompts, pattern-across-acts reflection ("the shape of your story").

## 11. Acceptance checks

- App opens on the Arc; today is a subordinate strip; no tabs for the three categories.
- The Arc renders ground/lines/sky with correct glyphs (circle/line/star/crescent), fallow as textured band, stems from origin phases, hollow declared stars right of the now-line.
- Zoomed to years, maintenance detail is invisible; stars and crescents survive every zoom level.
- Excavation flow contains no hard rejection path; "keep as yours, unclassified" is always available; the word "qualify" appears nowhere.
- An entry with beginning + stake but no reach is placed as a Turning, never refused.
- An act can be saved with anonymous=true and no witnesses.
- Declaration flow asks all four tests; witness is default-on with a visible skip; max 5 declared entries enforced.
- Chapter creation without a shipping condition succeeds but is flagged open-ended and re-prompted quarterly.
- Completing all maintenance produces no celebration.
- The Mirror is weekly-only; its strings contain no adjectives about the user.
- The sentence (§8) resolves to one constant used at exactly three call sites.
- Banned-vocabulary lint passes; no health claims in any string.
- A simulated 90-day absence produces no guilt copy on return.

Begin by proposing the architecture and screen map — including how you will render and zoom the Arc — for approval, then scaffold.

---

## 12. v2.1 addendum — as built (August 2026)

The sections below record where the shipped app deliberately extends or supersedes the text above, following first-use testing. Where this addendum conflicts with §1–§11, the addendum wins.

### 12.1 Stack and AI (supersedes parts of §9, §6, §10)

- Built as a **vanilla local-first web PWA** (ES modules, no build step, Python dev server). All data in browser local storage under `acts_of_life_v3`; seven silent daily snapshots; JSON export/import; the Telling exports as a draft document assembled from the record (the narrated generator remains v2).
- **AI interrogation shipped in v1**, not v2 — as "a second reader": opt-in, bring-your-own Anthropic key, direct browser calls, off by default. It shapes excavation questions, judges declarations against the four tests, and (onboarding only) shapes three Library-style first-act suggestions around the user's chapter name. The §6 boundary holds absolutely: **AI interrogates and proposes placements; it never authors an entry.** Only the user's words are saved. The scripted flow is first-class, not a degraded mode.
- Notifications: no push (a push server would break the privacy posture). The Mirror surfaces as a quiet dot on its day; approaching dates live in the Mirror's open loops.

### 12.2 Onboarding (supersedes §5.8)

Expectation-setting comes **before** the cold open. The word "qualify" still appears nowhere.

1. **Intro, five screens** (with back buttons and quiet progress dots): (a) the hook — "Most apps manage your days. This one is for your life" over an animated, subtly labelled preview of the arc's own grammar (ground circles pulse in, a work line draws itself, a star rises), closing "First it shows you your arc. Then it helps you extend it"; (b) **the three altitudes**, each glyph beside its definition, with the overlap caveat as fine print ("a way of seeing, not a filing system"); (c) **acts, closely** — "It is the acts that define a life," lead "The acts are what make it a story," the four conditions in the shared idiom, and a spectrum of unnamed examples from the friend defended to the garden built from scrap over forty years; (d) **whose story** — "Your story is not what you say about yourself… Broadcasts fade. Acts are remembered," pivoting to the moments you're proud of, with a browse-only Library link (each of (c) and (d) makes exactly one claim — definition there, remembrance here — with no example overlap); (e) the promises — what it will never do, and what it cannot do: "It asks; you answer. The honesty of your answers is the whole instrument." **The AI choice was removed from onboarding**; the second reader lives in Settings only.
2. Cold open: five proud moments (one is enough), "Pride is where acts hide," with the browse-only Library link for reference.
3. Bridge copy connecting pride → beginnings, before any verdicts.
4. Excavation of each moment — **the written moment is carried in as a quoted epigraph; the user never re-types it.**
5. Reveal beat (the sentence) → the arc draws itself.
6. Rememberers → name the chapter → **declare one small act, explicitly tied to the named chapter** ("You called this chapter '{name}'…"), with diverse cross-domain exposure-1 picks (AI-shaped around the chapter when on) → Mirror day.
7. **Two starter rituals are seeded** (removable) so the ground shows its use from day one.
8. **A five-step guided tour** over the live arc: sky, lines, ground (including today-rings), the Begin button (which pulses until first pressed), and the menu. Replayable from Settings.

### 12.3 Excavation and declaration (amends §5.2)

- **The four tests lead their cards, in one idiom, in both flows**: "An act starts something that was not going to happen without you" / "risks something real — and accepts that risk willingly" / "lands among other people — it changes something in someone else's world" / "cannot be taken back — it sets something into the world that is no longer yours alone" — set bold above the operative question, with a quiet "Why this matters" disclosure holding the counts/doesn't-count contrasts (the trophy won risking nothing, the report that was due, failed attempts counting fully).
- **The scripted route holds the mirror up rather than judging**: star placements carry a flat four-test self-check ("…If one of these is missing, this is not a star — place it differently, or keep it private. The arc is only as true as what you set in it"), and an empty stake gets a gentle note with the alternatives already unfolded. Informed prerogative, never a gate.
- "Keep this as yours, unclassified" is **contextual, not ambient**: a sensitive-content gate (keyword net + AI judgment when on) intervenes *before* questioning — "Some moments shouldn't be taken apart… saved whole, private, off the arc, no questions asked" — and a quiet "Keep it off the arc — private, no glyph" lives on the placement screen. Kept notes collect under **Kept private**.
- The hinge question fires when reach comes back empty and carries **its own lead** ("Even a change that happened inside you usually has one visible day") so it never reads as a repeat of reach. Skips are labeled "Skip".
- The placement card names the glyph ("Acts are drawn as stars"), and re-placing act↔turning preserves the user's typed title.
- The **Begin menu names the deed**: "An act I did — a deed from your past, or a turning; we'll place it together" and "An act I will do" — so upkeep and chapters don't wander into the entry flows.

### 12.4 Chapters: phases and steps (extends §5.3)

`Chapter → phases → steps.` Phases are ordered `{name, target?, doneAt?}`; the first undone phase is *current*. Steps `{text, phaseId?, doneAt?}` live inside phases (visible only when a phase is tapped open) or loose under the chapter. **Every phase is drawn on the chapter line**: dated phases at their date (solid tick, brighter when done), undated ones spaced evenly by order between dated neighbours (dashed, fainter) until given a date. Phase name and target are editable inline.

Drawing and interaction:

- **Chapter names sit to the left of their lines**, before the begin tick, falling back above the line when the start is off-screen.
- **Phase labels lay out collision-free across all lines**: measured widths, placement below → above → a lower row, faint leader lines tethering displaced labels to their date ticks; long names truncate with the full name in the tooltip; labels that fit nowhere are dropped (the tick remains).
- **Lanes spread across the whole middle band** — wide apart (up to 44px) while chapters are few, a single chapter centred — and follow a **user-set draw order** (↑/↓ in the Chapters sheet; top of the list is drawn highest). Non-overlapping chapters still share lanes; overlapping ones never do.
- An open chapter **with every phase done draws solid**, dotted projection gone; completing the last phase **auto-opens the shipping form**, led by "Every phase is done — the road is walked." An offer, not a wall — ignorable, with the quarterly review as the fallback.

### 12.5 Maintenance (amends §5.4)

- Two kinds, named plainly: **rituals** (repeat on a rhythm) and **one-offs** (done once, then gone — a cleared one-off leaves the sweep the next day but its trace stays on the ground forever). Both removable; removing a ritual keeps its logged days.
- **Today on the ground:** what is due today waits as small rings by the now-line on the arc itself — tap one to mark it kept, no sheet, no ceremony. Capped at eight; the sweep handles the rest.

### 12.6 Mirror (amends §5.5)

"Lines advanced" counts real advancement within the week: steps completed + phases marked done + chapters shipped or closed.

### 12.7 Type and access

All type — sheets and arc labels alike — is set in rem behind a Settings control (**Text size: Default / Large / Larger**, +15% / +30%) that scales the entire app from the root. Only text scales; layout and tap targets hold. Arc label base sizes favour readability over density.
