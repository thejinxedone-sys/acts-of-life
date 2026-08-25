// ═══════════════════════════════════════════════════════════════
// State: the record. Local-first — everything lives in this browser.
// The previous app's data ('acts_of_life_data_v2') is left untouched
// and exportable from Settings.
// ═══════════════════════════════════════════════════════════════
import { uid, todayStr, dateMs, DAY } from './util.js';

export const STORAGE_KEY = 'acts_of_life_v3';
export const OLD_KEY = 'acts_of_life_data_v2';
const SNAP_PREFIX = 'acts_of_life_v3_snap_';

const blank = () => ({
  version: 3,
  persons: [],        // { id, name, relationship?, isRememberer }
  entries: [],        // acts, turnings, and kind:'note' (kept as yours)
  chapters: [],       // { id, name, startedAt, intendedEnd?, shippingCondition, status }
  fallow: [],         // { id, chapterId?, name?, startedAt, endedAt? }
  maintenance: [],    // { id, title, lastCleared? }
  rituals: [],        // { id, title, cadence: daily|weekly|monthly }
  maintLog: [],       // { itemId, kind: 'item'|'ritual', date }
  mirrors: [],        // { weekOf, attention, openLoops, arcAdditions, flatStatement }
  settings: {
    onboarded: false,
    tourDone: false,
    begunOnce: false,
    mirrorDay: 6,     // 0=Sunday … 6=Saturday
    aiKey: '',
    aiOn: false,
    lastQuarterly: null,
  },
});

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blank();
    const data = JSON.parse(raw);
    const merged = Object.assign(blank(), data, {
      settings: Object.assign(blank().settings, data.settings || {}),
    });
    // Normalize older chapter steps ({text, date}) to the current shape.
    for (const c of merged.chapters) {
      c.phases = c.phases || [];
      c.steps = (c.steps || []).map(s => s.id ? s : {
        id: uid(), text: s.text, phaseId: null, doneAt: null, addedAt: s.date || todayStr(),
      });
    }
    return merged;
  } catch {
    return blank();
  }
}

export function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Seven silent daily on-device safety copies.
export function takeDailySnapshot() {
  const key = SNAP_PREFIX + todayStr();
  if (!localStorage.getItem(key)) {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { return; }
    const keys = Object.keys(localStorage).filter(k => k.startsWith(SNAP_PREFIX)).sort();
    while (keys.length > 7) localStorage.removeItem(keys.shift());
  }
}

export function replaceState(data) {
  state = Object.assign(blank(), data, {
    settings: Object.assign(blank().settings, data.settings || {}),
  });
  save();
}

// ── Entries ─────────────────────────────────────────────────────
export const DECLARED_CAP = 5;

export function declaredEntries() {
  return state.entries.filter(e => e.status === 'declared');
}

export function addEntry(partial) {
  const e = Object.assign({
    id: uid(),
    kind: 'act',            // act | turning | note
    title: '',
    beginning: '',
    stake: '',
    reach: '',
    irreversibleNote: '',
    witnessIds: [],
    anonymous: false,
    status: 'logged',       // declared | done | lapsed | logged
    declaredAt: null,
    dueBy: null,
    occurredAt: null,       // ISO date
    precision: 'day',       // day | month | year
    chapterId: null,
    originPhaseId: null,
    reflection: '',
    exposure: null,         // 1–5, self-assessed size of stake
    createdAt: todayStr(),
  }, partial);
  state.entries.push(e);
  save();
  return e;
}

export function getEntry(id) { return state.entries.find(e => e.id === id); }

export function updateEntry(id, patch) {
  const e = getEntry(id);
  if (e) { Object.assign(e, patch); save(); }
  return e;
}

export function removeEntry(id) {
  state.entries = state.entries.filter(e => e.id !== id);
  save();
}

// ── Persons ─────────────────────────────────────────────────────
export function addPerson(name, opts = {}) {
  const existing = state.persons.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    if (opts.isRememberer) existing.isRememberer = true;
    save();
    return existing;
  }
  const p = { id: uid(), name: name.trim(), relationship: opts.relationship || '', isRememberer: !!opts.isRememberer };
  state.persons.push(p);
  save();
  return p;
}

export function personName(id) {
  const p = state.persons.find(p => p.id === id);
  return p ? p.name : '';
}

