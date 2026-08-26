// ═══════════════════════════════════════════════════════════════
// The Arc — one composed scene, three altitudes, no tabs.
// Sky: acts as stars, turnings as crescents.  Middle: chapters as
// lines, fallow as textured band.  Ground: maintenance as texture.
// Zoom is the hierarchy: from orbit, only the stars survive.
// ═══════════════════════════════════════════════════════════════
import { S } from './strings.js';
import { SENTENCE } from './sentence.js';
import { state, save, clearMaintenance, clearedToday, ritualDueToday } from './state.js';
import { starPath, crescent } from './glyphs.js';
import { esc, dateMs, DAY, clamp, hash01, easeInOut } from './util.js';
import { openSweep } from './sweep.js';
import { openStory } from './story.js';
import { openChapters, openChapterDetail, quarterlyDue, openQuarterly } from './chapter.js';
import { openExcavation } from './excavate.js';
import { openDeclaration } from './declare.js';
import { openMirror, mirrorFresh } from './mirror.js';
import { openLibrary } from './library.js';
import { openSettings, openKept } from './settings.js';

let domain = null;          // { t0, t1 } in ms
let svgEl = null, appEl = null;
let revealPending = false;

const MIN_SPAN = 3 * DAY;
const MAX_SPAN = 120 * 365 * DAY;

// ── Domain ──────────────────────────────────────────────────────
function contentTimes() {
  const ts = [];
  for (const e of state.entries) {
    if (e.kind === 'note') continue;
    if (e.occurredAt) ts.push(dateMs(e.occurredAt));
    if (e.dueBy) ts.push(dateMs(e.dueBy));
  }
  for (const c of state.chapters) {
    ts.push(dateMs(c.startedAt));
    if (c.endedAt) ts.push(dateMs(c.endedAt));
    if (c.intendedEnd) ts.push(dateMs(c.intendedEnd));
  }
  for (const l of state.maintLog) ts.push(dateMs(l.date));
  return ts;
}

export function fitDomain() {
  const now = Date.now();
  const ts = contentTimes();
  let t0 = ts.length ? Math.min(...ts) : now - 365 * DAY;
  let t1 = Math.max(now + 180 * DAY, ...(ts.length ? [Math.max(...ts) + 90 * DAY] : []));
  const span = Math.max(t1 - t0, 200 * DAY);
  t0 = t1 - span;
  domain = { t0: t0 - span * 0.06, t1: t1 + span * 0.02 };
}

function setDomain(t0, t1) {
  let span = clamp(t1 - t0, MIN_SPAN, MAX_SPAN);
  const mid = (t0 + t1) / 2;
  domain = { t0: mid - span / 2, t1: mid + span / 2 };
}

let animId = null;
function animateDomainTo(t0, t1) {
  cancelAnimationFrame(animId);
  const from = { ...domain };
  const start = performance.now();
  const dur = 450;
  const step = (now) => {
    const k = easeInOut(clamp((now - start) / dur, 0, 1));
    domain = { t0: from.t0 + (t0 - from.t0) * k, t1: from.t1 + (t1 - from.t1) * k };
    drawScene();
    if (k < 1) animId = requestAnimationFrame(step);
  };
  animId = requestAnimationFrame(step);
}

// ── Scene ───────────────────────────────────────────────────────
export function renderArc(opts = {}) {
  appEl = document.getElementById('app');
  if (!domain) fitDomain();
  if (opts.reveal) revealPending = true;

  appEl.innerHTML = `
    <div class="arc-root">
      <svg id="arc" preserveAspectRatio="none"></svg>
      <header class="arc-header">
        <span class="wordmark">${S.app.name}</span>
        <button class="menu-btn" data-menu aria-label="menu">
          ${mirrorFresh() && isMirrorWeekday() ? '<span class="menu-dot"></span>' : ''}
          <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="3" cy="9" r="1.6" fill="currentColor"/><circle cx="9" cy="9" r="1.6" fill="currentColor"/><circle cx="15" cy="9" r="1.6" fill="currentColor"/></svg>
        </button>
        <nav class="arc-menu" hidden>
          <button data-go="mirror">${S.arc.menuMirror}${mirrorFresh() && isMirrorWeekday() ? ' <span class="menu-dot inline"></span>' : ''}</button>
          <button data-go="library">${S.arc.menuLibrary}</button>
          <button data-go="chapters">${S.arc.menuChapters}</button>
          <button data-go="kept">${S.arc.menuKept}</button>
          <button data-go="settings">${S.arc.menuSettings}</button>
        </nav>
      </header>
      ${quarterlyDue() ? `<button class="quarterly-pill" data-quarterly>${S.chapters.quarterlyTitle}</button>` : ''}
      <div class="arc-controls">
        <button data-z="out" aria-label="zoom out">−</button>
        <button data-z="fit">${S.arc.fit}</button>
        <button data-z="in" aria-label="zoom in">+</button>
      </div>
      <button class="begin-btn ${state.settings.begunOnce ? '' : 'pulse'}" data-begin>${S.arc.begin}</button>
    </div>`;

  svgEl = appEl.querySelector('#arc');
  wireInteractions();
  wireChrome();
  drawScene();
}

