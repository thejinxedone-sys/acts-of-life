// The ground: fast batch-clearing. Feels like clearing, not achieving.
// One-offs are done once, then gone (their trace stays as ground
// texture). Rituals repeat on a rhythm. Completing everything produces
// silence — by design there is no all-clear message, ever.
import { S } from './strings.js';
import { state, addMaintenance, addRitual, removeRitual, clearMaintenance, clearedToday, ritualDueToday, save } from './state.js';
import { glyphHtml } from './glyphs.js';
import { openSheet, confirmSheet } from './ui.js';
import { esc, fill } from './util.js';

export function openSweep(onChange) {
  openSheet((el, ctx) => renderSweep(el, ctx), { tall: true, onClose: onChange });
}

function renderSweep(el, ctx) {
  const rituals = state.rituals;
  // One-offs: visible until cleared; a one-off cleared today lingers,
  // struck through, so the tap can be undone. Tomorrow it is gone.
  const items = state.maintenance.filter(m => !m.lastCleared || clearedToday(m.id));

  const ritualRow = (r) => {
    const done = clearedToday(r.id);
    const due = ritualDueToday(r);
    return `<div class="ground-row ${done ? 'is-cleared' : ''} ${!due && !done ? 'is-resting' : ''}" data-ritual="${r.id}" role="button">
      <span class="ground-glyph">${glyphHtml('ritual', 18)}</span>
      <span class="ground-title">${esc(r.title)}</span>
      <span class="ground-meta">${S.ground['cadence' + r.cadence[0].toUpperCase() + r.cadence.slice(1)] || r.cadence}</span>
      <span class="ground-x" data-remove-ritual="${r.id}" title="${S.ground.removeItem}">×</span>
    </div>`;
  };

  const itemRow = (m) => {
    const done = clearedToday(m.id);
    return `<div class="ground-row ${done ? 'is-cleared' : ''}" data-item="${m.id}" role="button">
      <span class="ground-glyph">${glyphHtml('maintenance', 18)}</span>
      <span class="ground-title">${esc(m.title)}</span>
      <span class="ground-x" data-remove="${m.id}" title="${S.ground.removeItem}">×</span>
    </div>`;
  };

  el.innerHTML = `
    <header class="sheet-head">
      <h2>${S.ground.title}</h2>
      <p class="sheet-sub">${S.ground.subtitle}</p>
    </header>
    ${rituals.length ? `
      <p class="ground-section">${S.ground.ritualTitle}</p>
      <div class="ground-list">${rituals.map(ritualRow).join('')}</div>` : ''}
    ${items.length ? `
      <p class="ground-section">${S.ground.oneOffTitle}</p>
      <div class="ground-list">${items.map(itemRow).join('')}</div>` : ''}
    ${!rituals.length && !items.length ? `<p class="empty-note">${S.ground.emptyGround}</p>` : ''}
    <form class="ground-add" data-add="item">
      <input type="text" placeholder="${S.ground.itemName}" maxlength="80" />
      <button class="btn btn-ghost" type="submit">${S.ground.addItem}</button>
    </form>
    <p class="hint">${S.ground.oneOffHint}</p>
    <form class="ground-add" data-add="ritual">
      <input type="text" placeholder="${S.ground.ritualHint}" maxlength="80" />
      <select>
        <option value="daily">${S.ground.cadenceDaily}</option>
        <option value="weekly">${S.ground.cadenceWeekly}</option>
        <option value="monthly">${S.ground.cadenceMonthly}</option>
      </select>
      <button class="btn btn-ghost" type="submit">${S.ground.addRitual}</button>
    </form>`;

  el.querySelectorAll('[data-ritual]').forEach(b => b.addEventListener('click', (e) => {
    if (e.target.dataset.removeRitual) return;
    clearMaintenance(b.dataset.ritual, 'ritual');
    ctx.rerender();
  }));
  el.querySelectorAll('[data-item]').forEach(b => b.addEventListener('click', (e) => {
    if (e.target.dataset.remove) return;
    clearMaintenance(b.dataset.item, 'item');
    ctx.rerender();
  }));
  el.querySelectorAll('[data-remove]').forEach(x => x.addEventListener('click', async (e) => {
    e.stopPropagation();
    const id = x.dataset.remove;
    const m = state.maintenance.find(m => m.id === id);
    if (!m) return;
    if (await confirmSheet(`${S.ground.removeItem} “${esc(m.title)}”?`, S.ground.removeItem, S.common.cancel)) {
      state.maintenance = state.maintenance.filter(i => i.id !== id);
      save();
    }
    ctx.rerender();
  }));
  el.querySelectorAll('[data-remove-ritual]').forEach(x => x.addEventListener('click', async (e) => {
    e.stopPropagation();
    const id = x.dataset.removeRitual;
    const r = state.rituals.find(r => r.id === id);
    if (!r) return;
    if (await confirmSheet(fill(S.ground.removeRitualConfirm, { name: esc(r.title) }), S.ground.removeItem, S.common.cancel)) {
      removeRitual(id);
    }
    ctx.rerender();
  }));
  el.querySelectorAll('form[data-add]').forEach(f => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = f.querySelector('input');
    const val = input.value.trim();
    if (!val) return;
    if (f.dataset.add === 'ritual') addRitual(val, f.querySelector('select').value);
    else addMaintenance(val);
    input.value = '';
    ctx.rerender();
  }));
}
