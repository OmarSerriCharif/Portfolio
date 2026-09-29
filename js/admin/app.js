/**
 * Dashboard shell: auth guard, sidebar, hash-based router.
 * Routes look like #/projects, #/skills, …
 */
import { requireAdmin, signOut } from '../auth.js';
import { isConfigured } from '../supabase-client.js';
import { h, clear, applyPrimaryColor } from '../dom.js';
import { getSiteSettings, countUnreadMessages } from '../api.js';
import { initThemeToggles } from '../theme.js';
import { errorState } from '../ui.js';

import * as overview from './overview.js';
import * as messages from './messages.js';
import * as sections from './sections.js';
import * as hero from './hero.js';
import * as about from './about.js';
import * as skills from './skills.js';
import * as experience from './experience.js';
import * as projects from './projects.js';
import * as services from './services.js';
import * as testimonials from './testimonials.js';
import * as contact from './contact.js';
import * as settings from './settings.js';
import * as account from './account.js';

/** Sidebar structure: [group label, [[route, icon, module], …]] */
const NAV = [
  ['Dashboard', [
    ['overview', '◧', overview],
    ['messages', '✉', messages],
  ]],
  ['Content', [
    ['sections', '⇅', sections],
    ['hero', '★', hero],
    ['about', '☺', about],
    ['experience', '⌛', experience],
    ['skills', '⚡', skills],
    ['projects', '▣', projects],
    ['services', '✦', services],
    ['testimonials', '❝', testimonials],
    ['contact', '☎', contact],
  ]],
  ['Settings', [
    ['settings', '⚙', settings],
    ['account', '🔒', account],
  ]],
];

const ROUTES = new Map(NAV.flatMap(([, items]) => items.map(([name, , module]) => [name, module])));

const main = document.getElementById('main');
const navList = document.getElementById('sidebar-nav');
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('sidebar-backdrop');
const menuToggle = document.getElementById('menu-toggle');
const topbarTitle = document.getElementById('topbar-title');

let session = null;
let unreadBadge = null;

/* ------------------------------- Sidebar ---------------------------------- */

function buildNav() {
  clear(navList, NAV.map(([group, items]) => h('li', { class: 'sidebar__group' },
    h('span', { class: 'sidebar__group-label', text: group }),
    h('ul', {}, items.map(([name, icon, module]) => h('li', {},
      h('a', { class: 'sidebar__link', href: `#/${name}`, dataset: { route: name } },
        h('span', { class: 'sidebar__icon', 'aria-hidden': 'true', text: icon }),
        h('span', { text: module.title }),
        name === 'messages' && (unreadBadge = h('span', { class: 'sidebar__badge', hidden: true })))))))));
}

function setSidebar(open) {
  sidebar.classList.toggle('is-open', open);
  backdrop.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('no-scroll', open);
  if (open) sidebar.querySelector('.sidebar__link')?.focus();
}

async function refreshUnread() {
  try {
    const count = await countUnreadMessages();
    unreadBadge.hidden = count === 0;
    unreadBadge.textContent = String(count);
    unreadBadge.setAttribute('aria-label', `${count} unread`);
  } catch {
    unreadBadge.hidden = true;
  }
}

/* -------------------------------- Router ---------------------------------- */

function currentRoute() {
  const name = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return ROUTES.has(name) ? name : 'overview';
}

async function navigate() {
  const name = currentRoute();
  if (window.location.hash !== `#/${name}`) {
    history.replaceState(null, '', `#/${name}`);
  }
  const module = ROUTES.get(name);

  for (const link of navList.querySelectorAll('.sidebar__link')) {
    if (link.dataset.route === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  // Close any dialog left open by the previous page (its Cancel logic runs).
  for (const dialog of document.querySelectorAll('dialog[open]')) {
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  }

  topbarTitle.textContent = module.title;
  document.title = `${module.title} · Admin`;
  setSidebar(false);

  clear(main);
  const page = h('div', { class: 'page' });
  main.append(page);
  try {
    await module.render(page, { session });
  } catch (error) {
    console.error(error);
    clear(page, errorState({ message: error.message, onRetry: navigate }));
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

/* --------------------------------- Boot ----------------------------------- */

async function boot() {
  if (!isConfigured) {
    window.location.replace('login.html');
    return;
  }
  session = await requireAdmin();
  document.body.classList.remove('auth-pending');

  buildNav();
  initThemeToggles();

  menuToggle.addEventListener('click', () => setSidebar(!sidebar.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setSidebar(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      setSidebar(false);
      menuToggle.focus();
    }
  });
  document.getElementById('logout').addEventListener('click', signOut);
  document.addEventListener('messages:changed', refreshUnread);
  window.addEventListener('hashchange', navigate);

  getSiteSettings().then((s) => s && applyPrimaryColor(s.primary_color)).catch(() => {});
  refreshUnread();
  navigate();
}

boot();