function isMirrorWeekday() {
  return new Date().getDay() === state.settings.mirrorDay;
}

export function refreshArc() { renderArc(); }

let menuCloser = null;
function wireChrome() {
  const menu = appEl.querySelector('.arc-menu');
  appEl.querySelector('[data-menu]').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  if (menuCloser) document.removeEventListener('click', menuCloser);
  menuCloser = () => { if (menu.isConnected && !menu.hidden) menu.hidden = true; };
  document.addEventListener('click', menuCloser);
  const go = {
    mirror: () => openMirror(refreshArc),
    library: () => openLibrary(refreshArc),
    chapters: () => openChapters(refreshArc),
    kept: () => openKept(refreshArc),
    settings: () => openSettings(refreshArc),
  };
  menu.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go[b.dataset.go]()));
  appEl.querySelector('[data-begin]').addEventListener('click', openBegin);
  appEl.querySelector('[data-quarterly]')?.addEventListener('click', () => openQuarterly(refreshArc));
  appEl.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => {
    const { t0, t1 } = domain;
    const mid = (t0 + t1) / 2, half = (t1 - t0) / 2;
    if (b.dataset.z === 'in') animateDomainTo(mid - half / 2, mid + half / 2);
    else if (b.dataset.z === 'out') animateDomainTo(mid - half * 2, mid + half * 2);
    else { fitDomain(); drawScene(); }
  }));
}

function openBegin() {
  if (!state.settings.begunOnce) {
    state.settings.begunOnce = true;
    save();
    appEl.querySelector('.begin-btn')?.classList.remove('pulse');
  }
  import('./ui.js').then(({ openSheet }) => {
    openSheet((el, ctx) => {
      el.innerHTML = `
        <header class="sheet-head"><h2>${S.begin.title}</h2></header>
        <div class="begin-grid">
          <button data-b="excavate"><b>${S.begin.excavate}</b><span>${S.begin.excavateSub}</span></button>
          <button data-b="declare"><b>${S.begin.declare}</b><span>${S.begin.declareSub}</span></button>
          <button data-b="chapter"><b>${S.begin.chapter}</b><span>${S.begin.chapterSub}</span></button>
          <button data-b="ground"><b>${S.begin.ground}</b><span>${S.begin.groundSub}</span></button>
        </div>`;
      el.querySelector('[data-b="excavate"]').addEventListener('click', () => { ctx.close(); openExcavation({ onDone: refreshArc, onKeep: refreshArc }); });
      el.querySelector('[data-b="declare"]').addEventListener('click', () => { ctx.close(); openDeclaration({ onDone: refreshArc }); });
      el.querySelector('[data-b="chapter"]').addEventListener('click', () => { ctx.close(); openChapters(refreshArc); });
      el.querySelector('[data-b="ground"]').addEventListener('click', () => { ctx.close(); openSweep(refreshArc); });
    });
  });
}

// ── Drawing ─────────────────────────────────────────────────────
function xOf(t, W) { return (t - domain.t0) / (domain.t1 - domain.t0) * W; }

