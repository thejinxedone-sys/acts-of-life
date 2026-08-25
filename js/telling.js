// The Telling — draft assembly for export. The full narrated Telling
// arrives with the year's turn (v2); this draft gathers the record
// into a book-like document the user owns.
import { S } from './strings.js';
import { SENTENCE } from './sentence.js';
import { state, personName } from './state.js';
import { esc, fmtWhen, fmtShort } from './util.js';

export function buildTellingHtml() {
  const entries = state.entries
    .filter(e => e.kind !== 'note' && e.occurredAt)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const years = [...new Set([
    ...entries.map(e => e.occurredAt.slice(0, 4)),
    ...state.chapters.map(c => c.startedAt.slice(0, 4)),
    ...state.fallow.map(f => f.startedAt.slice(0, 4)),
  ])].sort();

  const yearBlock = (y) => {
    const acts = entries.filter(e => e.occurredAt.startsWith(y) && e.status !== 'declared');
    const opened = state.chapters.filter(c => c.startedAt.startsWith(y));
    const ended = state.chapters.filter(c => c.endedAt && c.endedAt.startsWith(y));
    const fallows = state.fallow.filter(f => f.startedAt.startsWith(y));
    if (!acts.length && !opened.length && !ended.length && !fallows.length) return '';
    return `
      <section>
        <h2>${y}</h2>
        ${opened.map(c => `<p class="line"><em>${esc(c.name)}</em> — ${S.telling.chapterOpened} ${fmtShort(c.startedAt, S.months)}.</p>`).join('')}
        ${acts.map(e => `
          <div class="entry">
            <h3>${e.kind === 'act' ? '✦' : '☽'} ${esc(e.title)}</h3>
            <p class="when">${fmtWhen(e.occurredAt, e.precision || 'day', S.months)}${e.status === 'lapsed' ? ' · ' + S.story.lapsed : ''}</p>
            ${e.beginning ? `<p><strong>${S.story.beginning}.</strong> ${esc(e.beginning)}</p>` : ''}
            ${e.stake ? `<p><strong>${S.story.stake}.</strong> ${esc(e.stake)}</p>` : ''}
            ${e.reach ? `<p><strong>${S.story.reach}.</strong> ${esc(e.reach)}</p>` : ''}
            ${(e.witnessIds || []).length ? `<p><strong>${S.story.witness}.</strong> ${e.witnessIds.map(personName).filter(Boolean).map(esc).join(', ')}</p>` : ''}
            ${e.reflection ? `<p class="reflection">${esc(e.reflection)}</p>` : ''}
          </div>`).join('')}
        ${ended.map(c => `<p class="line"><em>${esc(c.name)}</em> — ${S.telling.chapterShipped} ${esc(c.shippedNote || c.shippingCondition || '')}</p>`).join('')}
        ${fallows.map(f => `<p class="line fallow">${esc(f.name || S.telling.fallowNamed)}, ${fmtShort(f.startedAt, S.months)}${f.endedAt ? ' — ' + fmtShort(f.endedAt, S.months) : ' —'}.</p>`).join('')}
      </section>`;
  };

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${S.telling.draftTitle}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #201e1d; background: #faf5ec;
         max-width: 620px; margin: 0 auto; padding: 8vh 24px 12vh; line-height: 1.65; }
  .epigraph { font-style: italic; text-align: center; margin: 10vh 0; font-size: 1.15em; color: #46413a; }
  h1 { font-weight: normal; text-align: center; font-size: 1.6em; }
  .note { text-align: center; font-size: .85em; color: #82796a; margin-bottom: 6vh; }
  h2 { font-size: 1.1em; letter-spacing: .2em; margin-top: 8vh; border-bottom: 1px solid #d8cdb9; padding-bottom: 6px; }
  h3 { font-weight: normal; font-size: 1.15em; margin: 2.2em 0 0; }
  .when { font-size: .8em; color: #82796a; margin: .2em 0 .8em; }
  .line { color: #46413a; }
  .fallow { color: #82796a; font-style: italic; }
  .reflection { font-style: italic; border-left: 2px solid #d8cdb9; padding-left: 14px; color: #46413a; }
  strong { font-weight: 600; font-size: .85em; letter-spacing: .04em; }
</style></head><body>
  <h1>${S.telling.draftTitle}</h1>
  <p class="note">${S.telling.draftNote}</p>
  <p class="epigraph">${SENTENCE}</p>
  ${years.map(yearBlock).join('')}
</body></html>`;
}
