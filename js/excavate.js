// ═══════════════════════════════════════════════════════════════
// Excavation — the generous historian. The user brings a moment;
// the flow teases the act out of it. There is no rejection path:
// every outcome is a placement. Moments that read as grief or
// trauma are offered a way to stay whole and private, up front.
// ═══════════════════════════════════════════════════════════════
import { S } from './strings.js';
import { state, addEntry } from './state.js';
import { glyphHtml } from './glyphs.js';
import { openSheet, toast } from './ui.js';
import { esc } from './util.js';
import { aiAvailable, excavateNext } from './ai.js';
import { openChapterEditor } from './chapter.js';

export const QUESTIONS = [
  { key: 'beginning', q: () => S.excavate.qBeginning, hint: () => S.excavate.qBeginningHint },
  { key: 'stake', q: () => S.excavate.qStake, hint: () => S.excavate.qStakeHint },
  { key: 'reach', q: () => S.excavate.qReach, hint: () => S.excavate.qReachHint },
  { key: 'hinge', q: () => S.excavate.qHinge, hint: () => S.excavate.qHingeHint },
];

// A modest net for moments that should not be dissected. AI (when on)
// catches the subtler cases; this catches the unmistakable ones.
const SENSITIVE = /\b(grie(f|ve|ving)|funeral|died|death|passed away|suicide|abuse|abusive|assault|molest|rape|miscarr|stillbirth|divorce|cancer|terminal|hospice|addict|relapse|overdose|trauma|ptsd)\b/i;

export function scriptedPlacement(a) {
  const outward = (a.reach || '').trim() || (a.hinge || '').trim();
  if (outward) return { kind: 'act', why: S.excavate.placeAct };
  return { kind: 'turning', why: S.excavate.placeTurning };
}

export function openExcavation(opts = {}) {
  openSheet((el, ctx) => {
    excavationEngine(el, Object.assign({}, opts, {
      onDone: (entry) => { ctx.close(); if (opts.onDone) opts.onDone(entry); },
      onKeep: (entry) => { ctx.close(); toast(S.excavate.keptConfirm); if (opts.onKeep) opts.onKeep(entry); },
    }));
  }, { tall: true, onClose: opts.onClose });
}