function drawScene() {
  if (!svgEl) return;
  const W = svgEl.clientWidth || appEl.clientWidth;
  const H = svgEl.clientHeight || appEl.clientHeight;
  if (!W || !H) return;
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const spanDays = (domain.t1 - domain.t0) / DAY;
  const ppd = W / spanDays;          // pixels per day: the LOD driver
  const now = Date.now();
  const nowX = xOf(now, W);

  const skyTop = H * 0.10, skyBot = H * 0.56;
  const bandTop = H * 0.60, bandBot = H * 0.80;
  const axisY = H * 0.835;
  const groundTop = H * 0.868, groundBot = H * 0.965;

  const parts = [];
  parts.push(defs(W, H));
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#dusk)"/>`);
  parts.push(`<rect x="0" y="${groundTop - 6}" width="${W}" height="${H - groundTop + 6}" fill="url(#soil)"/>`);

  parts.push(drawAxis(W, H, axisY, ppd));
  parts.push(drawGround(W, groundTop, groundBot, ppd));
  parts.push(drawChapters(W, bandTop, bandBot, ppd, nowX));
  const sky = drawSky(W, skyTop, skyBot, bandTop, ppd, nowX);
  parts.push(sky.svg);
  parts.push(drawCaption(W, H, skyTop, skyBot, sky.xs, spanDays));

  // The now-line: left of it the record, right of it the declared.
  parts.push(`<line x1="${nowX}" y1="${H * 0.04}" x2="${nowX}" y2="${groundBot}" stroke="var(--ember-bright)" stroke-width="1" opacity=".55"/>`);
  parts.push(`<text x="${nowX + 5}" y="${H * 0.045 + 8}" class="axis-label now-label">${S.arc.now}</text>`);

  // Invisible tap zone for the ground.
  parts.push(`<rect x="0" y="${groundTop - 14}" width="${W}" height="${H - groundTop + 14}" fill="transparent" data-tap="ground" style="cursor:pointer"><title>${S.ground.title}</title></rect>`);

  // Today on the ground: what is due waits as rings by the now-line —
  // tappable, one by one, with no ceremony. Drawn above the tap zone.
  parts.push(drawTodayGround(W, groundTop, groundBot, nowX));

  svgEl.innerHTML = parts.join('');

  if (revealPending) {
    revealPending = false;
    svgEl.classList.add('reveal');
    setTimeout(() => svgEl.classList.remove('reveal'), 4000);
  }
}

function defs(W, H) {
  return `<defs>
    <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#15161e"/>
      <stop offset="0.55" stop-color="#1d1c20"/>
      <stop offset="1" stop-color="#242019"/>
    </linearGradient>
    <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(245,234,216,0)"/>
      <stop offset="1" stop-color="rgba(245,234,216,.05)"/>
    </linearGradient>
    <pattern id="fallowPat" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(245,234,216,.22)" stroke-width="1.2"/>
    </pattern>
    <radialGradient id="starGlow">
      <stop offset="0" stop-color="rgba(246,160,107,.5)"/>
      <stop offset="1" stop-color="rgba(246,160,107,0)"/>
    </radialGradient>
  </defs>`;
}

// ── Axis: quiet time markers ──
function drawAxis(W, H, y, ppd) {
  const out = [];
  out.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(245,234,216,.10)" stroke-width="1"/>`);
  const d0 = new Date(domain.t0), d1 = new Date(domain.t1);
  const pxPerYear = ppd * 365;
  if (ppd > 40) {
    // days
    const start = new Date(d0); start.setHours(0, 0, 0, 0);
    for (let t = start.getTime(); t < domain.t1; t += DAY) {
      const x = xOf(t, W);
      const d = new Date(t);
      out.push(`<line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 3}" stroke="rgba(245,234,216,.18)"/>`);
      out.push(`<text x="${x + 3}" y="${y + 14}" class="axis-label">${d.getDate()}${d.getDate() === 1 ? ' ' + S.months[d.getMonth()].slice(0, 3) : ''}</text>`);
    }
  } else if (ppd * 30 > 44) {
    // months
    const start = new Date(d0.getFullYear(), d0.getMonth(), 1);
    for (let d = start; d.getTime() < domain.t1; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const x = xOf(d.getTime(), W);
      out.push(`<line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 3}" stroke="rgba(245,234,216,.18)"/>`);
      out.push(`<text x="${x + 3}" y="${y + 14}" class="axis-label">${S.months[d.getMonth()].slice(0, 3)}${d.getMonth() === 0 ? ' ' + d.getFullYear() : ''}</text>`);
    }
  } else {
    // years — thin out below 40px per year
    const every = pxPerYear > 40 ? 1 : pxPerYear > 8 ? 5 : 10;
    const y0 = Math.ceil(d0.getFullYear() / every) * every;
    for (let yr = y0; yr <= d1.getFullYear(); yr += every) {
      const x = xOf(new Date(yr, 0, 1).getTime(), W);
      out.push(`<line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 3}" stroke="rgba(245,234,216,.18)"/>`);
      out.push(`<text x="${x + 3}" y="${y + 14}" class="axis-label">${yr}</text>`);
    }
  }
  return out.join('');
}

