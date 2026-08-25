// Sheet manager: every surface besides the Arc rises over it as paper.
// History-integrated so hardware/browser back closes the top sheet.

const stack = [];
let host = null;

// History states survive reloads; a stale sheetDepth from a previous
// page life would poison the depth accounting. Start every load at 0.
history.replaceState(null, '');

function ensureHost() {
  if (!host) {
    host = document.createElement('div');
    host.id = 'sheets';
    document.body.appendChild(host);
  }
  return host;
}

// history.back() settles asynchronously; opening a sheet while a close
// is still in flight would get the new sheet swallowed by the popstate.
// So opens queue behind pending closes.
let pendingCloses = 0;
const queuedOpens = [];

export function openSheet(render, opts = {}) {
  if (pendingCloses > 0) {
    queuedOpens.push([render, opts]);
    return null;
  }
  ensureHost();
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'sheet' + (opts.tall ? ' sheet-tall' : '');
  backdrop.appendChild(sheet);
  host.appendChild(backdrop);
  const rec = { backdrop, sheet, onClose: opts.onClose || null };
  stack.push(rec);
  history.pushState({ sheetDepth: stack.length }, '');
  backdrop.addEventListener('pointerdown', (e) => {
    if (e.target === backdrop) closeSheet();
  });
  const ctx = { close: closeSheet, rerender: () => render(sheet, ctx) };
  render(sheet, ctx);
  // Not rAF: it starves in background tabs and the sheet would stay invisible.
  setTimeout(() => backdrop.classList.add('open'), 20);
  return rec;
}

export function closeSheet() {
  if (!stack.length) return;
  pendingCloses += 1;
  history.back();
}

export function closeAllSheets() {
  if (stack.length) {
    pendingCloses += stack.length;
    history.go(-stack.length);
  }
}

function destroyTop() {
  const rec = stack.pop();
  if (!rec) return;
  rec.backdrop.classList.remove('open');
  setTimeout(() => rec.backdrop.remove(), 250);
  if (rec.onClose) rec.onClose();
}

window.addEventListener('popstate', (e) => {
  const target = Math.min(stack.length, (e.state && e.state.sheetDepth) || 0);
  while (stack.length > target) {
    destroyTop();
    if (pendingCloses > 0) pendingCloses -= 1;
  }
  if (pendingCloses === 0 && queuedOpens.length) {
    const pending = queuedOpens.splice(0);
    for (const [render, opts] of pending) openSheet(render, opts);
  }
});

export function sheetDepth() { return stack.length; }

// A quiet transient note. Used sparingly; silence is the default.
let toastEl = null, toastTimer = null;
export function toast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// Simple confirm sheet — flat copy, two buttons, no drama.
export function confirmSheet(message, confirmLabel, cancelLabel) {
  return new Promise((resolve) => {
    let settled = false;
    openSheet((el, { close }) => {
      el.innerHTML = `
        <p class="confirm-msg">${message}</p>
        <div class="btn-row">
          <button class="btn btn-ghost" data-x="no">${cancelLabel}</button>
          <button class="btn btn-primary" data-x="yes">${confirmLabel}</button>
        </div>`;
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        settled = true;
        resolve(b.dataset.x === 'yes');
        close();
      }));
    }, { onClose: () => { if (!settled) resolve(false); } });
  });
}
