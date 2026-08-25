// ═══════════════════════════════════════════════════════════════
// The Mirror — weekly only. It judges the week, never the person.
// Zero adjectives about the user anywhere in its strings.
// ═══════════════════════════════════════════════════════════════
import { S } from './strings.js';
import { state, save, declaredEntries } from './state.js';
import { glyphHtml } from './glyphs.js';
import { openSheet } from './ui.js';
import { esc, fill, dateMs, msToIso, fmtShort, DAY } from './util.js';
import { openStory } from './story.js';

// The most recent occurrence of the chosen mirror day, today included.
function lastMirrorDayMs() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = (now.getDay() - state.settings.mirrorDay + 7) % 7;
  return now.getTime() - diff * DAY;
}

function inWindow(iso, startMs, endMs) {
  if (!iso) return false;
  const t = dateMs(iso);
  return t >= startMs && t < endMs;
}

function generateMirror() {
  const end = lastMirrorDayMs() + DAY;       // window ends at the end of mirror day
  const start = end - 7 * DAY;
  const weekOf = msToIso(start);
  const existing = state.mirrors.find(m => m.weekOf === weekOf);
  if (existing) return existing;

  const ground = state.maintLog.filter(l => inWindow(l.date, start, end)).length;
  // Lines advanced: steps completed, phases marked done, chapters
  // shipped or closed — within the week.
  const lines = state.chapters.reduce((n, c) => {
    const steps = (c.steps || []).filter(s => s.doneAt && inWindow(s.doneAt, start, end)).length;
    const phases = (c.phases || []).filter(p => p.doneAt && inWindow(p.doneAt, start, end)).length;
    const ended = c.endedAt && inWindow(c.endedAt, start, end) ? 1 : 0;
    return n + steps + phases + ended;
  }, 0);
  const arcAdditions = state.entries
    .filter(e => e.kind !== 'note' && inWindow(e.createdAt, start, end))
    .map(e => e.id);
  const openLoops = declaredEntries()
    .sort((a, b) => (a.dueBy || '').localeCompare(b.dueBy || ''))
    .map(e => e.id);

  let flat;
  if (arcAdditions.length === 0) flat = S.mirror.nothingReached;
  else {
    const titles = arcAdditions.map(id => state.entries.find(e => e.id === id)).filter(Boolean).map(e => e.title);
    flat = titles.join('. ') + '.';
  }

  const m = { weekOf, attention: { ground, lines, sky: arcAdditions.length }, openLoops, arcAdditions, flatStatement: flat };
  state.mirrors.push(m);
  save();
  return m;
}

export function openMirror(onChange) {
  openSheet((el, ctx) => renderMirror(el, ctx), { tall: true, onClose: onChange });
}

function dots(n, cap = 14) {
  const shown = Math.min(n, cap);
  return Array.from({ length: shown }, () => '<span class="att-dot"></span>').join('') +
    (n > cap ? `<span class="att-more">+${n - cap}</span>` : '');
}

function renderMirror(el, ctx) {
  const m = generateMirror();
  const loops = m.openLoops.map(id => state.entries.find(e => e.id === id)).filter(e => e && e.status === 'declared');
  const additions = m.arcAdditions.map(id => state.entries.find(e => e.id === id)).filter(Boolean);
  const past = state.mirrors.filter(x => x.weekOf !== m.weekOf).sort((a, b) => b.weekOf.localeCompare(a.weekOf));

  el.innerHTML = `
    <header class="sheet-head">
      <h2>${S.mirror.title}</h2>
      <p class="sheet-sub">${S.mirror.weekOf} ${fmtShort(m.weekOf, S.months)}</p>
    </header>

    <p class="mirror-flat">${esc(m.flatStatement)}</p>

    <div class="story-field">
      <span class="kicker">${S.mirror.attention}</span>
      <div class="att-row"><span class="att-label">${S.mirror.attentionGround}</span>${dots(m.attention.ground)}<span class="att-n">${m.attention.ground || ''}</span></div>
      <div class="att-row"><span class="att-label">${S.mirror.attentionLines}</span>${dots(m.attention.lines)}<span class="att-n">${m.attention.lines || ''}</span></div>
      <div class="att-row"><span class="att-label">${S.mirror.attentionSky}</span>${dots(m.attention.sky)}<span class="att-n">${m.attention.sky || ''}</span></div>
    </div>

    ${loops.length ? `
      <div class="story-field">
        <span class="kicker">${S.mirror.openLoops}</span>
        ${loops.map(e => `
          <button class="loop-row" data-id="${e.id}">
            ${glyphHtml('act', 14, 'var(--ember)', true)}
            <span>${esc(e.title)}</span>
            <span class="meta">${e.dueBy ? fill(S.mirror.openLoopDue, { date: fmtShort(e.dueBy, S.months) }) : ''}</span>
          </button>`).join('')}
      </div>` : ''}

    ${additions.length ? `
      <div class="story-field">
        <span class="kicker">${S.mirror.arcAdditions}</span>
        ${additions.map(e => `
          <button class="loop-row" data-id="${e.id}">
            ${glyphHtml(e.kind, 14, 'var(--ember)')}
            <span>${esc(e.title)}</span>
          </button>`).join('')}
      </div>` : ''}

    ${past.length ? `
      <div class="story-field">
        <span class="kicker">${S.mirror.pastMirrors}</span>
        ${past.slice(0, 12).map(x => `<p class="soft">${fmtShort(x.weekOf, S.months)} — ${esc(x.flatStatement)}</p>`).join('')}
      </div>` : ''}`;

  el.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => openStory(b.dataset.id, ctx.rerender)));
}

// Surfaced on the Arc only when it is the mirror day (or later in the
// week with the mirror still unread this week). Quiet, wordless pull.
export function mirrorFresh() {
  const end = lastMirrorDayMs() + DAY;
  const weekOf = msToIso(end - 7 * DAY);
  return !state.mirrors.some(m => m.weekOf === weekOf);
}