// ── Ground: maintenance as texture, never brighter than the scene ──
function drawGround(W, top, bot, ppd) {
  const out = [];
  const mid = (top + bot) / 2;
  const logs = state.maintLog.filter(l => {
    const t = dateMs(l.date);
    return t >= domain.t0 - DAY && t <= domain.t1 + DAY;
  });
  if (ppd >= 1.6) {
    // resolved: individual circles and ritual rings
    for (const l of logs) {
      const t = dateMs(l.date);
      const j = hash01(l.itemId + l.date);
      const x = xOf(t + j * DAY * 0.8, W);
      const yy = top + 4 + j * (bot - top - 8);
      if (l.kind === 'ritual') {
        out.push(`<circle cx="${x}" cy="${yy}" r="3.1" fill="none" stroke="rgba(245,234,216,.34)" stroke-width="1"/>`);
      } else {
        out.push(`<circle cx="${x}" cy="${yy}" r="2.1" fill="rgba(245,234,216,.24)"/>`);
      }
    }
  } else {
    // texture: density buckets → the hum of a life being kept alive
    const bucketDays = ppd > 0.25 ? 7 : 30;
    const bucketMs = bucketDays * DAY;
    const counts = new Map();
    for (const l of logs) {
      const b = Math.floor(dateMs(l.date) / bucketMs);
      counts.set(b, (counts.get(b) || 0) + 1);
    }
    const alpha = ppd > 0.06 ? 0.16 : 0.07;
    for (const [b, n] of counts) {
      const x = xOf(b * bucketMs + bucketMs / 2, W);
      const r = clamp(1.6 + Math.sqrt(n) * 1.1, 1.6, (bot - top) / 2 - 1);
      out.push(`<circle cx="${x}" cy="${mid}" r="${r}" fill="rgba(245,234,216,${alpha})"/>`);
    }
  }
  return out.join('');
}

// ── Today on the ground: due rituals and one-offs as tappable rings ──
function drawTodayGround(W, top, bot, nowX) {
  if (nowX < 20 || nowX > W + 40) return '';
  const mid = (top + bot) / 2;
  const todays = [
    ...state.rituals.map(r => ({ id: r.id, kind: 'ritual', title: r.title, due: ritualDueToday(r), done: clearedToday(r.id) })),
    ...state.maintenance
      .filter(m => !m.lastCleared || clearedToday(m.id))
      .map(m => ({ id: m.id, kind: 'item', title: m.title, due: true, done: clearedToday(m.id) })),
  ].filter(t => t.due || t.done).slice(0, 8);
  if (!todays.length) return '';

  const out = [];
  todays.forEach((t, i) => {
    const x = Math.min(nowX, W) - 14 - i * 18;
    if (x < 10) return;
    const cream = a => `rgba(245,234,216,${a})`;
    if (t.kind === 'ritual') {
      out.push(t.done
        ? `<circle cx="${x}" cy="${mid}" r="4" fill="none" stroke="${cream(.85)}" stroke-width="2"/>`
        : `<circle cx="${x}" cy="${mid}" r="4.5" fill="none" stroke="${cream(.4)}" stroke-width="1.2"/>`);
    } else {
      out.push(t.done
        ? `<circle cx="${x}" cy="${mid}" r="3.2" fill="${cream(.85)}"/>`
        : `<circle cx="${x}" cy="${mid}" r="3.4" fill="none" stroke="${cream(.4)}" stroke-width="1.2" stroke-dasharray="2 2"/>`);
    }
    out.push(`<circle cx="${x}" cy="${mid}" r="11" fill="transparent" class="today-hit" data-tg="${t.id}" data-tg-kind="${t.kind}" style="cursor:pointer"><title>${esc(t.title)}</title></circle>`);
  });
  return out.join('');
}

// ── Middle band: chapters as lines, fallow as drawn matter ──
function chapterLanes(chapters) {
  // The user's draw order decides who sits higher; within a lane,
  // chapters may share it only when their spans don't collide.
  const sorted = [...chapters].sort((a, b) =>
    (a.order || 0) - (b.order || 0) || a.startedAt.localeCompare(b.startedAt));
  const GAP = 20 * DAY;
  const lanes = [];   // each lane: a list of [start, end] intervals
  const out = new Map();
  for (const c of sorted) {
    const s = dateMs(c.startedAt);
    const e = c.endedAt ? dateMs(c.endedAt) : (c.intendedEnd ? Math.max(dateMs(c.intendedEnd), Date.now()) : Date.now() + 90 * DAY);
    let lane = lanes.findIndex(ivs => ivs.every(([is, ie]) => e + GAP < is || ie + GAP < s));
    if (lane === -1) { lane = lanes.length; lanes.push([]); }
    lanes[lane].push([s, e]);
    out.set(c.id, lane);
  }
  return { laneOf: out, count: Math.max(1, lanes.length) };
}

