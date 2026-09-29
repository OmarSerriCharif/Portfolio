/**
 * Safe DOM helpers.
 *
 * Every piece of database content is rendered through these helpers, which
 * only ever use textContent / setAttribute with vetted values — never
 * innerHTML — so stored content can't inject markup or scripts.
 */

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Create an element.
 *   h('a', { class: 'btn', href: url, on: { click: fn } }, 'Label', childNode)
 *
 * Props:
 *   class      → className
 *   text       → textContent
 *   dataset    → object copied to element.dataset
 *   on         → { event: handler } attached with addEventListener
 *   href/src   → passed through safeUrl()
 *   boolean    → true sets an empty attribute, false/null/undefined skips it
 *   anything else → setAttribute (the "style" attribute is intentionally unsupported)
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    switch (key) {
      case 'class':
        el.className = value;
        break;
      case 'text':
        el.textContent = String(value);
        break;
      case 'dataset':
        Object.assign(el.dataset, value);
        break;
      case 'on':
        for (const [evt, handler] of Object.entries(value)) el.addEventListener(evt, handler);
        break;
      case 'href':
      case 'src':
        el.setAttribute(key, safeUrl(value));
        break;
      case 'style':
        throw new Error('Use CSS classes or element.style instead of a style attribute.');
      default:
        el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(el, children);
  return el;
}

/** Append strings (as text), nodes and (nested) arrays; skips null/false. */
export function append(parent, children) {
  for (const child of [children].flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

/** Remove all children and optionally append new ones. */
export function clear(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

/**
 * Return the URL if it uses an allowed protocol (or is relative), else '#'.
 * Blocks javascript:, data:, vbscript: and friends.
 */
export function safeUrl(url) {
  if (typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (trimmed.startsWith('#')) return trimmed;
  try {
    const parsed = new URL(trimmed, window.location.href);
    return SAFE_PROTOCOLS.includes(parsed.protocol) ? trimmed : '#';
  } catch {
    return '#';
  }
}

/** True for absolute http(s) URLs. */
export function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Is the link external (different origin, absolute http)? */
export function isExternal(url) {
  try {
    return isHttpUrl(url) && new URL(url).origin !== window.location.origin;
  } catch {
    return false;
  }
}

/** Lazy image with alt text and a graceful fallback when it fails to load. */
export function lazyImg(src, alt, className = '') {
  const img = h('img', {
    src,
    alt: alt || '',
    class: className,
    loading: 'lazy',
    decoding: 'async',
    referrerpolicy: 'no-referrer',
  });
  img.addEventListener('error', () => img.classList.add('img-broken'), { once: true });
  return img;
}

/** "Omar Serri Charif" → "OS" */
export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

/** "Hello World!" → "hello-world" */
export function slugify(text = '') {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

const monthYear = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** '2025-08-01' → 'Aug 2025' (dates are stored without time zone). */
export function formatMonthYear(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : monthYear.format(d);
}

export function formatDateTime(isoString) {
  const d = new Date(isoString);
  return Number.isNaN(d.getTime()) ? '' : dateTime.format(d);
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Set a <meta> tag's content, creating it if needed. */
export function setMeta(attr, key, content) {
  let meta = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, key);
    document.head.append(meta);
  }
  meta.setAttribute('content', content || '');
}

/** Set or create a <link rel="..."> href. */
export function setLink(rel, href) {
  let link = document.head.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', rel);
    document.head.append(link);
  }
  link.setAttribute('href', safeUrl(href));
}

/**
 * Apply the brand color and a readable foreground for it.
 * Uses the CSSOM (element.style.setProperty), not a style attribute.
 */
export function applyPrimaryColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
  const root = document.documentElement;
  root.style.setProperty('--primary', hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  root.style.setProperty('--on-primary', luminance > 0.35 ? '#0b1520' : '#ffffff');
  setMeta('name', 'theme-color', hex);
}

/** Announce a message to screen readers via a shared live region. */
export function announce(message) {
  let region = document.getElementById('sr-announcer');
  if (!region) {
    region = h('div', { id: 'sr-announcer', class: 'visually-hidden', 'aria-live': 'polite' });
    document.body.append(region);
  }
  region.textContent = '';
  // Next frame so repeated identical messages are still announced.
  requestAnimationFrame(() => { region.textContent = message; });
}
