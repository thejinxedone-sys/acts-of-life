// The four glyphs: circle (maintenance), line (chapters — drawn in arc.js),
// star (acts), crescent (turnings). Returned as SVG fragments.

// Four-point star with concave sides — a sparkle, not a badge.
export function starPath(cx, cy, r) {
  const s = r * 0.22;
  return `M ${cx},${cy - r} Q ${cx + s},${cy - s} ${cx + r},${cy}` +
    ` Q ${cx + s},${cy + s} ${cx},${cy + r}` +
    ` Q ${cx - s},${cy + s} ${cx - r},${cy}` +
    ` Q ${cx - s},${cy - s} ${cx},${cy - r} Z`;
}

export function star(cx, cy, r, { fill = 'currentColor', hollow = false, stroke = 'currentColor', opacity = 1, cls = '', attrs = '' } = {}) {
  const d = starPath(cx, cy, r);
  if (hollow) {
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round" opacity="${opacity}" class="${cls}" ${attrs}/>`;
  }
  return `<path d="${d}" fill="${fill}" opacity="${opacity}" class="${cls}" ${attrs}/>`;
}

// Crescent moon (proven path, 24×24 box, centered on 12,12).
const MOON_D = 'M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z';

export function crescent(cx, cy, r, { fill = 'currentColor', opacity = 1, cls = '', attrs = '' } = {}) {
  const s = r / 9.5;
  return `<g transform="translate(${cx},${cy}) scale(${s}) rotate(-18) translate(-12,-12)" class="${cls}" ${attrs}>` +
    `<path d="${MOON_D}" fill="${fill}" opacity="${opacity}"/></g>`;
}

export function circleDot(cx, cy, r, { fill = 'currentColor', opacity = 1, attrs = '' } = {}) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}" ${attrs}/>`;
}

export function ritualRing(cx, cy, r, { stroke = 'currentColor', opacity = 1, attrs = '' } = {}) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${stroke}" stroke-width="1" opacity="${opacity}" ${attrs}/>`;
}

// Inline glyph for HTML contexts (story cards, lists).
export function glyphHtml(kind, size = 16, color = 'currentColor', hollow = false) {
  const half = size / 2;
  let inner = '';
  if (kind === 'act') inner = star(half, half, half * 0.92, { fill: color, hollow, stroke: color });
  else if (kind === 'turning') inner = crescent(half, half, half * 0.9, { fill: color });
  else if (kind === 'ritual') inner = ritualRing(half, half, half * 0.7, { stroke: color });
  else inner = circleDot(half, half, half * 0.55, { fill: color });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${inner}</svg>`;
}
