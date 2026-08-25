// Small shared helpers.

export const DAY = 86400000;

export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function todayStr() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local
}

export function dateMs(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1).getTime();
}

export function msToIso(ms) {
  return new Date(ms).toLocaleDateString('en-CA');
}

// Format an entry date respecting its precision ('day' | 'month' | 'year').
export function fmtWhen(isoDate, precision, months) {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (precision === 'year') return String(y);
  if (precision === 'month') return `${months[m - 1]} ${y}`;
  return `${d} ${months[m - 1]} ${y}`;
}

export function fmtShort(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${months[m - 1].slice(0, 3)} ${y}`;
}

// Deterministic small hash → [0,1), for organic-but-stable scatter.
export function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

export function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

// Monday-based start of the week containing ms.
export function weekStart(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const shift = (d.getDay() + 6) % 7;
  return d.getTime() - shift * DAY;
}

export function fill(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