let chapterYCache = new Map();   // used by stems

// Phase labels are laid out globally: measured widths, collision checks
// against every other label (and chapter names), placement below the
// line first, then above, then a lower row — with a faint leader line
// tethering any displaced label to its date tick. Labels that fit
// nowhere are dropped; the tick and tooltip remain.
function layoutPhaseLabels(jobs, placed, W) {
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const charW = 0.6875 * rootPx * 0.62;   // .phase-label is 0.6875rem mono
  const out = [];
  jobs.sort((a, b) => a.x - b.x);
  for (const j of jobs) {
    const name = j.name.length > 26 ? j.name.slice(0, 24) + '…' : j.name;
    const w = name.length * charW + 6;
    let anchor = 'start', lx = j.x + 3, xi1 = lx, xi2 = lx + w;
    if (xi2 > W - 4) { anchor = 'end'; lx = j.x - 3; xi1 = lx - w; xi2 = lx; }
    if (xi1 < 2) { anchor = 'start'; lx = 2; xi1 = 2; xi2 = 2 + w; }
    const cands = [j.tickY + 13, j.tickY - 9, j.tickY + 26];
    let y = null, ci = -1;
    for (let k = 0; k < cands.length; k++) {
      const cy = cands[k];
      const clash = placed.some(r => !(xi2 < r.x1 - 6 || xi1 > r.x2 + 6) && Math.abs(cy - r.y) < 11);
      if (!clash) { y = cy; ci = k; break; }
    }
    if (y == null) continue;
    placed.push({ x1: xi1, x2: xi2, y });
    if (ci === 1) out.push(`<line x1="${j.x}" y1="${j.tickY - 4}" x2="${j.x}" y2="${y + 2}" stroke="rgba(245,234,216,.16)" stroke-width="1"/>`);
    if (ci === 2) out.push(`<line x1="${j.x}" y1="${j.tickY + 4}" x2="${j.x}" y2="${y - 8}" stroke="rgba(245,234,216,.16)" stroke-width="1"/>`);
    out.push(`<text x="${lx}" y="${y}" text-anchor="${anchor}" class="phase-label" opacity="${j.op}"><title>${esc(j.name)}</title>${esc(name)}</text>`);
  }
  return out.join('');
}

