// Boot: the app opens on the Arc, never on today.
import { state, takeDailySnapshot } from './state.js';
import { renderArc } from './arc.js';
import { startOnboarding } from './onboarding.js';

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

takeDailySnapshot();

// All type is set in rem; one root size scales the whole app.
export function applyTextScale() {
  document.documentElement.style.fontSize = (16 * (state.settings.textScale || 1)) + 'px';
}
applyTextScale();

if (state.settings.onboarded) {
  renderArc();
} else {
  startOnboarding();
}
