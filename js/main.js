// Public site bootstrap: settings, branding, theme, SEO, navigation, footer and shared UI states.

import { isConfigured, getSingleton, listPublic } from './api.js';
import { el, clear, append, assetUrl, absoluteUrl, safeUrl, resolveLink, link, COLOR_RE, prefersReducedMotion } from './utils.js';
import { icon, socialIcon } from './icons.js';

const THEME_KEY = 'theme';
let currentSettings = null;

/* ------------------------------------------------------------------ */
/*  Theme                                                              */
/* ------------------------------------------------------------------ */

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

export function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme, persist = false) {
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) storageSet(THEME_KEY, theme);
  document.querySelectorAll('[data-theme-toggle]').forEach(updateThemeButton);
  document.querySelectorAll('[data-logo]').forEach(updateLogo);
}

function resolveInitialTheme(defaultTheme) {
  const stored = storageGet(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  if (defaultTheme === 'light' || defaultTheme === 'dark') return defaultTheme;
  return systemTheme();
}

function updateThemeButton(button) {
  const dark = currentTheme() === 'dark';
  clear(button);
  button.appendChild(icon(dark ? 'sun' : 'moon'));
  button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  button.setAttribute('aria-pressed', String(dark));
}

export function themeToggleButton() {
  const button = el('button', {
    type: 'button',
    class: 'icon-btn',
    'data-theme-toggle': '',
    on: { click: () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true) },
  });
  updateThemeButton(button);
  return button;
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  const stored = storageGet(THEME_KEY);
  if (stored !== 'light' && stored !== 'dark' && (!currentSettings || currentSettings.default_theme === 'system')) {
    applyTheme(event.matches ? 'dark' : 'light');
  }
});

/* ------------------------------------------------------------------ */
/*  Branding & SEO                                                     */
/* ------------------------------------------------------------------ */

export function applyBranding(settings) {
  const root = document.documentElement;
  const brand = {};
  if (COLOR_RE.test(settings.primary_color || '')) { root.style.setProperty('--brand-primary', settings.primary_color); brand.primary = settings.primary_color; }
  if (COLOR_RE.test(settings.secondary_color || '')) { root.style.setProperty('--brand-secondary', settings.secondary_color); brand.secondary = settings.secondary_color; }
  if (COLOR_RE.test(settings.accent_color || '')) { root.style.setProperty('--brand-accent', settings.accent_color); brand.accent = settings.accent_color; }
  storageSet('site-brand', JSON.stringify(brand));
  storageSet('site-default-theme', settings.default_theme || 'system');

  const meta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(el('meta', { name: 'theme-color' }));
  meta.setAttribute('content', settings.primary_color || '#182551');

  const favicon = assetUrl(settings.favicon_url);
  if (favicon) {
    let linkEl = document.querySelector('link[rel="icon"]');
    if (!linkEl) linkEl = document.head.appendChild(el('link', { rel: 'icon' }));
    linkEl.setAttribute('href', favicon);
    let apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (!apple) apple = document.head.appendChild(el('link', { rel: 'apple-touch-icon' }));
    apple.setAttribute('href', favicon);
  }
}

function setMeta(attr, key, value) {
  let node = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!value) {
    if (node) node.remove();
    return;
  }
  if (!node) node = document.head.appendChild(el('meta', { [attr]: key }));
  node.setAttribute('content', value);
}

/**
 * Update document title, description, keywords, Open Graph/Twitter tags and canonical URL.
 * overrides: { title, description, image, path, type }
 */