function drawChapters(W, top, bot, ppd, nowX) {
  const out = [];
  const labelJobs = [];
  const placedRects = [];
  chapterYCache = new Map();
  let chapters = state.chapters.filter(c => {
    const s = dateMs(c.startedAt);
    const e = c.endedAt ? dateMs(c.endedAt) : domain.t1;
    return e >= domain.t0 && s <= domain.t1;
  });
  // From orbit, only major lines survive.
  if (ppd < 0.1) {
    chapters = chapters.filter(c => {
      const s = dateMs(c.startedAt);
      const e = c.endedAt ? dateMs(c.endedAt) : Date.now();
      return (e - s) > 180 * DAY;
    });
  }
  const { laneOf, count } = chapterLanes(chapters);
  // Spread lanes across the whole band: wide apart while chapters are
  // few, tightening only as they accumulate. A single chapter centres.
  const bandH = bot - top;
  const laneGap = count > 1 ? Math.min(44, (bandH - 16) / (count - 1)) : 0;
  const y0 = count > 1 ? top + 8 : top + bandH / 2;
  const strokeW = ppd > 2 ? 2.4 : ppd > 0.3 ? 1.8 : 1.2;

  for (const c of chapters) {
    const lane = laneOf.get(c.id) || 0;
    const y = y0 + lane * laneGap;
    chapterYCache.set(c.id, y);
    const s = dateMs(c.startedAt);
    const x1 = xOf(s, W);
    const nowMs = Date.now();
    const cream = a => `rgba(245,234,216,${a})`;
    const ended = c.endedAt ? dateMs(c.endedAt) : null;

    // begin tick
    out.push(`<line x1="${x1}" y1="${y - 4}" x2="${x1}" y2="${y + 4}" stroke="${cream(.5)}" stroke-width="1.2"/>`);

    if (ended) {
      const x2 = Math.max(xOf(ended, W), x1 + 5);
      out.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${cream(c.status === 'closed' ? .3 : .6)}" stroke-width="${strokeW}"/>`);
      if (c.status === 'shipped') {
        // the terminal mark: the durable thing now exists
        out.push(`<rect x="${x2 - 3.4}" y="${y - 3.4}" width="6.8" height="6.8" transform="rotate(45 ${x2} ${y})" fill="${cream(.85)}"/>`);
      }
    } else {
      const xNow = xOf(Math.min(nowMs, domain.t1), W);
      // A chapter whose road is fully walked (every phase done) draws
      // solid — the dotted intention is gone; only shipping remains.
      const phasesAll = (c.phases || []);
      const allDone = phasesAll.length > 0 && phasesAll.every(p => p.doneAt);
      out.push(`<line x1="${x1}" y1="${y}" x2="${Math.max(xNow, x1 + 5)}" y2="${y}" stroke="${cream(allDone ? .68 : .52)}" stroke-width="${strokeW}"/>`);
      const intend = c.intendedEnd ? dateMs(c.intendedEnd) : nowMs + 90 * DAY;
      if (!allDone && intend > nowMs) {
        // beyond now: dotted intention
        out.push(`<line x1="${xNow}" y1="${y}" x2="${xOf(intend, W)}" y2="${y}" stroke="${cream(.28)}" stroke-width="${strokeW * 0.8}" stroke-dasharray="2 5"/>`);
      }
    }

    // fallow: soft textured band, full dignity, never a gap
    for (const f of state.fallow.filter(f => f.chapterId === c.id)) {
      const fs = xOf(dateMs(f.startedAt), W);
      const fe = xOf(f.endedAt ? dateMs(f.endedAt) : Date.now(), W);
      out.push(`<rect x="${fs}" y="${y - 5}" width="${Math.max(2, fe - fs)}" height="10" rx="5" fill="url(#fallowPat)"/>`);
    }

    // phase ticks: the road through the chapter. Dated phases sit at
    // their dates; undated ones are spaced by order between their
    // dated neighbours (or the chapter's ends), drawn fainter.
    const endMs = ended || (c.intendedEnd ? dateMs(c.intendedEnd) : nowMs + 90 * DAY);
    const phs = c.phases || [];
    const times = phs.map(p => (p.doneAt || p.target) ? dateMs(p.doneAt || p.target) : null);
    for (let i = 0; i < times.length; i++) {
      if (times[i] != null) continue;
      let a = s, b = endMs, prevIdx = -1, nextIdx = times.length;
      for (let j = i - 1; j >= 0; j--) if (times[j] != null) { a = times[j]; prevIdx = j; break; }
      for (let j = i + 1; j < times.length; j++) if (times[j] != null) { b = times[j]; nextIdx = j; break; }
      times[i] = a + (b - a) * ((i - prevIdx) / (nextIdx - prevIdx));
    }
    phs.forEach((p, i) => {
      const dated = !!(p.doneAt || p.target);
      const pt = clamp(times[i], s, endMs);
      const px = xOf(pt, W);
      if (px < -20 || px > W + 20) return;
      out.push(`<line x1="${px}" y1="${y - 3.5}" x2="${px}" y2="${y + 3.5}" stroke="${cream(p.doneAt ? .7 : dated ? .35 : .25)}" stroke-width="1.4" ${dated ? '' : 'stroke-dasharray="2 2"'}/>`);
      if (ppd > 0.25) {
        labelJobs.push({ x: px, tickY: y, name: p.name, op: p.doneAt ? .8 : dated ? .55 : .4 });
      }
    });

    // label
    // The chapter's name sits to the left, before the line begins.
    // When the start is off-screen (or hugs the left edge), the name
    // falls back to riding above the line.
    const xEnd = ended ? xOf(ended, W) : nowX;
    if (ppd > 0.045 && x1 < W + 20 && xEnd > -20) {
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const w = c.name.length * 0.7812 * rootPx * 0.55;
      if (x1 - 10 - w > 4) {
        out.push(`<text x="${x1 - 10}" y="${y + 4}" text-anchor="end" class="chapter-label">${esc(c.name)}</text>`);
        placedRects.push({ x1: x1 - 10 - w, x2: x1 - 10, y });
      } else if (xEnd - Math.max(x1, 0) > 64) {
        const lx = Math.max(x1 + 4, 8);
        out.push(`<text x="${lx}" y="${y - 7}" class="chapter-label">${esc(c.name)}</text>`);
        placedRects.push({ x1: lx, x2: lx + w, y: y - 7 });
      }
    }
    // tap target with a native tooltip
    out.push(`<line x1="${x1}" y1="${y}" x2="${Math.max(xEnd, x1 + 20)}" y2="${y}" stroke="transparent" stroke-width="22" data-chapter="${c.id}" style="cursor:pointer"><title>${esc(c.name)}</title></line>`);
  }

  // free-floating fallow (no chapter): a band across the middle
  for (const f of state.fallow.filter(f => !f.chapterId)) {
    const fs = xOf(dateMs(f.startedAt), W);
    const fe = xOf(f.endedAt ? dateMs(f.endedAt) : Date.now(), W);
    const y = bot - 10;
    out.push(`<rect x="${fs}" y="${y - 5}" width="${Math.max(2, fe - fs)}" height="10" rx="5" fill="url(#fallowPat)"/>`);
  }

  out.push(layoutPhaseLabels(labelJobs, placedRects, W));
  return out.join('');
}

