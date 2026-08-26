// Chapters — life's work. Lines that begin, ship, close, or lie fallow.
import { S } from './strings.js';
import {
  state, addChapter, getChapter, updateChapter, addFallow, save,
  addPhase, updatePhase, removePhase, addStep, toggleStep, removeStep, currentPhase,
} from './state.js';
import { openSheet, toast } from './ui.js';
import { esc, todayStr, fmtShort } from './util.js';

export function openChapters(onChange) {
  openSheet((el, ctx) => renderList(el, ctx), { tall: true, onClose: onChange });
}

function statusLabel(c) {
  if (c.status === 'open' && !c.shippingCondition) return S.chapters.openEnded;
  return S.chapters[c.status] || c.status;
}

function renderList(el, ctx) {
  const chapters = [...state.chapters].sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
  el.innerHTML = `
    <header class="sheet-head">
      <h2>${S.chapters.title}</h2>
      <p class="sheet-sub">${S.chapters.subtitle}</p>
    </header>
    <div class="chapter-list">
      ${chapters.map(c => `
        <button class="chapter-row" data-id="${c.id}">
          <span class="chapter-line-mark st-${c.status}"></span>
          <span class="chapter-name">${esc(c.name)}</span>
          <span class="chapter-status">${statusLabel(c)}</span>
        </button>`).join('')}
      ${!chapters.length ? `<p class="empty-note">${S.chapters.empty}</p>` : ''}
    </div>
    <button class="btn btn-primary" data-new>${S.chapters.newChapter}</button>`;
  el.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => openChapterDetail(b.dataset.id, ctx.rerender)));
  el.querySelector('[data-new]').addEventListener('click', () => openChapterEditor(null, ctx.rerender));
}

export function openChapterDetail(id, onChange) {
  openSheet((el, ctx) => renderDetail(el, ctx, id), { tall: true, onClose: onChange });
}

const expandedPhases = new Set();
let shipPromptChapter = null;