export function applySeo(overrides = {}) {
  const s = currentSettings || {};
  const company = s.company_name || '';
  const title = overrides.title
    ? (company && !overrides.title.includes(company) ? `${overrides.title} | ${company}` : overrides.title)
    : (s.seo_title || s.site_title || company || document.title);
  const description = overrides.description || s.seo_description || s.tagline || '';
  const image = absoluteUrl(overrides.image || s.og_image_url);

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('name', 'keywords', s.seo_keywords || '');
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', overrides.type || 'website');
  setMeta('property', 'og:site_name', company);
  setMeta('property', 'og:image', image);
  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);

  let canonicalHref = null;
  const base = safeUrl(s.canonical_url);
  if (base && /^https?:\/\//.test(base)) {
    const path = overrides.path ?? `${location.pathname.split('/').pop() || ''}${location.search}`;
    canonicalHref = new URL(path.replace(/^\//, '').replace(/^index\.html$/, ''), base.endsWith('/') ? base : `${base}/`).href;
  } else {
    canonicalHref = `${location.origin}${location.pathname}${overrides.keepQuery ? location.search : ''}`;
  }
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) canonical = document.head.appendChild(el('link', { rel: 'canonical' }));
  canonical.setAttribute('href', canonicalHref);
  setMeta('property', 'og:url', canonicalHref);
}

export function getSettings() {
  return currentSettings;
}

/* ------------------------------------------------------------------ */
/*  Shared UI states                                                   */
/* ------------------------------------------------------------------ */