// ── Sky: stars and crescents. Sparse by design. ──
function drawSky(W, top, bot, bandTop, ppd, nowX) {
  const out = [];
  const xs = [];
  const entries = state.entries
    .filter(e => e.kind !== 'note')
    .map(e => {
      const t = e.status === 'declared'
        ? (e.dueBy ? dateMs(e.dueBy) : Date.now() + 30 * DAY)
        : (e.occurredAt ? dateMs(e.occurredAt) : null);
      return t == null ? null : { e, t };
    })
    .filter(Boolean)
    .filter(({ t }) => t >= domain.t0 - DAY && t <= domain.t1 + DAY)
    .sort((a, b) => a.t - b.t);

  // organic but stable vertical placement, with collision relief
  const placed = [];
  for (const it of entries) {
    const { e } = it;
    const x = xOf(it.t, W);
    const isTurning = e.kind === 'turning';
    const zoneTop = isTurning ? top + (bot - top) * 0.62 : top;
    const zoneBot = isTurning ? bot : top + (bot - top) * 0.58;
    let y = zoneTop + hash01(e.id) * (zoneBot - zoneTop);
    for (const p of placed) {
      if (Math.abs(p.x - x) < 30 && Math.abs(p.y - y) < 22) {
        y = y + 24 > zoneBot ? y - 24 : y + 24;
      }
    }
    placed.push({ x, y });
    it.x = x; it.y = y;
    xs.push(x);
  }

  for (let i = 0; i < entries.length; i++) {
    const { e, x, y } = entries[i];
    const r = 4.5 + (e.exposure || 2) * 0.9;
    const delay = `style="animation-delay:${0.15 * i + 0.3}s"`;

    // stem: lineage made visible — this work became this act
    if (e.originPhaseId && chapterYCache.has(e.originPhaseId)) {
      out.push(`<line x1="${x}" y1="${y + r + 3}" x2="${x}" y2="${chapterYCache.get(e.originPhaseId)}" stroke="rgba(245,234,216,.16)" stroke-width="1" class="stem"/>`);
    }

    if (e.kind === 'turning') {
      out.push(`<g class="sky-glyph" ${delay}>${crescent(x, y, r * 0.95, { fill: 'rgba(245,234,216,.88)' })}</g>`);
    } else if (e.status === 'declared') {
      out.push(`<g class="sky-glyph" ${delay}><path d="${starPath(x, y, r)}" fill="none" stroke="var(--ember-bright)" stroke-width="1.4" stroke-linejoin="round" opacity=".9"/></g>`);
    } else if (e.status === 'lapsed') {
      out.push(`<g class="sky-glyph" ${delay}><path d="${starPath(x, y, r * 0.85)}" fill="none" stroke="rgba(245,234,216,.28)" stroke-width="1.1" stroke-linejoin="round"/></g>`);
    } else {
      out.push(`<g class="sky-glyph" ${delay}>` +
        `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="url(#starGlow)"/>` +
        `<path d="${starPath(x, y, r)}" fill="rgba(247,238,222,.95)"/></g>`);
    }
    // tap target, with a native tooltip and a hover ring
    out.push(`<circle cx="${x}" cy="${y}" r="${Math.max(16, r + 8)}" fill="transparent" class="entry-hit" data-entry="${e.id}" style="cursor:pointer"><title>${esc(e.title)}</title></circle>`);
  }
  return { svg: out.join(''), xs };
}

