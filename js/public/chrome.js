/**
 * Shared "chrome" for public pages: SEO/meta from site settings, the header
 * (logo + navigation), the footer, and scroll animations.
 */
import { h, clear, lazyImg, safeUrl, setMeta, setLink, applyPrimaryColor, isExternal } from '../dom.js';

/** Apply site settings to <head> and CSS variables. */
export function applySettings(settings, overrides = {}) {
  if (!settings) return;
  applyPrimaryColor(settings.primary_color);

  const title = overrides.title || settings.meta_title || settings.site_title;
  const description = overrides.description ?? settings.meta_description;
  const image = overrides.image || settings.og_image_url;

  document.title = title;
  setMeta('name', 'description', description);
  setMeta('property', 'og:site_name', settings.site_title);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:type', overrides.type || 'website');
  setMeta('property', 'og:url', window.location.href);
  setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  if (image) {
    setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:image', image);
  }
  if (settings.favicon_url) setLink('icon', settings.favicon_url);
}

/** Visible, navigable sections (hero is the page top, not a menu item). */
export function navSections(sections = []) {
  return sections.filter((s) => s.is_visible && s.key !== 'hero');
}

/**
 * Fill the site header.
 * @param {object} opts.settings
 * @param {object[]} opts.sections
 * @param {string} opts.base  '' on the home page, 'index.html' on other pages
 */
export function renderHeader({ settings, sections, base = '' }) {
  const brand = document.getElementById('brand');
  const navList = document.getElementById('nav-list');
  const toggle = document.getElementById('nav-toggle');

  brand.setAttribute('href', base ? `${base}#top` : '#top');
  clear(brand, settings?.logo_url
    ? lazyImg(settings.logo_url, settings.site_title, 'brand__logo')
    : h('span', { class: 'brand__text', text: settings?.logo_text || settings?.site_title || '' }));
  brand.setAttribute('aria-label', `${settings?.site_title || 'Home'} — home`);

  clear(navList, navSections(sections).map((section) => h('li', {},
    h('a', { class: 'nav__link', href: `${base}#${section.key}`, dataset: { section: section.key }, text: section.nav_label }))));

  const setOpen = (open) => {
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  navList.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Solid header background once the page scrolls.
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/** Highlight the nav link of the section currently in view. */
export function initScrollSpy() {
  const links = [...document.querySelectorAll('.nav__link[data-section]')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links) {
        if (link.dataset.section === entry.target.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((link) => {
    const section = document.getElementById(link.dataset.section);
    if (section) observer.observe(section);
  });
}

/** Social links list, shared by the contact section and footer. */
export function socialList(socials = [], className = 'socials') {
  if (!socials.length) return null;
  return h('ul', { class: className }, socials.map((s) => {
    const external = isExternal(s.url);
    return h('li', {},
      h('a', {
        class: 'social', href: safeUrl(s.url),
        target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null,
        'aria-label': s.platform, title: s.platform,
      },
      h('span', { class: 'social__icon', 'aria-hidden': 'true', text: s.icon || s.platform.charAt(0) }),
      h('span', { class: 'social__label', text: s.platform })));
  }));
}

export function renderFooter({ settings, socials }) {
  const footer = document.getElementById('site-footer');
  clear(footer, h('div', { class: 'container site-footer__inner' },
    h('p', { class: 'site-footer__text', text: settings?.footer_text || '' }),
    socialList(socials, 'socials socials--compact'),
    h('a', { class: 'site-footer__top', href: '#top', text: 'Back to top ↑' })));
}

/** Fade/slide elements in as they enter the viewport. */
export function initReveal(root = document) {
  const targets = [...root.querySelectorAll('.reveal:not(.is-visible)')];
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      entry.target.dispatchEvent(new CustomEvent('reveal'));
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach((el) => observer.observe(el));
}

/** Count up the numeric part of stat values like "40%" or "8M+". */
export function animateCounter(el) {
  const raw = el.dataset.value || el.textContent;
  const match = raw.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  if (!match || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const [, prefix, number, suffix] = match;
  const target = Number(number);
  const decimals = number.includes('.') ? number.split('.')[1].length : 0;
  const duration = 1200;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = raw;
  };
  requestAnimationFrame(tick);
}