export function skeletonCards(count = 3, variant = 'card') {
  const wrap = el('div', { class: 'grid', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i += 1) wrap.appendChild(el('div', { class: `skeleton skeleton--${variant}` }));
  return el('div', { role: 'status', 'aria-live': 'polite' }, [el('span', { class: 'sr-only', text: 'Loading…' }), wrap]);
}

export function skeletonText(lines = 4) {
  const wrap = el('div', { role: 'status' }, [el('span', { class: 'sr-only', text: 'Loading…' })]);
  wrap.appendChild(el('div', { class: 'skeleton skeleton--title', 'aria-hidden': 'true' }));
  for (let i = 0; i < lines; i += 1) {
    wrap.appendChild(el('div', { class: `skeleton skeleton--line${i === lines - 1 ? ' skeleton--medium' : ''}`, 'aria-hidden': 'true' }));
  }
  return wrap;
}

export function emptyState(message, title = 'Nothing here yet', iconName = 'layers') {
  return el('div', { class: 'state', role: 'status' }, [
    el('span', { class: 'state__icon' }, [icon(iconName, { size: 24 })]),
    el('p', { class: 'state__title', text: title }),
    message ? el('p', { text: message }) : null,
  ]);
}

export function errorState(message, onRetry) {
  return el('div', { class: 'state state--error', role: 'alert' }, [
    el('span', { class: 'state__icon' }, [icon('refresh', { size: 24 })]),
    el('p', { class: 'state__title', text: 'We couldn’t load this content' }),
    el('p', { text: message || 'Please check your connection and try again.' }),
    onRetry
      ? el('button', { type: 'button', class: 'btn btn--outline btn--sm', on: { click: onRetry } }, [icon('refresh', { size: 16 }), 'Try again'])
      : null,
  ]);
}

/** Run an async renderer with skeleton → content / empty / error + retry. */
export async function loadInto(container, loader, { skeleton = () => skeletonCards() } = {}) {
  const attempt = async () => {
    clear(container);
    container.setAttribute('aria-busy', 'true');
    container.appendChild(skeleton());
    try {
      const content = await loader();
      clear(container);
      append(container, content);
      observeReveal(container);
    } catch (error) {
      console.error(error);
      clear(container);
      container.appendChild(errorState(error.message, attempt));
    } finally {
      container.removeAttribute('aria-busy');
    }
  };
  await attempt();
}

/* ------------------------------------------------------------------ */
/*  Reveal on scroll                                                   */
/* ------------------------------------------------------------------ */

let revealObserver = null;

export function observeReveal(root = document) {
  const targets = root.querySelectorAll('.reveal:not(.is-visible)');
  if (!targets.length) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('is-visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  }
  targets.forEach((t, i) => {
    t.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`;
    revealObserver.observe(t);
  });
}

/* ------------------------------------------------------------------ */
/*  Header & footer                                                    */
/* ------------------------------------------------------------------ */

function updateLogo(img) {
  const s = currentSettings;
  if (!s) return;
  const dark = currentTheme() === 'dark' || img.dataset.logo === 'inverse';
  const src = assetUrl(dark && s.logo_dark_url ? s.logo_dark_url : s.logo_url);
  if (src) img.src = src;
}

function brandLink(settings, { inverse = false } = {}) {
  const home = new URL('index.html', new URL('../', import.meta.url)).href;
  const anchor = el('a', { class: 'brand', href: home });
  const logo = assetUrl(settings.logo_url);
  if (logo) {
    const img = el('img', {
      class: 'brand__logo',
      alt: settings.logo_alt || '',
      'data-logo': inverse ? 'inverse' : 'auto',
      width: 120,
      height: 40,
      decoding: 'async',
    });
    anchor.appendChild(img);
    updateLogo(img);
  }
  anchor.appendChild(el('span', { class: 'brand__name', text: settings.company_name || '' }));
  anchor.setAttribute('aria-label', `${settings.company_name || 'Home'} — home`);
  return anchor;
}

function navLink(item, isHome, className) {
  const href = resolveLink(item.target, item.link_type, isHome);
  if (!href) return null;
  const attrs = { class: className };
  if (item.open_in_new_tab || item.link_type === 'external') {
    attrs.target = '_blank';
    attrs.rel = 'noopener noreferrer';
  }
  const current = location.pathname.split('/').pop() || 'index.html';
  if (item.link_type === 'page' && item.target.split('?')[0] === current) attrs['aria-current'] = 'page';
  return el('a', { ...attrs, href }, [item.label]);
}

function renderHeader(settings, navItems, isHome) {
  const header = document.getElementById('site-header');
  if (!header) return;
  clear(header);
  header.className = 'site-header';

  const navId = 'site-nav';
  const nav = el('nav', { class: 'site-nav', id: navId, 'aria-label': 'Main' });
  const list = el('ul', { class: 'site-nav__list', role: 'list' });
  for (const item of navItems.filter((n) => n.location !== 'footer')) {
    const a = navLink(item, isHome, 'site-nav__link');
    if (a) list.appendChild(el('li', {}, [a]));
  }
  nav.appendChild(list);

  const toggle = el('button', {
    type: 'button',
    class: 'icon-btn nav-toggle',
    'aria-controls': navId,
    'aria-expanded': 'false',
    'aria-label': 'Open menu',
  }, [icon('menu')]);

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  };
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) nav.querySelector('a')?.focus();
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      toggle.focus();
    }
  });

  const actions = el('div', { class: 'site-header__actions' });
  if (settings.allow_theme_toggle !== false) actions.appendChild(themeToggleButton());
  actions.appendChild(toggle);

  header.appendChild(el('div', { class: 'container site-header__inner' }, [brandLink(settings), nav, actions]));

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function socialLinksList(socials, extraClass = '') {
  if (!socials.length) return null;
  const list = el('ul', { class: `social-list ${extraClass}`.trim(), role: 'list' });
  for (const s of socials) {
    const href = safeUrl(s.url);
    if (!href) continue;
    const label = s.label || s.platform.charAt(0).toUpperCase() + s.platform.slice(1);
    list.appendChild(el('li', {}, [
      link(href, { class: 'icon-btn', 'aria-label': label, title: label }, [socialIcon(s.platform, { size: 18 })]),
    ]));
  }
  return list;
}

function renderFooter(settings, navItems, socials, documents, isHome) {
  const footer = document.getElementById('site-footer');
  if (!footer) return;
  clear(footer);
  footer.className = 'site-footer';

  const about = el('div', {}, [
    brandLink(settings, { inverse: true }),
    settings.footer_text ? el('p', { text: settings.footer_text }) : null,
    socialLinksList(socials),
  ]);
  if (about.querySelector('.social-list')) about.querySelector('.social-list').style.marginTop = 'var(--space-4)';

  const footerNav = navItems.filter((n) => n.location !== 'header');
  const navCol = footerNav.length
    ? el('nav', { 'aria-label': 'Footer' }, [
        el('h2', { text: 'Explore' }),
        el('ul', { role: 'list' }, footerNav.map((item) => {
          const a = navLink(item, isHome, '');
          return a ? el('li', {}, [a]) : null;
        })),
      ])
    : null;

  const contactItems = [];
  if (settings.contact_email) contactItems.push(el('li', {}, [el('a', { href: `mailto:${settings.contact_email}` }, [settings.contact_email])]));
  if (settings.contact_phone) contactItems.push(el('li', {}, [el('a', { href: `tel:${settings.contact_phone.replace(/[^+0-9]/g, '')}` }, [settings.contact_phone])]));
  if (settings.location) contactItems.push(el('li', { text: settings.location }));
  if (settings.business_hours) contactItems.push(el('li', { text: settings.business_hours }));
  const contactCol = contactItems.length
    ? el('div', {}, [el('h2', { text: 'Contact' }), el('ul', { role: 'list' }, contactItems)])
    : null;

  const docsCol = documents.length
    ? el('div', {}, [
        el('h2', { text: 'Resources' }),
        el('ul', { role: 'list' }, documents.map((d) => {
          const href = assetUrl(d.file_url);
          return href ? el('li', {}, [link(href, { download: '' }, [d.title])]) : null;
        })),
      ])
    : null;

  const year = String(new Date().getFullYear());
  const copyright = (settings.copyright_text || `© {year} ${settings.company_name || ''}`).replace(/\{year\}/g, year);

  footer.appendChild(el('div', { class: 'container' }, [
    el('div', { class: 'site-footer__grid' }, [about, navCol, contactCol, docsCol]),
    el('div', { class: 'site-footer__bottom' }, [el('p', { text: copyright })]),
  ]));
}

function renderConfigBanner() {
  document.body.prepend(el('div', { class: 'config-banner', role: 'alert' }, [
    'This website is not connected to Supabase yet. Add your project URL and anon key to js/config.js (see README.md).',
  ]));
}

/* ------------------------------------------------------------------ */
/*  Init                                                               */
/* ------------------------------------------------------------------ */

/**
 * Load global data shared by all public pages.
 * Returns { settings, navItems, socials, documents } (settings may be a minimal fallback on error).
 */
export async function initSite({ isHome = false } = {}) {
  applyTheme(resolveInitialTheme(storageGet('site-default-theme')));

  if (!isConfigured) {
    renderConfigBanner();
    currentSettings = { company_name: '', allow_theme_toggle: true };
    renderHeader(currentSettings, [], isHome);
    renderFooter(currentSettings, [], [], [], isHome);
    throw new Error('Supabase is not configured. Add your project URL and anon key to js/config.js.');
  }

  const [settings, navItems, socials, documents] = await Promise.all([
    getSingleton('site_settings').catch(() => null),
    listPublic('navigation_items').catch(() => []),
    listPublic('social_links').catch(() => []),
    listPublic('documents').catch(() => []),
  ]);

  currentSettings = settings || { company_name: '', allow_theme_toggle: true };
  if (settings) {
    applyBranding(settings);
    if (!storageGet(THEME_KEY)) applyTheme(resolveInitialTheme(settings.default_theme));
  }
  renderHeader(currentSettings, navItems, isHome);
  renderFooter(currentSettings, navItems, socials, documents, isHome);
  applySeo();

  if (!settings) throw new Error('Site settings could not be loaded.');
  return { settings: currentSettings, navItems, socials, documents };
}

/** Build the standard section header (eyebrow / h2 / subtitle) from a sections row. */
export function sectionHeader(section, { center = false, headingId = null } = {}) {
  if (!section || (!section.title && !section.eyebrow && !section.subtitle)) return null;
  return el('header', { class: `section__header${center ? ' section__header--center' : ''} reveal` }, [
    section.eyebrow ? el('span', { class: 'eyebrow', text: section.eyebrow }) : null,
    section.title ? el('h2', { class: 'section__title', id: headingId, text: section.title }) : null,
    section.subtitle ? el('p', { class: 'lead', text: section.subtitle }) : null,
  ]);
}