function renderDetail(el, ctx, id) {
  const c = getChapter(id);
  if (!c) { el.innerHTML = ''; return; }
  const fallows = state.fallow.filter(f => f.chapterId === id);
  const acts = state.entries.filter(e => e.originPhaseId === id && e.kind !== 'note');
  const activeFallow = fallows.find(f => !f.endedAt);
  const phases = c.phases || [];
  const steps = c.steps || [];
  const current = currentPhase(c);

  const stepRow = (s) => `
    <div class="step-row ${s.doneAt ? 'is-done' : ''}" data-step="${s.id}" role="button">
      <span class="step-mark"></span>
      <span class="step-text">${esc(s.text)}</span>
      <span class="ground-x" data-step-remove="${s.id}" title="${S.ground.removeItem}">×</span>
    </div>`;

  const addStepForm = (phaseId) => `
    <form class="step-add" data-step-add="${phaseId || ''}">
      <input type="text" placeholder="${S.chapters.stepPlaceholder}" maxlength="120" />
      <button class="btn btn-quiet" type="submit">${S.chapters.addStep}</button>
    </form>`;

  const phaseRow = (p) => {
    const open = expandedPhases.has(p.id);
    const pSteps = steps.filter(s => s.phaseId === p.id);
    const meta = p.doneAt
      ? `${S.chapters.phaseDoneAt} ${fmtShort(p.doneAt, S.months)}`
      : (p.target ? `→ ${fmtShort(p.target, S.months)}` : '');
    return `
      <div class="phase-row ${p.doneAt ? 'is-done' : ''} ${current && current.id === p.id ? 'is-current' : ''}">
        <button class="phase-head" data-phase-toggle="${p.id}">
          <span class="phase-mark"></span>
          <span class="phase-name">${esc(p.name)}</span>
          ${current && current.id === p.id ? `<span class="phase-badge">${S.chapters.phaseCurrent}</span>` : ''}
          <span class="phase-meta">${meta}${pSteps.length ? ` · ${pSteps.filter(s => s.doneAt).length}/${pSteps.length}` : ''}</span>
        </button>
        ${open ? `
          <div class="phase-body">
            <div class="phase-edit">
              <input type="text" data-phase-name-edit="${p.id}" value="${esc(p.name)}" maxlength="60" />
              <input type="date" data-phase-target-edit="${p.id}" value="${p.target || ''}" title="${S.chapters.phaseTarget}" />
            </div>
            ${pSteps.map(stepRow).join('')}
            ${addStepForm(p.id)}
            <div class="phase-actions">
              ${p.doneAt
                ? `<button class="btn btn-quiet" data-phase-undone="${p.id}">${S.chapters.reopen}</button>`
                : `<button class="btn btn-ghost" data-phase-done="${p.id}">${S.chapters.phaseDone}</button>`}
              <button class="btn btn-quiet" data-phase-remove="${p.id}">${S.ground.removeItem}</button>
            </div>
          </div>` : ''}
      </div>`;
  };

  const looseSteps = steps.filter(s => !s.phaseId);

  el.innerHTML = `
    <header class="sheet-head">
      <h2>${esc(c.name)}</h2>
      <p class="sheet-sub">${fmtShort(c.startedAt, S.months)} — ${c.endedAt ? fmtShort(c.endedAt, S.months) : (c.intendedEnd ? '→ ' + fmtShort(c.intendedEnd, S.months) : '…')} · ${statusLabel(c)}</p>
    </header>
    ${c.shippingCondition
      ? `<div class="story-field"><span class="kicker">${S.chapters.shipping}</span><p>${esc(c.shippingCondition)}</p></div>`
      : `<div class="story-field"><span class="kicker">${S.chapters.shipping}</span><p class="soft">${S.chapters.shippingHint}</p></div>`}
    ${c.shippedNote ? `<div class="story-field"><span class="kicker">${S.chapters.shipped}</span><p>${esc(c.shippedNote)}</p></div>` : ''}

    <div class="story-field">
      <span class="kicker">${S.chapters.phasesTitle}</span>
      ${phases.length ? `<div class="phase-list">${phases.map(phaseRow).join('')}</div>` : `<p class="hint">${S.chapters.phasesHint}</p>`}
      <form class="phase-add" data-phase-add>
        <input type="text" data-pname placeholder="${S.chapters.phaseName}" maxlength="60" />
        <input type="date" data-ptarget title="${S.chapters.phaseTarget}" />
        <button class="btn btn-quiet" type="submit">${S.chapters.addPhase}</button>
      </form>
    </div>

    <div class="story-field">
      <span class="kicker">${S.chapters.stepsTitle}</span>
      ${looseSteps.map(stepRow).join('')}
      ${addStepForm(null)}
    </div>

    ${acts.length ? `<div class="story-field"><span class="kicker">${S.story.fromChapter}</span>
      ${acts.map(a => `<p>✦ ${esc(a.title)}</p>`).join('')}</div>` : ''}
    ${fallows.length ? `<div class="story-field"><span class="kicker">${S.chapters.fallow}</span>
      ${fallows.map(f => `<p class="soft">${esc(f.name || S.telling.fallowNamed)} · ${fmtShort(f.startedAt, S.months)}${f.endedAt ? ' — ' + fmtShort(f.endedAt, S.months) : ' —'}</p>`).join('')}</div>` : ''}
    <div class="story-actions">
      ${c.status === 'open' ? `
        <button class="btn btn-primary" data-a="ship">${S.chapters.ship}</button>
        ${activeFallow ? `<button class="btn btn-ghost" data-a="endfallow">${S.chapters.endFallow}</button>`
                       : `<button class="btn btn-ghost" data-a="fallow">${S.chapters.declareFallow}</button>`}
        <button class="btn btn-quiet" data-a="close">${S.chapters.close}</button>` : `
        <button class="btn btn-ghost" data-a="reopen">${S.chapters.reopen}</button>`}
      <button class="btn btn-quiet" data-a="edit">${S.story.edit}</button>
    </div>
    <div class="story-editor" hidden></div>`;

  // ── Phases and steps ──
  el.querySelectorAll('[data-phase-toggle]').forEach(b => b.addEventListener('click', () => {
    const pid = b.dataset.phaseToggle;
    if (expandedPhases.has(pid)) expandedPhases.delete(pid); else expandedPhases.add(pid);
    ctx.rerender();
  }));
  el.querySelector('[data-phase-add]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = el.querySelector('[data-pname]').value.trim();
    if (!name) return;
    const p = addPhase(id, name, el.querySelector('[data-ptarget]').value || null);
    if (p) expandedPhases.add(p.id);
    ctx.rerender();
  });
  el.querySelectorAll('[data-phase-name-edit]').forEach(inp => inp.addEventListener('change', () => {
    const v = inp.value.trim();
    if (v) updatePhase(id, inp.dataset.phaseNameEdit, { name: v });
    ctx.rerender();
  }));
  el.querySelectorAll('[data-phase-target-edit]').forEach(inp => inp.addEventListener('change', () => {
    updatePhase(id, inp.dataset.phaseTargetEdit, { target: inp.value || null });
    ctx.rerender();
  }));
  el.querySelectorAll('[data-phase-done]').forEach(b => b.addEventListener('click', () => {
    updatePhase(id, b.dataset.phaseDone, { doneAt: todayStr() });
    // When the last phase completes, offer shipping — once, gently.
    const ch = getChapter(id);
    if ((ch.phases || []).every(p => p.doneAt) && (ch.status === 'open' || ch.status === 'fallow')) {
      shipPromptChapter = id;
    }
    ctx.rerender();
  }));
  el.querySelectorAll('[data-phase-undone]').forEach(b => b.addEventListener('click', () => {
    updatePhase(id, b.dataset.phaseUndone, { doneAt: null });
    ctx.rerender();
  }));
  el.querySelectorAll('[data-phase-remove]').forEach(b => b.addEventListener('click', () => {
    removePhase(id, b.dataset.phaseRemove);
    ctx.rerender();
  }));
  el.querySelectorAll('[data-step]').forEach(row => row.addEventListener('click', (e) => {
    if (e.target.dataset.stepRemove) return;
    toggleStep(id, row.dataset.step);
    ctx.rerender();
  }));
  el.querySelectorAll('[data-step-remove]').forEach(x => x.addEventListener('click', (e) => {
    e.stopPropagation();
    removeStep(id, x.dataset.stepRemove);
    ctx.rerender();
  }));
  el.querySelectorAll('[data-step-add]').forEach(f => f.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = f.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    addStep(id, text, f.dataset.stepAdd || null);
    input.value = '';
    ctx.rerender();
  }));

  const editor = el.querySelector('.story-editor');

  el.querySelector('[data-a="ship"]')?.addEventListener('click', () => {
    editor.hidden = false;
    editor.innerHTML = `
      <span class="kicker">${S.chapters.shipAsk}</span>
      <textarea rows="2">${esc(c.shippingCondition || '')}</textarea>
      <input type="date" value="${todayStr()}" />
      <button class="btn btn-primary">${S.chapters.ship}</button>`;
    editor.querySelector('button').addEventListener('click', () => {
      updateChapter(id, {
        status: 'shipped',
        shippedNote: editor.querySelector('textarea').value.trim(),
        endedAt: editor.querySelector('input').value || todayStr(),
      });
      ctx.rerender();
    });
  });

  el.querySelector('[data-a="close"]')?.addEventListener('click', () => {
    updateChapter(id, { status: 'closed', endedAt: todayStr() });
    toast(S.chapters.closeHint);
    ctx.rerender();
  });

  el.querySelector('[data-a="reopen"]')?.addEventListener('click', () => {
    updateChapter(id, { status: 'open', endedAt: null });
    ctx.rerender();
  });

  el.querySelector('[data-a="fallow"]')?.addEventListener('click', () => {
    editor.hidden = false;
    editor.innerHTML = `
      <span class="kicker">${S.chapters.fallowName}</span>
      <input type="text" maxlength="60" placeholder="${S.chapters.fallowHint}" />
      <button class="btn btn-primary">${S.chapters.declareFallow}</button>`;
    editor.querySelector('button').addEventListener('click', () => {
      addFallow({ chapterId: id, name: editor.querySelector('input').value.trim() });
      updateChapter(id, { status: 'fallow' });
      ctx.rerender();
    });
  });

  el.querySelector('[data-a="endfallow"]')?.addEventListener('click', () => {
    const f = state.fallow.find(f => f.chapterId === id && !f.endedAt);
    if (f) { f.endedAt = todayStr(); save(); }
    ctx.rerender();
  });

  el.querySelector('[data-a="edit"]')?.addEventListener('click', () => openChapterEditor(id, ctx.rerender));

  // A fallow chapter reads as open for actions.
  if (c.status === 'fallow') {
    const endBtn = el.querySelector('[data-a="reopen"]');
    endBtn?.addEventListener('click', () => {
      const f = state.fallow.find(f => f.chapterId === id && !f.endedAt);
      if (f) { f.endedAt = todayStr(); save(); }
      updateChapter(id, { status: 'open' });
      ctx.rerender();
    });
  }

  // The last phase just completed: open the shipping form, with one
  // quiet line of why. An offer, not a wall — it can be ignored.
  if (shipPromptChapter === id) {
    shipPromptChapter = null;
    const shipBtn = el.querySelector('[data-a="ship"]');
    if (shipBtn) {
      shipBtn.click();
      editor.insertAdjacentHTML('afterbegin', `<p class="ship-prompt">${S.chapters.shipPrompt}</p>`);
      editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

export function openChapterEditor(id, onChange, prefill = {}) {
  openSheet((el, ctx) => {
    const c = id ? getChapter(id) : null;
    el.innerHTML = `
      <header class="sheet-head"><h2>${c ? esc(c.name) : S.chapters.newChapter}</h2></header>
      <div class="form-col">
        <span class="kicker">${S.chapters.name}</span>
        <input type="text" data-k="name" maxlength="80" value="${esc(c ? c.name : prefill.name || '')}" />
        <span class="kicker">${S.chapters.started}</span>
        <input type="date" data-k="startedAt" value="${c ? c.startedAt : prefill.startedAt || todayStr()}" />
        <span class="kicker">${S.chapters.intendedEnd} <em>(${S.common.optional})</em></span>
        <input type="date" data-k="intendedEnd" value="${(c && c.intendedEnd) || prefill.intendedEnd || ''}" />
        <span class="kicker">${S.chapters.shipping}</span>
        <textarea data-k="shippingCondition" rows="2" placeholder="${S.chapters.shippingHint}">${esc(c ? c.shippingCondition : '')}</textarea>
        <button class="btn btn-primary" data-save>${S.common.save}</button>
      </div>`;
    el.querySelector('[data-save]').addEventListener('click', () => {
      const get = k => el.querySelector(`[data-k="${k}"]`).value.trim();
      const patch = {
        name: get('name'), startedAt: get('startedAt') || todayStr(),
        intendedEnd: get('intendedEnd') || null, shippingCondition: get('shippingCondition'),
      };
      if (!patch.name) return;
      if (c) updateChapter(id, patch); else addChapter(patch);
      ctx.close();
    });
  }, { onClose: onChange });
}

// ── Quarterly review: gentle enforcement, not a wall ──
export function quarterlyDue() {
  const last = state.settings.lastQuarterly;
  if (!state.settings.onboarded) return false;
  if (!last) {
    // First quarter starts counting from onboarding; seed it silently.
    state.settings.lastQuarterly = todayStr();
    save();
    return false;
  }
  return (Date.now() - new Date(last).getTime()) > 90 * 86400000;
}

export function openQuarterly(onChange) {
  openSheet((el, ctx) => {
    const open = state.chapters.filter(c => c.status === 'open' || c.status === 'fallow');
    const openEnded = open.filter(c => !c.shippingCondition);
    el.innerHTML = `
      <header class="sheet-head">
        <h2>${S.chapters.quarterlyTitle}</h2>
        <p class="sheet-sub">${S.chapters.quarterlyBody}</p>
      </header>
      <div class="chapter-list">
        ${open.map(c => `
          <button class="chapter-row" data-id="${c.id}">
            <span class="chapter-line-mark st-${c.status}"></span>
            <span class="chapter-name">${esc(c.name)}</span>
            <span class="chapter-status">${openEnded.includes(c) ? S.chapters.quarterlyShipping : statusLabel(c)}</span>
          </button>`).join('')}
        ${!open.length ? `<p class="empty-note">${S.chapters.empty}</p>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" data-later>${S.chapters.quarterlyLater}</button>
        <button class="btn btn-primary" data-done>${S.chapters.quarterlyDone}</button>
      </div>`;
    el.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => openChapterDetail(b.dataset.id, ctx.rerender)));
    el.querySelector('[data-later]').addEventListener('click', ctx.close);
    el.querySelector('[data-done]').addEventListener('click', () => {
      state.settings.lastQuarterly = todayStr();
      save();
      ctx.close();
    });
  }, { tall: true, onClose: onChange });
}