// ── Chapters & fallow ───────────────────────────────────────────
export function addChapter(partial) {
  const c = Object.assign({
    id: uid(), name: '', startedAt: todayStr(), intendedEnd: null,
    shippingCondition: '', shippedNote: '', status: 'open', endedAt: null,
  }, partial);
  state.chapters.push(c);
  save();
  return c;
}

export function getChapter(id) { return state.chapters.find(c => c.id === id); }

export function updateChapter(id, patch) {
  const c = getChapter(id);
  if (c) { Object.assign(c, patch); save(); }
  return c;
}

// ── Phases and steps: chapter → phases → steps ─────────────────
export function addPhase(chapterId, name, target) {
  const c = getChapter(chapterId);
  if (!c) return null;
  c.phases = c.phases || [];
  const p = { id: uid(), name: name.trim(), target: target || null, doneAt: null };
  c.phases.push(p);
  save();
  return p;
}

export function updatePhase(chapterId, phaseId, patch) {
  const c = getChapter(chapterId);
  const p = c && (c.phases || []).find(p => p.id === phaseId);
  if (p) { Object.assign(p, patch); save(); }
  return p;
}

export function removePhase(chapterId, phaseId) {
  const c = getChapter(chapterId);
  if (!c) return;
  c.phases = (c.phases || []).filter(p => p.id !== phaseId);
  (c.steps || []).forEach(s => { if (s.phaseId === phaseId) s.phaseId = null; });
  save();
}

export function addStep(chapterId, text, phaseId) {
  const c = getChapter(chapterId);
  if (!c) return null;
  c.steps = c.steps || [];
  const s = { id: uid(), text: text.trim(), phaseId: phaseId || null, doneAt: null, addedAt: todayStr() };
  c.steps.push(s);
  save();
  return s;
}

export function toggleStep(chapterId, stepId) {
  const c = getChapter(chapterId);
  const s = c && (c.steps || []).find(s => s.id === stepId);
  if (s) { s.doneAt = s.doneAt ? null : todayStr(); save(); }
  return s;
}

export function removeStep(chapterId, stepId) {
  const c = getChapter(chapterId);
  if (!c) return;
  c.steps = (c.steps || []).filter(s => s.id !== stepId);
  save();
}

// The first phase not yet done is the current one.
export function currentPhase(c) {
  return (c.phases || []).find(p => !p.doneAt) || null;
}

export function addFallow(partial) {
  const f = Object.assign({ id: uid(), chapterId: null, name: '', startedAt: todayStr(), endedAt: null }, partial);
  state.fallow.push(f);
  save();
  return f;
}

// ── Maintenance & rituals ───────────────────────────────────────
export function addMaintenance(title) {
  const m = { id: uid(), title: title.trim(), lastCleared: null };
  state.maintenance.push(m);
  save();
  return m;
}

export function addRitual(title, cadence) {
  const r = { id: uid(), title: title.trim(), cadence };
  state.rituals.push(r);
  save();
  return r;
}

export function removeRitual(id) {
  state.rituals = state.rituals.filter(r => r.id !== id);
  save();
}

export function clearMaintenance(itemId, kind) {
  const date = todayStr();
  const already = state.maintLog.find(l => l.itemId === itemId && l.date === date);
  if (already) {
    state.maintLog = state.maintLog.filter(l => l !== already);
  } else {
    state.maintLog.push({ itemId, kind, date });
    if (kind === 'item') {
      const m = state.maintenance.find(m => m.id === itemId);
      if (m) m.lastCleared = date;
    }
  }
  save();
}

export function clearedToday(itemId) {
  const date = todayStr();
  return state.maintLog.some(l => l.itemId === itemId && l.date === date);
}

export function ritualDueToday(r) {
  const today = new Date();
  const logs = state.maintLog.filter(l => l.itemId === r.id).map(l => l.date).sort();
  const last = logs[logs.length - 1];
  if (!last) return true;
  const gap = (today.setHours(0, 0, 0, 0) - dateMs(last)) / DAY;
  if (r.cadence === 'daily') return gap >= 1;
  if (r.cadence === 'weekly') return gap >= 7;
  return gap >= 28;
}

// ── Export ──────────────────────────────────────────────────────
export function exportJson() {
  return JSON.stringify(state, null, 2);
}

export function oldData() {
  const raw = localStorage.getItem(OLD_KEY);
  return raw || null;
}
