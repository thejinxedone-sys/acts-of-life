// Settings: privacy in plain language, export/import, the Mirror day,
// the optional second reader, and what was kept as yours.
import { S } from './strings.js';
import { state, save, exportJson, replaceState, oldData, removeEntry } from './state.js';
import { openSheet, confirmSheet, toast } from './ui.js';
import { esc, download, todayStr, fmtWhen } from './util.js';
import { testKey } from './ai.js';
import { buildTellingHtml } from './telling.js';

export function openSettings(onChange) {
  openSheet((el, ctx) => renderSettings(el, ctx), { tall: true, onClose: onChange });
}

function renderSettings(el, ctx) {
  const old = oldData();
  el.innerHTML = `
    <header class="sheet-head"><h2>${S.settings.title}</h2></header>

    <div class="story-field">
      <span class="kicker">${S.settings.privacyTitle}</span>
      <p class="soft">${S.settings.privacyBody}</p>
    </div>

    <div class="story-field">
      <div class="btn-col">
        <button class="btn btn-ghost" data-a="export">${S.settings.exportJson}</button>
        <button class="btn btn-ghost" data-a="telling">${S.settings.exportTelling}</button>
        <button class="btn btn-quiet" data-a="import">${S.settings.importJson}</button>
        <input type="file" accept="application/json" hidden />
      </div>
    </div>

    <div class="story-field">
      <span class="kicker">${S.settings.mirrorDayTitle}</span>
      <div class="day-row">
        ${S.days.map((d, i) => `<button class="day-chip ${state.settings.mirrorDay === i ? 'on' : ''}" data-day="${i}">${d.slice(0, 2)}</button>`).join('')}
      </div>
    </div>

    <div class="story-field">
      <span class="kicker">${S.settings.aiTitle}</span>
      <p class="soft">${S.settings.aiBody}</p>
      <input type="password" data-key placeholder="${S.settings.aiKeyLabel}" value="${esc(state.settings.aiKey)}" autocomplete="off" />
      <p class="hint">${S.settings.aiKeyHint}</p>
      <label class="check-row"><input type="checkbox" data-aion ${state.settings.aiOn ? 'checked' : ''} /> ${S.settings.aiOn}</label>
    </div>

    ${old ? `
      <div class="story-field">
        <span class="kicker">${S.settings.oldDataTitle}</span>
        <p class="soft">${S.settings.oldDataBody}</p>
        <button class="btn btn-quiet" data-a="oldexport">${S.settings.oldDataExport}</button>
      </div>` : ''}

    <div class="story-field">
      <span class="kicker">${S.settings.aboutTitle}</span>
      <p class="soft">${S.settings.aboutBody}</p>
      <p class="hint">${S.app.tagline}</p>
      <div class="btn-col">
        <button class="btn btn-quiet" data-a="tour">${S.settings.replayTour}</button>
        <button class="btn btn-quiet" data-a="onboard">${S.settings.replayOnboarding}</button>
      </div>
    </div>`;

  el.querySelector('[data-a="export"]').addEventListener('click', () => {
    download(`acts-of-life-${todayStr()}.json`, exportJson());
  });
  el.querySelector('[data-a="telling"]').addEventListener('click', () => {
    download(`the-telling-draft-${todayStr()}.html`, buildTellingHtml(), 'text/html');
  });
  const fileInput = el.querySelector('input[type="file"]');
  el.querySelector('[data-a="import"]').addEventListener('click', async () => {
    if (await confirmSheet(S.settings.importConfirm, S.settings.importJson, S.common.cancel)) fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || data.version !== 3 || !Array.isArray(data.entries)) throw new Error('bad');
        replaceState(data);
        toast(S.settings.importDone);
        ctx.rerender();
      } catch {
        toast(S.settings.importBad);
      }
    };
    reader.readAsText(f);
  });
  el.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => {
    state.settings.mirrorDay = parseInt(b.dataset.day, 10);
    save();
    ctx.rerender();
  }));
  const keyInput = el.querySelector('[data-key]');
  keyInput.addEventListener('change', async () => {
    state.settings.aiKey = keyInput.value.trim();
    save();
    if (state.settings.aiKey) {
      const ok = await testKey(state.settings.aiKey).catch(() => false);
      toast(ok ? S.settings.aiTestOk : S.settings.aiTestBad);
    }
  });
  el.querySelector('[data-aion]').addEventListener('change', (e) => {
    state.settings.aiOn = e.target.checked;
    save();
  });
  el.querySelector('[data-a="oldexport"]')?.addEventListener('click', () => {
    download(`acts-of-life-previous-${todayStr()}.json`, old);
  });
  el.querySelector('[data-a="tour"]').addEventListener('click', () => {
    ctx.close();
    import('./tour.js').then(({ startTour }) => setTimeout(() => startTour(true), 500));
  });
  el.querySelector('[data-a="onboard"]').addEventListener('click', async () => {
    state.settings.onboarded = false;
    save();
    location.reload();
  });
}

// ── Kept as yours: unclassified, undissected ──
export function openKept(onChange) {
  openSheet((el, ctx) => {
    const notes = state.entries.filter(e => e.kind === 'note');
    el.innerHTML = `
      <header class="sheet-head">
        <h2>${S.kept.title}</h2>
        <p class="sheet-sub">${S.kept.subtitle}</p>
      </header>
      ${notes.length ? notes.map(n => `
        <div class="kept-card" data-id="${n.id}">
          <p>${esc(n.beginning || n.title)}</p>
          <div class="kept-meta">
            <span class="meta">${n.occurredAt ? fmtWhen(n.occurredAt, n.precision || 'day', S.months) : ''}</span>
            <button class="btn btn-quiet" data-del="${n.id}">${S.story.remove}</button>
          </div>
        </div>`).join('') : `<p class="empty-note">${S.kept.empty}</p>`}`;
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (await confirmSheet(S.story.removeConfirm, S.story.remove, S.common.cancel)) {
        removeEntry(b.dataset.del);
      }
      ctx.rerender();
    }));
  }, { tall: true, onClose: onChange });
}
