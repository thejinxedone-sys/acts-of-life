// The Library — curated examples, contrast pairs, counterfeits.
import { S } from './strings.js';
import { FAMILIES, EXAMPLES, CONTRASTS, COUNTERFEITS } from './library-data.js';
import { openSheet } from './ui.js';
import { esc } from './util.js';
import { openDeclaration } from './declare.js';

export function openLibrary(onChange, opts = {}) {
  openSheet((el, ctx) => renderLibrary(el, ctx, opts), { tall: true, onClose: onChange });
}

function exposureDots(n) {
  return `<span class="lib-exposure" title="${S.library.exposure} ${n}">${'·'.repeat(n)}<b>${n}</b></span>`;
}

function renderLibrary(el, ctx, opts = {}) {
  el.innerHTML = `
    <header class="sheet-head">
      <h2>${S.library.title}</h2>
      <p class="sheet-sub">${S.library.subtitle}</p>
    </header>

    ${FAMILIES.map(f => `
      <section class="lib-family">
        <h3>${esc(f.name)}</h3>
        <p class="lib-note">${esc(f.note)}</p>
        ${EXAMPLES.filter(e => e.family === f.id).map((e, i) => `
          <div class="lib-card">
            <div class="lib-card-head">
              <span class="lib-title">${esc(e.title)}</span>
              ${exposureDots(e.exposure)}
            </div>
            <p class="lib-text">${esc(e.text)}</p>
            ${e.link ? `<a class="lib-link" href="${e.link}" target="_blank" rel="noopener">${esc(e.linkText)} →</a>` : ''}
            ${opts.browse ? '' : `<button class="btn btn-quiet lib-declare" data-f="${f.id}" data-i="${EXAMPLES.indexOf(e)}">${S.library.declareThis}</button>`}
          </div>`).join('')}
      </section>`).join('')}

    <section class="lib-family">
      <h3>${S.library.contrastTitle}</h3>
      <p class="lib-note">${S.library.contrastSubtitle}</p>
      ${CONTRASTS.map(c => `
        <div class="contrast-pair">
          <div class="contrast-cell contrast-left">
            <span class="lib-title">${esc(c.left.title)}</span>
            <p class="lib-text">${esc(c.left.note)}</p>
          </div>
          <div class="contrast-cell contrast-right">
            <span class="lib-title">${esc(c.right.title)}</span>
            <p class="lib-text">${esc(c.right.note)}</p>
          </div>
          ${c.third ? `
            <div class="contrast-cell contrast-third">
              <span class="lib-title">${esc(c.third.title)}</span>
              <p class="lib-text">${esc(c.third.note)}</p>
            </div>` : ''}
          <p class="contrast-lesson">${esc(c.lesson)}</p>
        </div>`).join('')}
    </section>

    <section class="lib-family">
      <h3>${S.library.counterfeitTitle}</h3>
      <p class="lib-note">${S.library.counterfeitSubtitle}</p>
      ${COUNTERFEITS.map(c => `
        <div class="lib-card counterfeit">
          <div class="lib-card-head">
            <span class="lib-title">${esc(c.title)}</span>
            <span class="fails">${S.library.failsTest}: ${esc(c.fails)}</span>
          </div>
          <p class="lib-text">${esc(c.note)}</p>
        </div>`).join('')}
    </section>`;

  el.querySelectorAll('.lib-declare').forEach(b => b.addEventListener('click', () => {
    const e = EXAMPLES[parseInt(b.dataset.i, 10)];
    openDeclaration({
      prefillTitle: e.title,
      prefillBeginning: e.text,
      exposure: e.exposure,
      onDone: ctx.rerender,
    });
  }));
}
