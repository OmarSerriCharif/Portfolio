// Shared, dependency-free helpers used by both the public site and the admin dashboard.

// Validation patterns. Keep these in sync with the CHECK constraints in setup.sql.
export const URL_RE = /^(https?:\/\/[^\s<>"]+|mailto:[^\s<>"]+|tel:[+0-9() .-]+|#[A-Za-z0-9_-]*|\/[^\s<>"]*|[A-Za-z0-9_][A-Za-z0-9_./?=&#%+-]*)$/;
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const PHONE_RE = /^[+0-9() .-]{6,30}$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
export const CURRENCY_RE = /^[A-Z]{3}$/;

// Site root, resolved from this module's location (/js/utils.js → /), so the
// project works from a domain root, a sub-folder (GitHub Pages) or /admin/.
export const SITE_ROOT = new URL('../', import.meta.url);

/**
 * Create a DOM element safely. Text is always inserted with text nodes, never as HTML.
 * attrs: { class, text, dataset, style, on: {event: fn}, hidden, ...attributes }
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, val] of Object.entries(value)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, val);
        else node.style[prop] = val;
      }
    }
    else if (key === 'on') for (const [evt, fn] of Object.entries(value)) node.addEventListener(evt, fn);
    else if (key === 'value' && 'value' in node) node.value = value;
    else if (key === 'checked' || key === 'selected' || key === 'disabled' || key === 'required' || key === 'multiple') node[key] = Boolean(value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  append(node, children);
  return node;
}

export function append(parent, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else if (child instanceof Node) parent.appendChild(child);
    else parent.appendChild(document.createTextNode(String(child)));
  }
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function isSafeUrl(url) {
  return typeof url === 'string' && url.length > 0 && url.length <= 2048 && URL_RE.test(url.trim());
}

/** Returns the URL if it passes the allow-list, otherwise null. */
export function safeUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  return isSafeUrl(trimmed) ? trimmed : null;
}

/** Resolve a stored URL (absolute, root-relative or project-relative) to something usable from any page. */
export function assetUrl(url) {
  const safe = safeUrl(url);
  if (!safe) return null;
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(safe)) return safe;
  return new URL(safe, SITE_ROOT).href;
}

/** Absolute URL for meta tags (og:image, canonical). */
export function absoluteUrl(url) {
  const resolved = assetUrl(url);
  if (!resolved) return null;
  try { return new URL(resolved, location.href).href; } catch { return null; }
}

export function isExternal(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  try { return new URL(url).origin !== location.origin; } catch { return false; }
}

export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

export function formatMoney(amount, currency = 'AED') {
  if (amount === null || amount === undefined || amount === '') return '';
  const num = Number(amount);
  if (!Number.isFinite(num)) return '';
  const formatted = new Intl.NumberFormat('en', {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `${currency || ''} ${formatted}`.trim();
}

export const PERIOD_LABELS = {
  one_time: 'one-time',
  monthly: 'per month',
  quarterly: 'per quarter',
  yearly: 'per year',
  per_post: 'per post',
  per_hour: 'per hour',
  percentage: '',
  custom: '',
  fixed: '',
  starting_from: '',
  per_unit: 'per unit',
  quote: '',
};

/**
 * Turn a price row into display parts: { amount, period, note, minimum }.
 * Works for services, pricing_packages and addons.
 */
export function priceParts(row, periodKey = 'pricing_period') {
  const period = row[periodKey] || row.pricing_type || null;
  const currency = row.currency || 'AED';
  const price = row.price ?? row.starting_price ?? null;
  const parts = { amount: '', prefix: '', period: PERIOD_LABELS[period] || '', note: row.price_note || '', minimum: '' };

  if (period === 'quote') {
    parts.amount = 'On request';
  } else if (period === 'percentage') {
    parts.amount = price !== null && price !== undefined ? `${Number(price)}%` : '';
  } else if (price !== null && price !== undefined && price !== '') {
    parts.amount = formatMoney(price, currency);
    if (period === 'starting_from') parts.prefix = 'From';
  } else if (period === 'custom') {
    parts.amount = 'Custom';
  }
  if (row.minimum_price !== null && row.minimum_price !== undefined) {
    parts.minimum = `Minimum ${formatMoney(row.minimum_price, currency)}`;
  }
  return parts;
}

export function formatDate(value, withTime = false) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}

export function debounce(fn, wait = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function initials(text, max = 2) {
  return String(text || '')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w))
    .slice(0, max)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase())
    .join('');
}

export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Map a stored navigation/CTA target to a usable href on the current page. */
export function resolveLink(target, linkType = null, isHomePage = false) {
  if (!target) return null;
  if (linkType === 'section' || (!linkType && /^[a-z0-9_]+$/.test(target) && !target.includes('.'))) {
    const id = target.replace(/^#/, '');
    return isHomePage ? `#${id}` : new URL(`index.html#${id}`, SITE_ROOT).href;
  }
  const safe = safeUrl(target);
  if (!safe) return null;
  if (safe.startsWith('#')) {
    return isHomePage || document.getElementById(safe.slice(1)) ? safe : new URL(`index.html${safe}`, SITE_ROOT).href;
  }
  return assetUrl(safe);
}

/** Build an <a> with the correct rel/target for external links. */
export function link(href, attrs = {}, children = []) {
  const safe = href ? href : null;
  const extra = {};
  if (safe && isExternal(safe)) {
    extra.target = '_blank';
    extra.rel = 'noopener noreferrer';
  }
  return el('a', { ...extra, ...attrs, href: safe || '#' }, children);
}
