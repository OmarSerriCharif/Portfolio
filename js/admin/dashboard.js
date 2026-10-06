// Dashboard shell: auth guard, layout, hash router and lazy-loaded modules.

import { requireAdmin, signOut } from '../auth.js';
import { getSingleton, countRows } from '../api.js';
import { el, clear, assetUrl, COLOR_RE } from '../utils.js';
import { icon } from '../icons.js';
import { errorState, loadingState } from './ui.js';
import { themeToggleButton } from '../main.js';

const ROUTES = {
  overview: { title: 'Overview', icon: 'grid', load: () => import('./overview.js') },
  settings: { title: 'Site settings', icon: 'sliders', load: () => import('./settings.js') },
  sections: { title: 'Sections', icon: 'layers', load: () => import('./sections.js') },
  navigation: { title: 'Navigation', icon: 'compass', load: () => import('./navigation.js') },
  hero: { title: 'Hero', icon: 'star', load: () => import('./hero.js') },
  about: { title: 'About & statistics', icon: 'home', load: () => import('./about.js') },
  services: { title: 'Services', icon: 'briefcase', load: () => import('./services.js') },
  pricing: { title: 'Pricing packages', icon: 'tag', load: () => import('./pricing.js') },
  'package-features': { title: 'Package features', icon: 'list', load: () => import('./packages.js') },
  addons: { title: 'Add-ons', icon: 'plus', load: () => import('./addons.js') },
  industries: { title: 'Industries', icon: 'target', load: () => import('./industries.js') },
  'why-choose-us': { title: 'Why choose us', icon: 'award', load: () => import('./why-choose-us.js') },
  process: { title: 'Process', icon: 'trending-up', load: () => import('./process.js') },
  'case-studies': { title: 'Case studies', icon: 'image', load: () => import('./case-studies.js') },
  clients: { title: 'Clients', icon: 'users', load: () => import('./clients.js') },
  testimonials: { title: 'Testimonials', icon: 'message', load: () => import('./testimonials.js') },
  team: { title: 'Team', icon: 'user', load: () => import('./team.js') },
  faqs: { title: 'FAQs', icon: 'help', load: () => import('./faqs.js') },
  messages: { title: 'Messages', icon: 'inbox', load: () => import('./messages.js') },
  'change-password': { title: 'Account & password', icon: 'lock', load: () => import('./users.js') },
};

const NAV_GROUPS = [
  { title: 'Dashboard', items: ['overview', 'messages'] },
  { title: 'Website', items: ['settings', 'sections', 'navigation', 'hero', 'about'] },
  { title: 'Offer', items: ['services', 'pricing', 'package-features', 'addons'] },
  { title: 'Proof', items: ['case-studies', 'clients', 'testimonials'] },
  { title: 'Company', items: ['industries', 'why-choose-us', 'process', 'team', 'faqs'] },
  { title: 'Account', items: ['change-password'] },
];

const ctx = { user: null, params: new URLSearchParams() };
let unreadBadge;
let renderToken = 0;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { route: ROUTES[path] ? path : 'overview', params: new URLSearchParams(query) };
}

async function refreshUnread() {
  try {
    const unread = await countRows('contact_messages', { is_read: false });
    unreadBadge.textContent = unread ? String(unread) : '';
    unreadBadge.hidden = !unread;
    unreadBadge.setAttribute('aria-label', `${unread} unread`);
  } catch { /* ignore */ }
}

async function refreshBranding() {
  try {
    const s = await getSingleton('site_settings');
    if (!s) return;
    const root = document.documentElement;
    for (const [key, prop] of [['primary_color', '--brand-primary'], ['secondary_color', '--brand-secondary'], ['accent_color', '--brand-accent']]) {
      if (COLOR_RE.test(s[key] || '')) root.style.setProperty(prop, s[key]);
    }
    const name = document.getElementById('sidebar-name');
    if (name) name.textContent = s.company_name || 'Dashboard';
    const logo = document.getElementById('sidebar-logo');
    const src = assetUrl(s.logo_dark_url || s.logo_url);
    if (logo && src) { logo.src = src; logo.hidden = false; }
    const fav = assetUrl(s.favicon_url);
    if (fav) document.querySelector('link[rel="icon"]')?.setAttribute('href', fav);
    document.title = `Dashboard · ${s.company_name || ''}`;
  } catch { /* ignore */ }
}

function buildSidebar() {
  const sidebar = document.getElementById('sidebar');
  const nav = el('nav', { 'aria-label': 'Dashboard' });
  for (const group of NAV_GROUPS) {
    const titleId = `nav-group-${group.title.toLowerCase()}`;
    nav.appendChild(el('div', { class: 'sidebar__group' }, [
      el('h2', { class: 'sidebar__group-title', id: titleId, text: group.title }),
      el('ul', { class: 'sidebar__list', role: 'list', 'aria-labelledby': titleId }, group.items.map((key) => {
        const route = ROUTES[key];
        const link = el('a', { class: 'sidebar__link', href: `#/${key}`, dataset: { route: key } }, [icon(route.icon, { size: 18 }), route.title]);
        if (key === 'messages') {
          unreadBadge = el('span', { class: 'sidebar__count', hidden: true });
          link.appendChild(unreadBadge);
        }
        return el('li', {}, [link]);
      })),
    ]));
  }
  sidebar.querySelector('[data-slot="nav"]').replaceWith(nav);
}

function setupMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const toggle = document.getElementById('menu-toggle');
  const setOpen = (open) => {
    sidebar.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('a')?.focus();
  };
  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', (e) => { if (e.target.closest('.sidebar__link')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
}

async function renderRoute() {
  const token = ++renderToken;
  const { route, params } = parseHash();
  ctx.params = params;
  const def = ROUTES[route];
  const view = document.getElementById('view');
  document.getElementById('topbar-title').textContent = def.title;
  document.querySelectorAll('.sidebar__link').forEach((a) => {
    if (a.dataset.route === route) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  clear(view);
  view.appendChild(loadingState());
  try {
    const module = await def.load();
    if (token !== renderToken) return;
    clear(view);
    await module.render(view, ctx);
  } catch (error) {
    if (token !== renderToken) return;
    console.error(error);
    clear(view);
    view.appendChild(errorState(error.message || 'This page failed to load.', renderRoute));
  }
  if (token === renderToken) view.focus({ preventScroll: true });
}

async function init() {
  const user = await requireAdmin();
  if (!user) return;
  ctx.user = user;
  ctx.refreshUnread = refreshUnread;
  ctx.refreshBranding = refreshBranding;

  buildSidebar();
  setupMobileMenu();
  document.getElementById('user-email').textContent = user.email;
  document.querySelector('.topbar__user').prepend(themeToggleButton());
  document.getElementById('logout').addEventListener('click', () => signOut());
  document.getElementById('app').hidden = false;
  document.getElementById('boot').remove();

  window.addEventListener('hashchange', renderRoute);
  if (!location.hash) history.replaceState(null, '', '#/overview');
  await Promise.all([renderRoute(), refreshUnread(), refreshBranding()]);
}

init().catch((error) => {
  console.error(error);
  const boot = document.getElementById('boot');
  if (boot) boot.replaceChildren(errorState(error.message || 'The dashboard could not start.', () => location.reload()));
});
