// ═══════════════════════════════════════════════════════════════
// A second reader — optional Claude integration, bring-your-own-key.
// Hard boundary: the model interrogates and proposes placements.
// It never authors an entry; only the user's words are ever saved.
// Off by default; every call degrades silently to the scripted flow.
// ═══════════════════════════════════════════════════════════════
import { state } from './state.js';

const API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export function aiAvailable() {
  return !!(state.settings.aiOn && state.settings.aiKey);
}

const TONE = `You are the voice of "Acts of Life", a private reflection app built on a distinction between maintenance (cyclical upkeep), life's work (bounded fabrication), and acts (deeds that begin something new, with real stake, reaching beyond the self, irreversible). A fourth category, "turning", is an inward hinge: beginning + stake but no outward reach. Turnings have equal dignity; they are never a demotion.

Voice rules, absolute:
- Two registers, one voice. About the past: a warm, curious historian who excavates and never rejects. About the future: a flat, precise, quietly demanding editor.
- No exclamation marks. No praise words, no adjectives about the person. Never "great", "amazing", "brave".
- Never use these words: task, goal, habit, productivity, optimize, streak, points, score, level, crush, win, achievement, badge.
- One or two short sentences at most per question. Questions are curious, not clinical.
- Never invent, embellish, or restate the user's story in your own dramatic words. Ask; do not narrate.
- If the moment sounds like grief or trauma being dissected, stop probing: set "handle" to "offer_keep".

The four tests of an act: (1) a beginning — it started something new; (2) skin in the game — something real was at risk, judged before the outcome was known (failed acts count fully); (3) reach beyond the self — it landed among others (anonymity never voids an act); (4) irreversible. Beginning + stake without reach = turning. Deliberately hidden good deeds meant to stay unknown are "hidden goodness" — a different category, never a failed act.`;

async function call(system, messages, maxTokens = 300) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': state.settings.aiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) throw new Error('api ' + res.status);
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('no json');
  return JSON.parse(match[0]);
}

// Excavation: given the moment and answers so far, either ask the next
// probing question or propose a placement.
// Returns { handle: 'question'|'place'|'offer_keep', question?, kind?, why? }
export async function excavateNext(context) {
  const sys = TONE + `

You are in the BACKWARD register: the generous historian. The user brought a moment from their past. You have their moment and their answers so far. Decide the single most useful next step:
- If one of the four tests is still genuinely unclear and one more question would clarify it, ask it. Vary your questions; never repeat one already asked. Good archaeology questions: "What did you risk there that nobody made you risk?", "What did you start that no one asked you to?", "The result is the trace — what was the deed behind it?", "Was there a day it showed from the outside?"
- Otherwise propose a placement: "act" (beginning + stake + reach), "turning" (beginning + stake, inward), "phase" (bounded work over months — a chapter line), "announcement" (they described telling people, after it was safe — the original moment is the act), or "goodness" (hidden generosity meant to stay unknown).
- With the placement give "why": ONE warm sentence teasing the deed out of the moment — placement, never judgment. Excavation has no rejection path.
Ask at most ${context.maxQuestions} questions total; ${context.asked} have been asked.

Reply with ONLY a JSON object: {"handle":"question","question":"...","test":"beginning|stake|reach|hinge"} ("test" names which of the four tests the question probes) or {"handle":"place","kind":"act|turning|phase|announcement|goodness","why":"..."} or {"handle":"offer_keep"}.`;
  const user = `The moment: ${context.moment}

Answers so far:
${context.answers.map(a => `Q: ${a.q}\nA: ${a.a || '(nothing came)'}`).join('\n\n') || '(none yet)'}`;
  return call(sys, [{ role: 'user', content: user }]);
}

// Declaration: check a drafted future act against the four tests.
// Returns { handle: 'stands'|'redirect', redirect?: 'no_stake'|'continuation'|'after_safe'|'goodness', note? }
export async function declarationCheck(draft) {
  const sys = TONE + `

You are in the FORWARD register: the flat, precise editor. The user is declaring a FUTURE act. Judge the draft against the four tests. Counterfeits to catch:
- no real stake → redirect "no_stake" (it is maintenance)
- the next step of existing work, not a beginning → redirect "continuation"
- announcing something already done and safe → redirect "after_safe"
- deliberately hidden goodness meant to stay unknown → redirect "goodness"
If it stands as an act, say so. If redirecting, "note" is ONE flat, kind sentence naming the failing test — about the draft, never the person. When genuinely uncertain, let it stand; the bar is high but the editor is not a wall.

Reply with ONLY a JSON object: {"handle":"stands"} or {"handle":"redirect","redirect":"no_stake|continuation|after_safe|goodness","note":"..."}.`;
  const user = `Declared act draft:
What it begins: ${draft.beginning}
What is at risk: ${draft.stake}
Whose world it reaches: ${draft.reach}
Why it can't be taken back: ${draft.irreversibleNote}
Open chapters of work: ${draft.chapters.join('; ') || '(none)'}`;
  return call(sys, [{ role: 'user', content: user }]);
}

// Onboarding: shape three small first-act suggestions around the name
// of the user's current chapter. These are Library-style templates the
// user picks from and edits — never presented as their own words.
export async function suggestActs(chapterName) {
  const sys = TONE + `

The user has just named the current chapter of their life. Propose exactly 3 small first acts they might declare — in the spirit of a library of examples, shaped loosely around that chapter but never presuming facts you don't know. Each must: begin something new, involve a small real risk (exposure 1 — a raised eyebrow, no more), reach at least one other person, and be doable within two weeks with no money, authority, or audience. Spread them across different areas of life. Title: at most 6 plain words. Text: one concrete sentence, starting with a verb.

Reply with ONLY a JSON object: {"suggestions":[{"title":"...","text":"..."},{"title":"...","text":"..."},{"title":"...","text":"..."}]}.`;
  const res = await call(sys, [{ role: 'user', content: `The chapter: ${chapterName}` }], 500);
  if (!res || !Array.isArray(res.suggestions)) throw new Error('bad');
  return res.suggestions.slice(0, 3).filter(s => s.title && s.text);
}

export async function testKey(key) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 8, messages: [{ role: 'user', content: 'Say ok.' }] }),
  });
  return res.ok;
}
