// The guide — five quiet cards over the arc, shown once after the
// reveal, and again on request from Settings. This app is not a
// conventional app; nobody should have to guess how to use it.
import { S } from './strings.js';
import { state, save } from './state.js';

const STEPS = [
  { key: 'sky', text: () => S.tour.sky, focus: { top: '6%', left: '3%', right: '3%', height: '48%' }, card: { top: '58%', left: '50%', transform: 'translateX(-50%)' } },
  { key: 'lines', text: () => S.tour.lines, focus: { top: '58%', left: '3%', right: '3%', height: '23%' }, card: { top: '12%', left: '50%', transform: 'translateX(-50%)' } },
  { key: 'ground', text: () => S.tour.ground, focus: { top: '84%', left: '3%', right: '3%', height: '12%' }, card: { top: '34%', left: '50%', transform: 'translateX(-50%)' } },
  { key: 'begin', text: () => S.tour.begin, focus: null, card: { bottom: '110px', left: '50%', transform: 'translateX(-50%)' } },
  { key: 'menu', text: () => S.tour.menu, focus: { top: '8px', right: '8px', width: '48px', height: '48px' }, card: { top: '64px', right: '12px' } },
];

export function startTour(force = false) {
  if (!force && state.settings.tourDone) return;
  if (!document.getElementById('arc')) return;
  if (document.querySelector('.tour-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  document.body.appendChild(overlay);
  let i = 0;

  const beginBtn = () => document.querySelector('.begin-btn');

  function finish() {
    state.settings.tourDone = true;
    save();
    // The pulse stays until Begin has been pressed once.
    beginBtn()?.classList.toggle('pulse', !state.settings.begunOnce);
    overlay.remove();
  }

  function show() {
    const step = STEPS[i];
    beginBtn()?.classList.toggle('pulse', step.key === 'begin');
    const styleOf = (o) => o ? Object.entries(o).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}:${v}`).join(';') : '';
    overlay.innerHTML = `
      ${step.focus ? `<div class="tour-focus" style="${styleOf(step.focus)}"></div>` : ''}
      <div class="tour-card" style="${styleOf(step.card)}">
        <p>${step.text()}</p>
        <div class="tour-btns">
          <span class="tour-count">${i + 1} / ${STEPS.length}</span>
          <button class="btn btn-primary" data-next>${i === STEPS.length - 1 ? S.tour.done : S.tour.next}</button>
        </div>
      </div>`;
    overlay.querySelector('[data-next]').addEventListener('click', () => {
      i += 1;
      if (i >= STEPS.length) finish();
      else show();
    });
  }

  show();
}
