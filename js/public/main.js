/**
 * Home page entry point: loads all content from Supabase and renders the
 * visible sections in the configured order.
 */
import { h, clear } from '../dom.js';
import { isConfigured } from '../supabase-client.js';
import { getPublicContent } from '../api.js';
import { errorState, emptyState } from '../ui.js';
import { initThemeToggles } from '../theme.js';
import { applySettings, renderHeader, renderFooter, initReveal, initScrollSpy } from './chrome.js';
import { RENDERERS } from './sections.js';

const main = document.getElementById('main');

function showMessage(node) {
  document.body.classList.remove('is-loading');
  clear(main, h('div', { class: 'container page-state' }, node));
}

async function load() {
  document.body.classList.add('is-loading');
  let data;
  try {
    data = await getPublicContent();
  } catch (error) {
    console.error(error);
    showMessage(errorState({
      message: 'The portfolio could not be loaded right now. Please check your connection and try again.',
      onRetry: () => window.location.reload(),
    }));
    return;
  }

  applySettings(data.settings);
  renderHeader({ settings: data.settings, sections: data.sections });
  renderFooter({ settings: data.settings, socials: data.socials });

  const visible = data.sections.filter((s) => s.is_visible && RENDERERS[s.key]);
  let index = 0;
  const nodes = visible.map((section) => {
    if (section.key !== 'hero') index += 1;
    return RENDERERS[section.key](section, index, data);
  }).filter(Boolean);

  document.body.classList.remove('is-loading');
  if (!nodes.length) {
    showMessage(emptyState({ title: 'Nothing to show yet', message: 'This portfolio is being set up. Please check back soon.' }));
    return;
  }
  clear(main, nodes);
  initReveal(main);
  initScrollSpy();

  // Honour a #section in the URL now that the content exists.
  if (window.location.hash.length > 1) {
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
  }
}

initThemeToggles();
if (isConfigured) {
  load();
} else {
  showMessage(emptyState({
    icon: '⚙',
    title: 'Almost there',
    message: 'Add your Supabase project URL and anon key to js/config.js to load the portfolio (see README).',
  }));
}
