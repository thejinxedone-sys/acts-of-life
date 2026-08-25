// The story card: one act or turning, told back plainly.
import { S } from './strings.js';
import { getEntry, updateEntry, removeEntry, getChapter, personName } from './state.js';
import { glyphHtml } from './glyphs.js';
import { openSheet, confirmSheet, toast } from './ui.js';
import { esc, fmtWhen, fmtShort, todayStr } from './util.js';

export function openStory(entryId, onChange) {
  openSheet((el, ctx) => renderStory(el, ctx, entryId), { tall: true, onClose: onChange });
}

function field(label, value, cls = '') {
  if (!value) return '';
  return `<div class="story-field ${cls}"><span class="kicker">${label}</span><p>${esc(value)}</p></div>`;
}

function renderStory(el, ctx, entryId) {
  const e = getEntry(entryId);
  if (!e) { el.innerHTML = ''; return; }
  const isDeclared = e.status === 'declared';
  const isLapsed = e.status === 'lapsed';
  const glyph = glyphHtml(e.kind, 28, 'var(--ember)', isDeclared);
  const when = e.occurredAt ? fmtWhen(e.occurredAt, e.precision || 'day', S.months) : '';
  const origin = e.originPhaseId ? getChapter(e.originPhaseId) : null;
  const witnesses = (e.witnessIds || []).map(personName).filter(Boolean);

  el.innerHTML = `
    <header class="sheet-head story-head">
      <span class="story-glyph">${glyph}</span>
      <div>
        <h2>${esc(e.title)}</h2>
        <p class="sheet-sub">
          ${isDeclared ? `${S.story.due} ${e.dueBy ? fmtShort(e.dueBy, S.months) : '—'}` : when}
          ${isLapsed ? ` · ${S.story.lapsed}` : ''}
          ${e.exposure ? ` · ${S.library.exposure} ${e.exposure}` : ''}
        </p>
      </div>
    </header>
    ${e.anonymous ? `<p class="story-anon">${S.story.anonymous}</p>` : ''}
    ${field(isDeclared ? S.story.beginningFuture : S.story.beginning, e.beginning)}
    ${field(isDeclared ? S.story.stakeFuture : S.story.stake, e.stake)}
    ${e.kind === 'act' ? field(isDeclared ? S.story.reachFuture : S.story.reach, e.reach) : ''}
    ${field(isDeclared ? S.story.irreversibleFuture : S.story.irreversible, e.irreversibleNote)}
    ${witnesses.length ? `<div class="story-field"><span class="kicker">${witnesses.length > 1 ? S.story.witnesses : S.story.witness}</span><p>${witnesses.map(esc).join(', ')}</p></div>` : ''}
    ${origin ? `<div class="story-field"><span class="kicker">${S.story.fromChapter}</span><p>${esc(origin.name)}</p></div>` : ''}
    ${field(S.story.reflection, e.reflection, 'story-reflection')}
    <div class="story-actions">
      ${isDeclared ? `<button class="btn btn-primary" data-a="done">${S.story.done}</button>
                      <button class="btn btn-ghost" data-a="lapse">${S.story.lapse}</button>` : ''}
      ${!isDeclared && !e.reflection ? `<button class="btn btn-ghost" data-a="reflect">${S.story.addReflection}</button>` : ''}
      <button class="btn btn-quiet" data-a="edit">${S.story.edit}</button>
      <button class="btn btn-quiet" data-a="remove">${S.story.remove}</button>
    </div>
    <div class="story-editor" hidden></div>`;

  const editor = el.querySelector('.story-editor');

  el.querySelector('[data-a="done"]')?.addEventListener('click', () => {
    editor.hidden = false;
    editor.innerHTML = `
      <span class="kicker">${S.story.doneAsk}</span>
      <input type="date" value="${todayStr()}" max="${todayStr()}" />
      <span class="kicker">${S.story.reflectionAsk}</span>
      <textarea rows="3"></textarea>
      <button class="btn btn-primary">${S.common.save}</button>`;
    editor.querySelector('button').addEventListener('click', () => {
      const date = editor.querySelector('input').value || todayStr();
      updateEntry(e.id, {
        status: 'done', occurredAt: date, precision: 'day',
        reflection: editor.querySelector('textarea').value.trim() || e.reflection,
      });
      toast(S.story.filled);
      ctx.rerender();
    });
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  el.querySelector('[data-a="lapse"]')?.addEventListener('click', async () => {
    if (await confirmSheet(S.story.lapseConfirm, S.story.lapse, S.common.cancel)) {
      updateEntry(e.id, { status: 'lapsed', occurredAt: e.dueBy || todayStr(), precision: 'day' });
    }
    ctx.rerender();
  });

  el.querySelector('[data-a="reflect"]')?.addEventListener('click', () => {
    editor.hidden = false;
    editor.innerHTML = `
      <span class="kicker">${S.story.reflectionAsk}</span>
      <textarea rows="4"></textarea>
      <button class="btn btn-primary">${S.common.save}</button>`;
    editor.querySelector('button').addEventListener('click', () => {
      updateEntry(e.id, { reflection: editor.querySelector('textarea').value.trim() });
      ctx.rerender();
    });
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  el.querySelector('[data-a="edit"]')?.addEventListener('click', () => {
    editor.hidden = false;
    const ta = (label, key, rows = 2) => `
      <span class="kicker">${label}</span>
      <textarea rows="${rows}" data-k="${key}">${esc(e[key] || '')}</textarea>`;
    editor.innerHTML = `
      <span class="kicker">${S.excavate.titleAsk}</span>
      <input type="text" data-k="title" value="${esc(e.title)}" maxlength="90" />
      ${ta(S.story.beginning, 'beginning')}
      ${ta(S.story.stake, 'stake')}
      ${e.kind === 'act' ? ta(S.story.reach, 'reach') : ''}
      ${ta(S.story.reflection, 'reflection', 3)}
      <button class="btn btn-primary">${S.common.save}</button>`;
    editor.querySelector('button').addEventListener('click', () => {
      const patch = {};
      editor.querySelectorAll('[data-k]').forEach(f => { patch[f.dataset.k] = f.value.trim(); });
      if (!patch.title) delete patch.title;
      updateEntry(e.id, patch);
      ctx.rerender();
    });
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  el.querySelector('[data-a="remove"]')?.addEventListener('click', async () => {
    if (await confirmSheet(S.story.removeConfirm, S.story.remove, S.common.cancel)) {
      removeEntry(e.id);
      ctx.close();
    }
  });
}
