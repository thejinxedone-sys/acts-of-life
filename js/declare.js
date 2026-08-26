// ═══════════════════════════════════════════════════════════════
// Declaration — the demanding coach. Four tests asked directly,
// a date, exposure, and a witness as strong default with a visible
// skip. Redirections are flat and kind; never verdicts on the person.
// ═══════════════════════════════════════════════════════════════
import { S } from './strings.js';
import { state, addEntry, addPerson, declaredEntries, DECLARED_CAP, getChapter, save } from './state.js';
import { glyphHtml } from './glyphs.js';
import { openSheet, toast, principleHtml, whyHtml, wireWhy } from './ui.js';
import { esc, fill, todayStr, msToIso, fmtShort, DAY } from './util.js';
import { aiAvailable, declarationCheck } from './ai.js';
import { openStory } from './story.js';
import { openSweep } from './sweep.js';

export function openDeclaration(opts = {}) {
  openSheet((el, ctx) => {
    if (declaredEntries().length >= DECLARED_CAP) return renderCap(el, ctx);
    declarationEngine(el, Object.assign({}, opts, {
      onDone: (entry) => { ctx.close(); toast(S.declare.declared); if (opts.onDone) opts.onDone(entry); },
      onDivert: () => { ctx.close(); if (opts.onDone) opts.onDone(null); },
    }));
  }, { tall: true, onClose: opts.onClose });
}

function renderCap(el, ctx) {
  const open = declaredEntries();
  el.innerHTML = `
    <header class="sheet-head">
      <h2>${S.declare.title}</h2>
      <p class="sheet-sub">${S.declare.capReached}</p>
    </header>
    <div class="chapter-list">
      ${open.map(e => `
        <button class="chapter-row" data-id="${e.id}">
          <span class="cap-glyph">${glyphHtml('act', 16, 'var(--ember)', true)}</span>
          <span class="chapter-name">${esc(e.title)}</span>
          <span class="chapter-status">${e.dueBy ? fmtShort(e.dueBy, S.months) : ''}</span>
        </button>`).join('')}
    </div>`;
  el.querySelectorAll('[data-id]').forEach(b => b.addEventListener('click', () => openStory(b.dataset.id, ctx.rerender)));
}

