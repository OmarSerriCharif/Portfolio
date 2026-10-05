/**
 * Dark/light mode toggle, persisted in localStorage.
 * The initial theme is applied by theme-init.js before first paint.
 */
import { THEME_STORAGE_KEY } from './constants.js';

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* Storage unavailable (private mode): the theme still applies for this page. */
  }
}

/** Wire up every [data-theme-toggle] button on the page. */
export function initThemeToggles(root = document) {
  const buttons = [...root.querySelectorAll('[data-theme-toggle]')];
  const sync = () => {
    const theme = currentTheme();
    for (const btn of buttons) {
      const next = theme === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-label', `Switch to ${next} mode`);
      btn.setAttribute('title', `Switch to ${next} mode`);
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      const icon = btn.querySelector('[data-theme-icon]');
      if (icon) icon.textContent = theme === 'dark' ? '☀' : '☾';
    }
  };
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      sync();
    });
  }
  sync();
}