// Renders the whole flow into `container`. Used by the sheet above and
// by onboarding (compact mode: fewer questions, moment already written).
export function excavationEngine(container, opts = {}) {
  const compact = !!opts.compact;
  const useAi = aiAvailable();
  const maxQ = compact ? 3 : 4;
  const st = {
    moment: (opts.seedText || '').trim(),
    when: { year: '', month: '', day: '' },
    answers: {},          // key → text
    asked: [],            // { key, q, a }
    scriptedIdx: 0,
  };

  const quote = () => st.moment
    ? `<p class="moment-quote"><span class="kicker">${S.excavate.momentKicker}</span>“${esc(st.moment)}”</p>`
    : '';

  function keepPrivately() {
    const entry = st.moment.trim() ? addEntry({
      kind: 'note', title: st.moment.trim().slice(0, 80), beginning: st.moment.trim(),
      occurredAt: whenIso(), precision: whenPrecision(),
    }) : null;
    opts.onKeep && opts.onKeep(entry);
  }

  function whenIso() {
    const y = parseInt(st.when.year, 10);
    if (!y) return null;
    const m = parseInt(st.when.month, 10) || 6;
    const d = parseInt(st.when.day, 10) || 15;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  function whenPrecision() {
    if (!st.when.month) return 'year';
    if (!st.when.day) return 'month';
    return 'day';
  }

  // ── Step 1: the moment (skipped when it was already written) ──
  function stepMoment() {
    container.innerHTML = `
      <header class="sheet-head">
        <h2>${S.excavate.title}</h2>
        <p class="sheet-sub">${S.excavate.intro}</p>
      </header>
      <textarea class="big-input" rows="4" placeholder="${S.excavate.momentPlaceholder}">${esc(st.moment)}</textarea>
      <div class="btn-row">
        <button class="btn btn-primary" data-next>${S.common.next}</button>
      </div>`;
    const ta = container.querySelector('textarea');
    ta.focus();
    container.querySelector('[data-next]').addEventListener('click', () => {
      st.moment = ta.value.trim();
      if (!st.moment) return;
      afterMoment();
    });
  }

  function afterMoment() {
    if (SENSITIVE.test(st.moment)) return stepSensitive(stepWhen);
    stepWhen();
  }

  // ── The gentle gate for grief and trauma ──
  function stepSensitive(onContinue) {
    container.innerHTML = `
      ${quote()}
      <header class="sheet-head">
        <h2>${S.excavate.sensitiveTitle}</h2>
        <p class="sheet-sub">${S.excavate.sensitiveBody}</p>
      </header>
      <div class="btn-col">
        <button class="btn btn-primary" data-keep>${S.excavate.sensitiveKeep}</button>
        <button class="btn btn-ghost" data-continue>${S.excavate.sensitiveContinue}</button>
      </div>`;
    container.querySelector('[data-keep]').addEventListener('click', keepPrivately);
    container.querySelector('[data-continue]').addEventListener('click', onContinue);
  }

  // ── Step 2: around when ──
  function stepWhen() {
    const now = new Date().getFullYear();
    container.innerHTML = `
      ${quote()}
      <header class="sheet-head">
        <h2>${S.excavate.whenTitle}</h2>
        <p class="sheet-sub">${S.excavate.whenHint}</p>
      </header>
      <div class="when-row">
        <input type="number" data-w="year" placeholder="${S.common.year}" min="1900" max="${now}" value="${esc(st.when.year)}" />
        <select data-w="month">
          <option value="">${S.common.month} · ${S.common.optional}</option>
          ${S.months.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}
        </select>
        <input type="number" data-w="day" placeholder="${S.common.day} · ${S.common.optional}" min="1" max="31" />
      </div>
      <div class="btn-row">
        ${opts.seedText ? '' : `<button class="btn btn-quiet" data-back>${S.common.back}</button>`}
        <button class="btn btn-primary" data-next>${S.common.next}</button>
      </div>`;
    container.querySelector('[data-back]')?.addEventListener('click', stepMoment);
    container.querySelector('[data-next]').addEventListener('click', () => {
      st.when.year = container.querySelector('[data-w="year"]').value;
      st.when.month = container.querySelector('[data-w="month"]').value;
      st.when.day = container.querySelector('[data-w="day"]').value;
      const y = parseInt(st.when.year, 10);
      if (!y || y < 1900 || y > now) return;
      nextQuestion();
    });
  }

  // ── Step 3: archaeology, one question at a time ──
  async function nextQuestion() {
    if (useAi && st.asked.length > 0) {
      renderThinking();
      try {
        const res = await excavateNext({
          moment: st.moment,
          answers: st.asked.map(a => ({ q: a.q, a: a.a })),
          asked: st.asked.length,
          maxQuestions: maxQ,
        });
        if (res.handle === 'question' && st.asked.length < maxQ) {
          return renderQuestion({ key: res.test || 'beginning', q: res.question, hint: '' });
        }
        if (res.handle === 'place') return stepPlacement(res);
        if (res.handle === 'offer_keep') return stepSensitive(() => stepPlacement(scriptedPlacement(st.answers)));
      } catch { /* fall through to scripted */ }
    }
    const remaining = QUESTIONS.slice(st.scriptedIdx);
    if (!remaining.length) return stepPlacement(scriptedPlacement(st.answers));
    const q = remaining[0];
    // The hinge question — the one that finds the outward day inside an
    // inner journey — is always allowed when reach came back empty.
    const hingeNeeded = q.key === 'hinge' && !(st.answers.reach || '').trim();
    if (st.asked.length >= maxQ && !hingeNeeded) return stepPlacement(scriptedPlacement(st.answers));
    st.scriptedIdx += 1;
    if (q.key === 'hinge' && !hingeNeeded) return stepPlacement(scriptedPlacement(st.answers));
    renderQuestion({ key: q.key, q: q.q(), hint: q.hint() });
  }

  function renderThinking() {
    container.innerHTML = `${quote()}<div class="thinking"><span></span><span></span><span></span></div>`;
  }

  function renderQuestion(q) {
    container.innerHTML = `
      ${quote()}
      <header class="sheet-head">
        <h2 class="question">${esc(q.q)}</h2>
        ${q.hint ? `<p class="sheet-sub">${esc(q.hint)}</p>` : ''}
      </header>
      <textarea class="big-input" rows="3">${esc(st.answers[q.key] || '')}</textarea>
      <div class="btn-row">
        <button class="btn btn-quiet" data-skip>${S.excavate.skipQuestion}</button>
        <button class="btn btn-primary" data-next>${S.common.next}</button>
      </div>`;
    const ta = container.querySelector('textarea');
    ta.focus();
    const submit = (val) => {
      st.answers[q.key] = val;
      st.asked.push({ key: q.key, q: q.q, a: val });
      nextQuestion();
    };
    container.querySelector('[data-next]').addEventListener('click', () => submit(ta.value.trim()));
    container.querySelector('[data-skip]').addEventListener('click', () => submit(''));
  }

  // ── Step 4: the placement — a verdict that is never a judgment ──
  function stepPlacement(placement) {
    const kind = placement.kind;
    if (kind === 'phase') return stepPhase(placement);
    if (kind === 'announcement') return stepAnnouncement(placement);
    if (kind === 'goodness') return stepGoodness(placement);
    renderConfirm(kind, placement.why);
  }

  function defaultTitle() {
    const words = st.moment.split(/\s+/).slice(0, 7).join(' ');
    return words.length > 60 ? words.slice(0, 60) : words;
  }

  function renderConfirm(kind, why, keepTitle) {
    const openChapters = state.chapters.filter(c => c.status === 'open' || c.status === 'fallow');
    const caption = kind === 'act' ? S.excavate.placeActCaption : S.excavate.placeTurningCaption;
    container.innerHTML = `
      <div class="placement">
        <span class="placement-glyph">${glyphHtml(kind, 40, 'var(--ember)')}</span>
        <p class="placement-why">${esc(why)}</p>
        <p class="placement-caption">${esc(caption)}</p>
      </div>
      <div class="form-col">
        <span class="kicker">${S.excavate.titleAsk}</span>
        <input type="text" data-title maxlength="90" value="${esc(keepTitle != null ? keepTitle : defaultTitle())}" placeholder="${S.excavate.titleHint}" />
        ${kind === 'act' ? `
          <label class="check-row"><input type="checkbox" data-anon /> ${S.excavate.anonymousLabel}</label>
          <p class="hint">${S.excavate.anonymousHint}</p>` : ''}
        ${openChapters.length ? `
          <span class="kicker">${S.story.fromChapter} <em>(${S.common.optional})</em></span>
          <select data-origin>
            <option value=""></option>
            ${openChapters.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
          </select>` : ''}
      </div>
      <div class="btn-row">
        <button class="btn btn-quiet" data-other>${S.excavate.adjustPlacement}</button>
        <button class="btn btn-primary" data-save>${kind === 'act' ? S.excavate.confirmAct : S.excavate.confirmTurning}</button>
      </div>
      <div class="alt-col" hidden>
        <button class="alt-choice" data-as="act"><b>${S.excavate.asAct}</b><span>${S.excavate.asActSub}</span></button>
        <button class="alt-choice" data-as="turning"><b>${S.excavate.asTurning}</b><span>${S.excavate.asTurningSub}</span></button>
        <button class="btn btn-quiet" data-keep>${S.excavate.keepPrivate}</button>
      </div>`;
    const titleInput = container.querySelector('[data-title]');
    container.querySelector('[data-other]').addEventListener('click', () => {
      container.querySelector('.alt-col').hidden = false;
    });
    container.querySelectorAll('[data-as]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.as;
      renderConfirm(k, k === 'act' ? S.excavate.placeAct : S.excavate.placeTurning, titleInput.value);
    }));
    container.querySelector('[data-keep]').addEventListener('click', keepPrivately);
    container.querySelector('[data-save]').addEventListener('click', () => {
      const title = titleInput.value.trim();
      if (!title) return;
      const entry = addEntry({
        kind,
        title,
        beginning: st.answers.beginning || st.moment,
        stake: st.answers.stake || '',
        reach: kind === 'act' ? (st.answers.reach || st.answers.hinge || '') : '',
        anonymous: !!container.querySelector('[data-anon]')?.checked,
        status: 'logged',
        occurredAt: whenIso(),
        precision: whenPrecision(),
        originPhaseId: container.querySelector('[data-origin]')?.value || null,
      });
      opts.onDone && opts.onDone(entry);
    });
  }

  function stepPhase(placement) {
    container.innerHTML = `
      ${quote()}
      <div class="placement">
        <span class="placement-glyph"><span class="line-glyph"></span></span>
        <p class="placement-why">${esc(placement.why || S.excavate.placePhase)}</p>
      </div>
      <div class="btn-row">
        <button class="btn btn-quiet" data-other>${S.excavate.adjustPlacement}</button>
        <button class="btn btn-primary" data-line>${S.excavate.confirmPhase}</button>
      </div>
      <div class="alt-col" hidden>
        <button class="alt-choice" data-as="act"><b>${S.excavate.asAct}</b><span>${S.excavate.asActSub}</span></button>
        <button class="alt-choice" data-as="turning"><b>${S.excavate.asTurning}</b><span>${S.excavate.asTurningSub}</span></button>
      </div>`;
    container.querySelector('[data-line]').addEventListener('click', () => {
      openChapterEditor(null, () => opts.onDone && opts.onDone(null), {
        name: defaultTitle(), startedAt: whenIso() || undefined,
      });
    });
    container.querySelector('[data-other]').addEventListener('click', () => {
      container.querySelector('.alt-col').hidden = false;
    });
    container.querySelectorAll('[data-as]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.as;
      renderConfirm(k, k === 'act' ? S.excavate.placeAct : S.excavate.placeTurning);
    }));
  }

  function stepAnnouncement(placement) {
    container.innerHTML = `
      ${quote()}
      <div class="placement">
        <p class="placement-why">${esc(placement.why || S.excavate.placeAnnouncement)}</p>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" data-anyway>${S.excavate.confirmAct}</button>
        <button class="btn btn-primary" data-original>${S.declare.logPastInstead}</button>
      </div>`;
    container.querySelector('[data-original]').addEventListener('click', () => {
      st.answers = {}; st.asked = []; st.scriptedIdx = 0;
      stepMoment();
    });
    container.querySelector('[data-anyway]').addEventListener('click', () => renderConfirm('act', S.excavate.placeAct));
  }

  function stepGoodness(placement) {
    container.innerHTML = `
      ${quote()}
      <div class="placement">
        <p class="placement-why">${esc(placement.why || S.excavate.placeGoodness)}</p>
        <p class="sheet-sub">${S.excavate.placeGoodnessOffer}</p>
      </div>
      <div class="btn-row">
        <button class="btn btn-ghost" data-anyway>${S.excavate.confirmAct}</button>
        <button class="btn btn-primary" data-keep>${S.excavate.keepPrivate}</button>
      </div>`;
    container.querySelector('[data-anyway]').addEventListener('click', () => renderConfirm('act', S.excavate.placeAct));
    container.querySelector('[data-keep]').addEventListener('click', keepPrivately);
  }

  if (st.moment && opts.seedText) afterMoment();
  else stepMoment();
}