export function declarationEngine(container, opts = {}) {
  const st = {
    beginning: opts.prefillBeginning || '',
    stake: '', reach: '', irreversibleNote: '',
    dueBy: msToIso(Date.now() + 14 * DAY),
    exposure: opts.exposure || null,
    witnessName: '', witnessSkipped: false,
    title: opts.prefillTitle || '',
  };

  const askText = (key, title, hint, next, prev) => () => {
    container.innerHTML = `
      <header class="sheet-head">
        ${principleHtml(key)}
        <h2 class="question under-principle">${title}</h2>
        ${hint ? `<p class="sheet-sub">${hint}</p>` : ''}
        ${whyHtml(key)}
      </header>
      <textarea class="big-input" rows="3">${esc(st[key])}</textarea>
      <div class="btn-row">
        ${prev ? `<button class="btn btn-quiet" data-back>${S.common.back}</button>` : ''}
        <button class="btn btn-primary" data-next>${S.common.next}</button>
      </div>`;
    wireWhy(container);
    const ta = container.querySelector('textarea');
    ta.focus();
    container.querySelector('[data-next]').addEventListener('click', () => {
      st[key] = ta.value.trim();
      next();
    });
    if (prev) container.querySelector('[data-back]').addEventListener('click', prev);
  };

  // The four tests, in order.
  const stepBeginning = askText('beginning', S.declare.qBeginning, S.declare.qBeginningHint, () => stepStake());
  const stepStake = () => askText('stake', S.declare.qStake, S.declare.qStakeHint, () => {
    if (!st.stake) return redirect('no_stake');
    stepReach();
  }, stepBeginning)();
  const stepReach = () => askText('reach', S.declare.qReach, S.declare.qReachHint, () => stepIrreversible(), stepStake)();
  const stepIrreversible = () => askText('irreversibleNote', S.declare.qIrreversible, S.declare.qIrreversibleHint, () => stepDate(), stepReach)();

  function stepDate() {
    container.innerHTML = `
      <header class="sheet-head">
        <h2 class="question">${S.declare.dateTitle}</h2>
        <p class="sheet-sub">${S.declare.dateHint}</p>
      </header>
      <input type="date" class="big-date" value="${st.dueBy}" min="${todayStr()}" />
      <div class="btn-row">
        <button class="btn btn-quiet" data-back>${S.common.back}</button>
        <button class="btn btn-primary" data-next>${S.common.next}</button>
      </div>`;
    container.querySelector('[data-next]').addEventListener('click', () => {
      const v = container.querySelector('input').value;
      if (!v) return;
      st.dueBy = v;
      stepExposure();
    });
    container.querySelector('[data-back]').addEventListener('click', stepIrreversible);
  }

  function stepExposure() {
    container.innerHTML = `
      <header class="sheet-head">
        <h2 class="question">${S.declare.exposureTitle}</h2>
        <p class="sheet-sub">${S.declare.exposureHint}</p>
      </header>
      <div class="exposure-row">
        ${[1, 2, 3, 4, 5].map(n => `<button class="exposure-dot ${st.exposure === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-quiet" data-back>${S.common.back}</button>
        <button class="btn btn-primary" data-next ${st.exposure ? '' : 'disabled'}>${S.common.next}</button>
      </div>`;
    container.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => {
      st.exposure = parseInt(b.dataset.n, 10);
      stepExposure();
    }));
    container.querySelector('[data-next]').addEventListener('click', () => { if (st.exposure) stepWitness(); });
    container.querySelector('[data-back]').addEventListener('click', stepDate);
  }

  function stepWitness() {
    container.innerHTML = `
      <header class="sheet-head">
        <h2 class="question">${S.declare.witnessTitle}</h2>
        <p class="sheet-sub">${S.declare.witnessHint}</p>
      </header>
      <input type="text" class="big-input" maxlength="60" value="${esc(st.witnessName)}" list="persons-list" />
      <datalist id="persons-list">${state.persons.map(p => `<option value="${esc(p.name)}">`).join('')}</datalist>
      <div class="btn-row">
        <button class="btn btn-quiet" data-back>${S.common.back}</button>
        <button class="btn btn-primary" data-next>${S.common.next}</button>
      </div>
      <div class="keep-bar">
        <button class="btn btn-quiet" data-skip>${S.declare.witnessSkip}</button>
        <p class="hint">${S.declare.witnessSkipHint}</p>
      </div>`;
    const input = container.querySelector('input[type="text"]');
    input.focus();
    container.querySelector('[data-next]').addEventListener('click', () => {
      st.witnessName = input.value.trim();
      if (!st.witnessName) return;
      st.witnessSkipped = false;
      stepReview();
    });
    container.querySelector('[data-skip]').addEventListener('click', () => {
      st.witnessName = '';
      st.witnessSkipped = true;
      stepReview();
    });
    container.querySelector('[data-back]').addEventListener('click', stepExposure);
  }

  async function stepReview() {
    // Scripted checks first; the second reader, if on, checks after.
    if (!st.beginning && !st.stake) return redirect('no_stake');
    const openChapters = state.chapters.filter(c => c.status === 'open' || c.status === 'fallow');
    container.innerHTML = `
      <header class="sheet-head">
        <h2>${S.declare.title}</h2>
      </header>
      <div class="form-col">
        <span class="kicker">${S.excavate.titleAsk}</span>
        <input type="text" data-title maxlength="90" value="${esc(st.title || st.beginning.split(/\s+/).slice(0, 7).join(' '))}" />
      </div>
      <div class="review-fields">
        <div class="story-field"><span class="kicker">${S.story.beginningFuture}</span><p>${esc(st.beginning)}</p></div>
        <div class="story-field"><span class="kicker">${S.story.stakeFuture}</span><p>${esc(st.stake)}</p></div>
        <div class="story-field"><span class="kicker">${S.story.reachFuture}</span><p>${esc(st.reach)}</p></div>
        <div class="story-field"><span class="kicker">${S.story.irreversibleFuture}</span><p>${esc(st.irreversibleNote)}</p></div>
        <div class="story-field"><span class="kicker">${S.declare.dateTitle}</span><p>${fmtShort(st.dueBy, S.months)} · ${S.library.exposure} ${st.exposure}</p></div>
        ${st.witnessName ? `<div class="story-field"><span class="kicker">${S.story.witness}</span><p>${esc(st.witnessName)}</p></div>` : ''}
        ${openChapters.length ? `
          <span class="kicker">${S.story.fromChapter} <em>(${S.common.optional})</em></span>
          <select data-origin><option value=""></option>
            ${openChapters.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>` : ''}
      </div>
      <p class="self-check">${S.excavate.selfCheck}</p>
      <div class="btn-row">
        <button class="btn btn-quiet" data-back>${S.common.back}</button>
        <button class="btn btn-primary" data-confirm>${S.declare.confirm}</button>
      </div>`;
    container.querySelector('[data-back]').addEventListener('click', stepWitness);
    container.querySelector('[data-confirm]').addEventListener('click', async () => {
      st.title = container.querySelector('[data-title]').value.trim();
      if (!st.title) return;
      st.originPhaseId = container.querySelector('[data-origin]')?.value || null;
      if (aiAvailable()) {
        const btn = container.querySelector('[data-confirm]');
        btn.disabled = true;
        try {
          const res = await declarationCheck({
            beginning: st.beginning, stake: st.stake, reach: st.reach,
            irreversibleNote: st.irreversibleNote,
            chapters: state.chapters.filter(c => c.status === 'open').map(c => c.name),
          });
          if (res.handle === 'redirect') return redirect(res.redirect, res.note);
        } catch { /* the scripted bar stands */ }
        btn.disabled = false;
      }
      commit();
    });
  }

  function commit() {
    const witnessIds = [];
    if (st.witnessName) witnessIds.push(addPerson(st.witnessName).id);
    const entry = addEntry({
      kind: 'act', title: st.title,
      beginning: st.beginning, stake: st.stake, reach: st.reach,
      irreversibleNote: st.irreversibleNote,
      witnessIds, status: 'declared',
      declaredAt: todayStr(), dueBy: st.dueBy,
      exposure: st.exposure, originPhaseId: st.originPhaseId || null,
    });
    opts.onDone && opts.onDone(entry);
  }

  // ── Redirections: one sentence of placement, one of redirection ──
  function redirect(kind, note) {
    const openChapters = state.chapters.filter(c => c.status === 'open');
    let msg, actions;
    if (kind === 'no_stake') {
      msg = note || S.declare.redirectNoStake;
      actions = `<button class="btn btn-primary" data-r="ground">${S.declare.moveToGround}</button>`;
    } else if (kind === 'continuation') {
      const name = openChapters[0] ? openChapters[0].name : S.chapters.title;
      msg = note || fill(S.declare.redirectContinuation, { chapter: name });
      actions = openChapters.map(c => `<button class="btn btn-primary" data-r="chapter" data-c="${c.id}">${esc(c.name)}</button>`).join('');
    } else if (kind === 'after_safe') {
      msg = note || S.declare.redirectAfterSafe;
      actions = `<button class="btn btn-primary" data-r="past">${S.declare.logPastInstead}</button>`;
    } else {
      msg = S.excavate.placeGoodness;
      actions = `<button class="btn btn-primary" data-r="note">${S.excavate.keepUnclassified}</button>`;
    }
    container.innerHTML = `
      <div class="placement">
        <p class="placement-why">${msg}</p>
      </div>
      <div class="btn-col">
        ${actions}
        <button class="btn btn-ghost" data-r="stand">${S.declare.keepDeclaring}</button>
      </div>`;
    container.querySelector('[data-r="ground"]')?.addEventListener('click', () => {
      import('./state.js').then(({ addMaintenance }) => {
        addMaintenance((st.title || st.beginning).slice(0, 80));
        opts.onDivert && opts.onDivert();
        openSweep();
      });
    });
    container.querySelectorAll('[data-r="chapter"]').forEach(b => b.addEventListener('click', () => {
      import('./state.js').then(({ addStep }) => {
        addStep(b.dataset.c, st.beginning || st.title, null);
        opts.onDivert && opts.onDivert();
      });
    }));
    container.querySelector('[data-r="past"]')?.addEventListener('click', () => {
      opts.onDivert && opts.onDivert();
      import('./excavate.js').then(({ openExcavation }) => openExcavation({ seedText: st.beginning }));
    });
    container.querySelector('[data-r="note"]')?.addEventListener('click', () => {
      addEntry({ kind: 'note', title: (st.title || st.beginning).slice(0, 80), beginning: st.beginning });
      opts.onDivert && opts.onDivert();
    });
    container.querySelector('[data-r="stand"]').addEventListener('click', () => {
      if (kind === 'no_stake' && !st.stake) return stepStake();
      stepReview();
    });
  }

  container.innerHTML = `
    <header class="sheet-head">
      <h2>${S.declare.title}</h2>
      <p class="sheet-sub">${S.declare.intro}</p>
    </header>
    <div class="btn-row"><button class="btn btn-primary" data-start>${S.common.next}</button></div>`;
  container.querySelector('[data-start]').addEventListener('click', stepBeginning);
}
