// ═══════════════════════════════════════════════════════════════
// Onboarding — expectations first, then "find the acts of your life".
// The intro sets the purpose, the vocabulary, and the mechanics —
// including the choice of AI or no AI — before a single question.
// Discovery, never judgment. The user leaves owning something.
// ═══════════════════════════════════════════════════════════════
import { S } from './strings.js';
import { SENTENCE } from './sentence.js';
import { state, save, addPerson, addChapter, addEntry, addRitual } from './state.js';
import { excavationEngine } from './excavate.js';
import { EXAMPLES } from './library-data.js';
import { glyphHtml, starPath } from './glyphs.js';
import { openLibrary } from './library.js';
import { esc, fill, todayStr, msToIso, DAY } from './util.js';
import { renderArc } from './arc.js';
import { openSheet } from './ui.js';
import { aiAvailable, suggestActs, testKey } from './ai.js';
import { startTour } from './tour.js';

const FIRST_ACT_TITLES = [
  'Ask for the unsoftened feedback',
  'Show the unfinished thing',
  'Put a date on the someday idea',
  'Say it while they can hear it',
];

export function startOnboarding() {
  const app = document.getElementById('app');
  const ob = { moments: ['', '', '', '', ''], chapterName: '' };

  // ── 0. The intro: purpose → altitudes → why acts → promises → AI ──
  // The hook scene animates the arc's own grammar: ground circles pulse
  // in, a work line draws itself, a star rises. A preview, not a metaphor.
  function hookScene() {
    const circles = Array.from({ length: 9 }, (_, i) =>
      `<circle cx="${52 + i * 24}" cy="104" r="2.6" fill="rgba(245,234,216,.35)" class="hs-ground" style="animation-delay:${0.35 + i * 0.11}s"/>`).join('');
    return `
      <svg class="hook-scene" viewBox="0 0 300 120" aria-hidden="true">
        ${circles}
        <line x1="52" y1="72" x2="236" y2="72" stroke="rgba(245,234,216,.5)" stroke-width="2"
              pathLength="1" class="hs-line" style="animation-delay:1.5s"/>
        <g class="hs-star" style="animation-delay:2.5s">
          <circle cx="204" cy="30" r="16" fill="rgba(246,160,107,.18)"/>
          <path d="${starPath(204, 30, 8)}" fill="rgba(247,238,222,.95)"/>
        </g>
      </svg>`;
  }

  function intro1() {
    app.innerHTML = `
      <div class="ob-root ob-center">
        <h1 class="ob-title">${S.intro.t1}</h1>
        <p class="ob-body">${S.intro.b1a}</p>
        ${hookScene()}
        <p class="ob-body">${S.intro.b1b}</p>
        <p class="ob-body ob-strong">${S.intro.b1c}</p>
        <button class="btn btn-primary ob-next" data-next>${S.intro.next}</button>
      </div>`;
    app.querySelector('[data-next]').addEventListener('click', intro2);
  }

  function introWhy() {
    app.innerHTML = `
      <div class="ob-root ob-center">
        <h1 class="ob-title">${S.intro.whyT}</h1>
        <p class="ob-body">${S.intro.whyB1}</p>
        <p class="ob-body ob-strong">${S.intro.whyB2}</p>
        <p class="ob-body">${S.intro.whyB3}</p>
        <p class="ob-body ob-pivot">${S.intro.whyPivot}</p>
        <button class="btn btn-quiet ob-lib" data-lib>${S.intro.libraryPeek}</button>
        <button class="btn btn-primary ob-next" data-next>${S.intro.next}</button>
      </div>`;
    app.querySelector('[data-next]').addEventListener('click', intro3);
    app.querySelector('[data-lib]').addEventListener('click', () => openLibrary(null, { browse: true }));
  }

  function intro2() {
    const row = (glyph, name, text) => `
      <div class="alt-row-intro">
        <span class="alt-glyph">${glyph}</span>
        <div><b>${name}</b><p>${text}</p></div>
      </div>`;
    app.innerHTML = `
      <div class="ob-root">
        <h1 class="ob-title">${S.intro.t2}</h1>
        <div class="alt-list">
          ${row(glyphHtml('act', 22, 'var(--ember-bright)'), S.intro.alt3Name, S.intro.alt3)}
          ${row(glyphHtml('turning', 22, 'rgba(245,234,216,.85)'), S.intro.alt4Name, S.intro.alt4)}
          ${row('<span class="line-glyph-intro"></span>', S.intro.alt2Name, S.intro.alt2)}
          ${row(glyphHtml('maintenance', 22, 'rgba(245,234,216,.5)'), S.intro.alt1Name, S.intro.alt1)}
        </div>
        <button class="btn btn-primary ob-next" data-next>${S.intro.next}</button>
      </div>`;
    app.querySelector('[data-next]').addEventListener('click', introWhy);
  }

  function intro3() {
    app.innerHTML = `
      <div class="ob-root ob-center">
        <h1 class="ob-title">${S.intro.t3}</h1>
        <p class="ob-body">${S.intro.b3a}</p>
        <p class="ob-body">${S.intro.b3b}</p>
        <button class="btn btn-primary ob-next" data-next>${S.intro.next}</button>
      </div>`;
    app.querySelector('[data-next]').addEventListener('click', intro4);
  }

  function intro4() {
    app.innerHTML = `
      <div class="ob-root">
        <h1 class="ob-title">${S.intro.t4}</h1>
        <p class="ob-body">${S.intro.b4}</p>
        <div class="ai-choice">
          <button class="ai-option" data-ai="no"><b>${S.intro.aiNo}</b><span>${S.intro.aiNoSub}</span></button>
          <button class="ai-option" data-ai="yes"><b>${S.intro.aiYes}</b><span>${S.intro.aiYesSub}</span></button>
        </div>
        <div class="ai-key" hidden>
          <input type="password" data-key placeholder="${S.intro.aiKeyAsk}" autocomplete="off" />
          <p class="ob-hint">${S.intro.aiKeyNote}</p>
          <p class="ob-hint ai-key-status"></p>
          <button class="btn btn-primary" data-keygo>${S.intro.next}</button>
        </div>
      </div>`;
    const keyBox = app.querySelector('.ai-key');
    app.querySelector('[data-ai="no"]').addEventListener('click', () => {
      state.settings.aiOn = false;
      save();
      stepMoments();
    });
    app.querySelector('[data-ai="yes"]').addEventListener('click', () => {
      keyBox.hidden = false;
      keyBox.querySelector('input').focus();
    });
    keyBox.querySelector('[data-keygo]').addEventListener('click', async () => {
      const key = keyBox.querySelector('[data-key]').value.trim();
      const status = keyBox.querySelector('.ai-key-status');
      if (!key) return;
      state.settings.aiKey = key;
      state.settings.aiOn = true;
      save();
      status.textContent = '…';
      const ok = await testKey(key).catch(() => false);
      status.textContent = ok ? S.intro.aiKeyOk : S.intro.aiKeyBad;
      if (ok) setTimeout(stepMoments, 500);
    });
  }

  // ── 1. Five moments, nothing else on screen ──
  function stepMoments() {
    app.innerHTML = `
      <div class="ob-root">
        <h1 class="ob-title">${S.onboarding.coldOpen}</h1>
        <p class="ob-hint">${S.onboarding.coldOpenHint}</p>
        <div class="ob-moments">
          ${ob.moments.map((m, i) => `<input type="text" data-m="${i}" maxlength="140" placeholder="${S.onboarding.momentPlaceholder}" value="${esc(m)}" />`).join('')}
        </div>
        <button class="btn btn-quiet ob-lib" data-lib>${S.intro.libraryPeek}</button>
        <button class="btn btn-primary ob-next" data-next>${S.onboarding.continueBtn}</button>
      </div>`;
    app.querySelector('[data-next]').addEventListener('click', () => {
      app.querySelectorAll('[data-m]').forEach(inp => { ob.moments[+inp.dataset.m] = inp.value.trim(); });
      if (!ob.moments.some(Boolean)) return;
      stepPriming();
    });
    app.querySelector('[data-lib]').addEventListener('click', () => {
      app.querySelectorAll('[data-m]').forEach(inp => { ob.moments[+inp.dataset.m] = inp.value.trim(); });
      openLibrary(null, { browse: true });
    });
  }

  // ── 2. The bridge: from pride to beginnings, before any verdicts ──
  function stepPriming() {
    app.innerHTML = `
      <div class="ob-root ob-center">
        <p class="ob-priming">${S.onboarding.priming}</p>
        <button class="btn btn-primary ob-next" data-next>${S.onboarding.findThem}</button>
      </div>`;
    app.querySelector('[data-next]').addEventListener('click', () => excavateAll());
  }

  // ── 3. Each moment through the excavation flow ──
  function excavateAll() {
    const queue = ob.moments.filter(Boolean);
    let i = 0;
    const nextMoment = () => {
      if (i >= queue.length) return stepReveal();
      app.innerHTML = `
        <div class="ob-root">
          <p class="ob-progress">${fill(S.onboarding.excavateProgress, { n: i + 1, total: queue.length })}</p>
          <div class="ob-paper"></div>
        </div>`;
      excavationEngine(app.querySelector('.ob-paper'), {
        seedText: queue[i],
        compact: true,
        onDone: () => { i += 1; nextMoment(); },
        onKeep: () => { i += 1; nextMoment(); },
      });
    };
    nextMoment();
  }

  // ── 4. The reveal: one beat of empty screen, then the arc draws ──
  function stepReveal() {
    app.innerHTML = `
      <div class="ob-root ob-center ob-reveal">
        <p class="ob-sentence">${SENTENCE}</p>
      </div>`;
    state.settings.onboarded = true;
    state.settings.lastQuarterly = todayStr();
    save();
    // Two starter rituals, so the ground shows how it is used from day
    // one — rings by the now-line, removable like anything else.
    if (!state.rituals.length) {
      addRitual(S.onboarding.seedRitual1, 'daily');
      addRitual(S.onboarding.seedRitual2, 'weekly');
    }
    setTimeout(() => {
      renderArc({ reveal: true });
      setTimeout(stepAfterReveal, 2200);
    }, 3400);
  }

  // ── 5–8. Rememberers, chapter, one small act, mirror day ──
  function stepAfterReveal() {
    openSheet((el, ctx) => stepRememberers(el, ctx), {
      tall: true,
      onClose: () => { renderArc(); setTimeout(() => startTour(), 600); },
    });
  }

  function stepRememberers(el, ctx) {
    el.innerHTML = `
      <header class="sheet-head">
        <h2>${S.onboarding.rememberersTitle}</h2>
        <p class="sheet-sub">${S.onboarding.rememberersHint}</p>
      </header>
      <div class="form-col">
        ${[0, 1, 2].map(i => `<input type="text" data-r="${i}" maxlength="60" />`).join('')}
        <div class="btn-row">
          <button class="btn btn-quiet" data-skip>${S.onboarding.rememberersSkip}</button>
          <button class="btn btn-primary" data-next>${S.common.next}</button>
        </div>
      </div>`;
    const next = () => stepChapter(el, ctx);
    el.querySelector('[data-next]').addEventListener('click', () => {
      el.querySelectorAll('[data-r]').forEach(inp => {
        const v = inp.value.trim();
        if (v) addPerson(v, { isRememberer: true });
      });
      next();
    });
    el.querySelector('[data-skip]').addEventListener('click', next);
  }

  function stepChapter(el, ctx) {
    el.innerHTML = `
      <header class="sheet-head">
        <h2>${S.onboarding.chapterTitle}</h2>
        <p class="sheet-sub">${S.onboarding.chapterHint}</p>
      </header>
      <div class="form-col">
        <input type="text" data-c maxlength="80" />
        <div class="btn-row">
          <button class="btn btn-quiet" data-skip>${S.onboarding.chapterSkip}</button>
          <button class="btn btn-primary" data-next>${S.common.next}</button>
        </div>
      </div>`;
    el.querySelector('[data-next]').addEventListener('click', () => {
      const v = el.querySelector('[data-c]').value.trim();
      if (v) {
        addChapter({ name: v, startedAt: todayStr() });
        ob.chapterName = v;
      }
      stepFirstAct(el, ctx);
    });
    el.querySelector('[data-skip]').addEventListener('click', () => stepFirstAct(el, ctx));
  }

  async function stepFirstAct(el, ctx) {
    let picks = FIRST_ACT_TITLES
      .map(t => EXAMPLES.find(e => e.title === t))
      .filter(Boolean)
      .map(e => ({ title: e.title, text: e.text }));
    let aiShaped = false;

    if (ob.chapterName && aiAvailable()) {
      el.innerHTML = `<div class="thinking"><span></span><span></span><span></span></div>`;
      try {
        const suggested = await Promise.race([
          suggestActs(ob.chapterName),
          new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 9000)),
        ]);
        if (suggested.length) { picks = suggested; aiShaped = true; }
      } catch { /* the static picks stand */ }
    }

    el.innerHTML = `
      <header class="sheet-head">
        <h2>${S.onboarding.firstActTitle}</h2>
        ${ob.chapterName ? `<p class="sheet-sub chapter-lead">${fill(S.onboarding.firstActChapterLead, { chapter: esc(ob.chapterName) })}</p>` : ''}
        <p class="sheet-sub">${S.onboarding.firstActHint}</p>
      </header>
      ${aiShaped ? `<p class="hint">${S.onboarding.firstActAiNote}</p>` : ''}
      <div class="form-col">
        <div class="ob-picks">
          ${picks.map((p, i) => `<button class="ob-pick" data-p="${i}"><b>${esc(p.title)}</b><span>${esc(p.text)}</span></button>`).join('')}
        </div>
        <textarea data-fresh rows="2" placeholder="${S.onboarding.firstActPlaceholder}"></textarea>
        <p class="hint">${S.onboarding.firstActSmallNote}</p>
        <span class="kicker">${S.declare.dateTitle}</span>
        <input type="date" data-date value="${msToIso(Date.now() + 14 * DAY)}" min="${todayStr()}" />
        <span class="kicker">${S.declare.witnessTitle} <em>(${S.common.optional})</em></span>
        <input type="text" data-witness maxlength="60" />
        <div class="btn-row">
          <button class="btn btn-quiet" data-skip>${S.onboarding.firstActSkip}</button>
          <button class="btn btn-primary" data-next>${S.declare.confirm}</button>
        </div>
      </div>`;
    let chosen = null;
    el.querySelectorAll('.ob-pick').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('.ob-pick').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      chosen = picks[+b.dataset.p];
      const fresh = el.querySelector('[data-fresh]');
      if (!fresh.value.trim()) fresh.value = chosen.text;
    }));
    const next = () => stepMirrorDay(el, ctx);
    el.querySelector('[data-next]').addEventListener('click', () => {
      const fresh = el.querySelector('[data-fresh]').value.trim();
      const text = fresh || (chosen ? chosen.text : '');
      const title = (chosen && (!fresh || fresh === chosen.text)) ? chosen.title : fresh.split(/\s+/).slice(0, 7).join(' ');
      if (!text) return;
      const witnessName = el.querySelector('[data-witness]').value.trim();
      const openChapter = state.chapters.find(c => c.name === ob.chapterName);
      addEntry({
        kind: 'act', title, beginning: text,
        status: 'declared', declaredAt: todayStr(),
        dueBy: el.querySelector('[data-date]').value || msToIso(Date.now() + 14 * DAY),
        exposure: 1,
        witnessIds: witnessName ? [addPerson(witnessName).id] : [],
        originPhaseId: openChapter ? openChapter.id : null,
      });
      next();
    });
    el.querySelector('[data-skip]').addEventListener('click', next);
  }

  function stepMirrorDay(el, ctx) {
    el.innerHTML = `
      <header class="sheet-head">
        <h2>${S.onboarding.mirrorTitle}</h2>
        <p class="sheet-sub">${S.onboarding.mirrorHint}</p>
      </header>
      <div class="day-row">
        ${S.days.map((d, i) => `<button class="day-chip ${state.settings.mirrorDay === i ? 'on' : ''}" data-day="${i}">${d.slice(0, 2)}</button>`).join('')}
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" data-finish>${S.onboarding.finish}</button>
      </div>`;
    el.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
      state.settings.mirrorDay = +b.dataset.day;
      save();
      stepMirrorDay(el, ctx);
    }));
    el.querySelector('[data-finish]').addEventListener('click', ctx.close);
  }

  intro1();
}