// ── The quiet caption in long empty sky ──
function drawCaption(W, H, skyTop, skyBot, xs, spanDays) {
  const edges = [0, ...xs.sort((a, b) => a - b), W];
  let gapStart = 0, gapEnd = 0;
  for (let i = 1; i < edges.length; i++) {
    if (edges[i] - edges[i - 1] > gapEnd - gapStart) { gapStart = edges[i - 1]; gapEnd = edges[i]; }
  }
  const gapPx = gapEnd - gapStart;
  if (gapPx < W * 0.5 || W < 420) return '';
  const cx = (gapStart + gapEnd) / 2;
  const cy = skyTop + (skyBot - skyTop) * 0.42;
  const gapYears = (gapPx / W) * spanDays / 365;
  let out = `<text x="${cx}" y="${cy}" text-anchor="middle" class="sky-caption">${S.arc.quietCaption}</text>`;
  if (gapYears > 2) {
    out += `<text x="${cx}" y="${cy + 22}" text-anchor="middle" class="sky-sentence">${SENTENCE}</text>`;
  }
  return out;
}

// ── Interaction: pan, wheel zoom, pinch, tap ────────────────────
function wireInteractions() {
  const pointers = new Map();
  let moved = 0, downAt = 0;

  svgEl.addEventListener('pointerdown', (e) => {
    svgEl.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0; downAt = performance.now();
  });

  svgEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    moved += Math.abs(dx) + Math.abs(e.clientY - prev.y);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1) {
      const W = svgEl.clientWidth;
      const dt = -dx / W * (domain.t1 - domain.t0);
      cancelAnimationFrame(animId);
      domain = { t0: domain.t0 + dt, t1: domain.t1 + dt };
      requestAnimationFrame(drawScene);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.abs(a.x - b.x) || 1;
      if (!svgEl._pinchDist) { svgEl._pinchDist = dist; return; }
      const scale = svgEl._pinchDist / dist;
      svgEl._pinchDist = dist;
      const midX = (a.x + b.x) / 2 - svgEl.getBoundingClientRect().left;
      zoomAt(midX, scale);
    }
  });

  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) svgEl._pinchDist = null;
    if (pointers.size === 0 && moved < 8 && performance.now() - downAt < 600) {
      // Pointer capture retargets e.target to the svg root, so hit-test
      // by position instead.
      const el = document.elementFromPoint(e.clientX, e.clientY) || e.target;
      handleTapTarget(el);
    }
  };
  svgEl.addEventListener('pointerup', up);
  svgEl.addEventListener('pointercancel', (e) => pointers.delete(e.pointerId));

  svgEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svgEl.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, Math.pow(1.0018, e.deltaY));
  }, { passive: false });

  svgEl.addEventListener('dblclick', (e) => {
    const rect = svgEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = domain.t0 + x / svgEl.clientWidth * (domain.t1 - domain.t0);
    const span = (domain.t1 - domain.t0) / 2;
    animateDomainTo(t - span / 2, t + span / 2);
  });

  if (!wireInteractions._resizeWired) {
    wireInteractions._resizeWired = true;
    window.addEventListener('resize', () => requestAnimationFrame(drawScene), { passive: true });
  }
}

function zoomAt(px, scale) {
  const W = svgEl.clientWidth;
  const t = domain.t0 + px / W * (domain.t1 - domain.t0);
  let span = clamp((domain.t1 - domain.t0) * scale, MIN_SPAN, MAX_SPAN);
  const frac = px / W;
  cancelAnimationFrame(animId);
  domain = { t0: t - span * frac, t1: t + span * (1 - frac) };
  requestAnimationFrame(drawScene);
}

// Debug handle for tests and console poking; not used by the app itself.
window.__arc = {
  setSpan(days) { const now = Date.now(); domain = { t0: now - days * DAY * 0.9, t1: now + days * DAY * 0.1 }; drawScene(); },
  fit() { fitDomain(); drawScene(); },
  domain: () => domain,
};

function handleTapTarget(target) {
  const today = target.closest('[data-tg]');
  if (today) {
    clearMaintenance(today.dataset.tg, today.dataset.tgKind);
    drawScene();
    return;
  }
  const entry = target.closest('[data-entry]');
  if (entry) return openStory(entry.dataset.entry, refreshArc);
  const chapter = target.closest('[data-chapter]');
  if (chapter) return openChapterDetail(chapter.dataset.chapter, refreshArc);
  const ground = target.closest('[data-tap="ground"]');
  if (ground) return openSweep(refreshArc);
}
