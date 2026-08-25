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

if (state.settings.onboarded) {
  renderArc();
} else {
  startOnboarding();
}
