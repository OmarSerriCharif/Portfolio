// Pricing packages, package features and add-ons (homepage sections + pricing.html).

import { listPublic, adminList } from '../api.js';
import { el, priceParts, formatMoney, assetUrl } from '../utils.js';
import { icon, hasIcon } from '../icons.js';
import { renderMarkdown } from '../markdown.js';
import { initSite, loadInto, emptyState, applySeo, skeletonCards } from '../main.js';
import { createSectionShell, ctaButton, renderFaqs } from './sections.js';
import { renderContactSection } from './contact.js';

/** Price block for packages, add-ons or services. */
export function priceBlock(row, { periodKey = 'pricing_period', idPrefix = '' } = {}) {
  const parts = priceParts(row, periodKey);
  if (!parts.amount) return null;
  const wrap = el('div', { class: 'price', id: idPrefix ? `${idPrefix}-price` : null });
  if (parts.prefix) wrap.appendChild(el('span', { class: 'price__prefix', text: parts.prefix }));
  if (row.original_price !== null && row.original_price !== undefined && Number(row.original_price) > Number(row.price ?? 0)) {
    wrap.appendChild(el('span', { class: 'price__original' }, [
      el('span', { class: 'sr-only', text: 'Regular price ' }),
      formatMoney(row.original_price, row.currency),
    ]));
    wrap.appendChild(el('span', { class: 'sr-only', text: 'Now ' }));
  }
  wrap.appendChild(el('span', { class: 'price__amount', text: parts.amount }));
  if (parts.period) wrap.appendChild(el('span', { class: 'price__period', text: parts.period }));
  if (parts.note) wrap.appendChild(el('span', { class: 'price__note', text: parts.note }));
  if (parts.minimum) wrap.appendChild(el('span', { class: 'price__minimum', text: parts.minimum }));
  return wrap;
}

export function featureList(features) {
  if (!features.length) return null;
  return el('ul', { class: 'feature-list', role: 'list' }, features.map((f) => {
    const included = f.is_included !== false;
    const meta = [f.quantity, f.limitation].filter(Boolean).join(' · ');
    return el('li', { class: included ? '' : 'is-excluded' }, [
      icon(included ? 'check' : 'x', { size: 16 }),
      el('span', {}, [
        el('span', { class: 'sr-only', text: included ? 'Included: ' : 'Not included: ' }),
        f.name,
        f.description ? el('span', { class: 'feature__meta', text: f.description }) : null,
        meta ? el('span', { class: 'feature__meta', text: meta }) : null,
      ]),
    ]);
  }));
}

export function packageCard(pkg, features, { isHome = false } = {}) {
  const id = `package-${pkg.slug}`;
  const badges = [];
  if (pkg.is_popular) badges.push(el('span', { class: 'badge badge--accent' }, [icon('star', { size: 12 }), pkg.badge || 'Most popular']));
  else if (pkg.badge) badges.push(el('span', { class: 'badge badge--primary', text: pkg.badge }));
  if (pkg.discount_label) badges.push(el('span', { class: 'badge badge--success', text: pkg.discount_label }));

  const image = assetUrl(pkg.image_url);
  return el('article', {
    class: ['card', 'price-card', 'reveal', pkg.is_popular && 'is-popular', pkg.is_featured && 'is-featured'].filter(Boolean).join(' '),
    'aria-labelledby': `${id}-name`,
  }, [
    image ? el('div', { class: 'card__media' }, [el('img', { src: image, alt: '', loading: 'lazy' })]) : null,
    el('div', { class: 'price-card__header' }, [
      badges.length ? el('div', { class: 'price-card__badges' }, badges) : null,
      el('h3', { class: 'price-card__name', id: `${id}-name`, text: pkg.name }),
      pkg.short_description ? el('p', { class: 'price-card__desc', text: pkg.short_description }) : null,
    ]),
    priceBlock(pkg, { idPrefix: id }),
    pkg.description ? el('div', { class: 'prose card__text' }, [renderMarkdown(pkg.description, { headingStart: 4 })]) : null,
    features.length ? el('h4', { class: 'sr-only', text: `What’s included in ${pkg.name}` }) : null,
    featureList(features),
    ctaButton(pkg.cta_label, pkg.cta_url, {
      variant: pkg.is_popular ? 'accent' : '',
      isHome,
      interest: pkg.name,
    }),
  ]);
}

export function addonCard(addon, { isHome = false } = {}) {
  const image = assetUrl(addon.image_url);
  return el('article', { class: 'card price-card addon-card reveal', 'aria-labelledby': `addon-${addon.slug}` }, [
    image
      ? el('div', { class: 'card__media' }, [el('img', { src: image, alt: '', loading: 'lazy' })])
      : (addon.icon && hasIcon(addon.icon) ? el('span', { class: 'card__icon' }, [icon(addon.icon, { size: 22 })]) : null),
    el('h3', { class: 'price-card__name', id: `addon-${addon.slug}`, text: addon.name }),
    priceBlock(addon, { periodKey: 'pricing_type' }),
    addon.quantity ? el('p', { class: 'badge badge--muted', text: addon.quantity }) : null,
    addon.description ? el('div', { class: 'prose card__text' }, [renderMarkdown(addon.description, { headingStart: 4 })]) : null,
    ctaButton(addon.cta_label, addon.cta_url, { variant: 'outline', isHome, interest: addon.group_label ? `${addon.group_label}: ${addon.name}` : addon.name }),
  ]);
}

/** Load published packages (optionally for one service) and their features. */
export async function loadPackages({ serviceId = null } = {}) {
  const packages = await listPublic('pricing_packages', { eq: serviceId ? { service_id: serviceId } : {} });
  if (!packages.length) return { packages, featuresByPackage: new Map() };
  const features = await adminList('package_features', {
    filters: (q) => q.in('package_id', packages.map((p) => p.id)),
  });
  const featuresByPackage = new Map();
  for (const f of features) {
    if (!featuresByPackage.has(f.package_id)) featuresByPackage.set(f.package_id, []);
    featuresByPackage.get(f.package_id).push(f);
  }
  return { packages, featuresByPackage };
}

export function packagesGrid(packages, featuresByPackage, opts = {}) {
  return el('div', { class: 'pricing-grid', role: 'list', 'aria-label': 'Pricing packages' }, packages.map((p) => {
    const card = packageCard(p, featuresByPackage.get(p.id) || [], opts);
    card.setAttribute('role', 'listitem');
    return card;
  }));
}

export function addonsGroups(addons, opts = {}) {
  const groups = new Map();
  for (const a of addons) {
    const key = a.group_label || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
  }
  const showTitles = groups.size > 1 || opts.showSingleTitle;
  return [...groups.entries()].map(([label, items]) => el('div', { class: 'addon-group' }, [
    showTitles && label ? el('h3', { class: 'addon-group__title', text: label }) : null,
    el('div', { class: 'pricing-grid' }, items.map((a) => addonCard(a, opts))),
  ]));
}

export async function renderPricingSection(body, section, ctx) {
  await loadInto(body, async () => {
    const { packages, featuresByPackage } = await loadPackages();
    if (!packages.length) return emptyState('Pricing will be published here soon.', 'Pricing coming soon', 'tag');
    return packagesGrid(packages, featuresByPackage, { isHome: ctx.isHome });
  }, { skeleton: () => skeletonCards(4) });
}

export async function renderAddonsSection(body, section, ctx, { serviceId = null } = {}) {
  await loadInto(body, async () => {
    const addons = await listPublic('addons', { eq: serviceId ? { service_id: serviceId } : {} });
    if (!addons.length) return emptyState('Optional add-ons will be listed here soon.', 'No add-ons yet', 'plus');
    return addonsGroups(addons, { isHome: ctx.isHome });
  }, { skeleton: () => skeletonCards(3) });
}

/* ------------------------------------------------------------------ */
/*  pricing.html                                                       */
/* ------------------------------------------------------------------ */

async function initPricingPage() {
  const main = document.getElementById('main');
  let ctx;
  try {
    ctx = { ...(await initSite({ isHome: false })), isHome: false };
  } catch (error) {
    main.replaceChildren(el('div', { class: 'container page-loading' }, [emptyState(error.message, 'Website not available', 'lock')]));
    return;
  }

  const sections = await listPublic('sections').catch(() => []);
  const byKey = new Map(sections.map((s) => [s.key, s]));
  const pricing = byKey.get('pricing') || { key: 'pricing' };

  applySeo({ title: pricing.title || 'Pricing', description: pricing.subtitle || undefined });

  const pageHero = el('header', { class: 'page-hero' }, [
    el('div', { class: 'container page-hero__inner' }, [
      el('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' }, [
        el('ol', {}, [
          el('li', {}, [el('a', { href: 'index.html', text: 'Home' })]),
          el('li', { 'aria-current': 'page', text: pricing.title || 'Pricing' }),
        ]),
      ]),
      pricing.eyebrow ? el('span', { class: 'eyebrow', text: pricing.eyebrow }) : null,
      el('h1', { text: pricing.title || 'Pricing' }),
      pricing.subtitle ? el('p', { class: 'lead', text: pricing.subtitle }) : null,
    ]),
  ]);

  const packagesSection = el('section', { class: 'section', 'aria-labelledby': 'packages-title' }, [
    el('div', { class: 'container' }, [el('h2', { class: 'sr-only', id: 'packages-title', text: pricing.title || 'Packages' })]),
  ]);
  const packagesBody = el('div');
  packagesSection.firstChild.appendChild(packagesBody);

  main.replaceChildren(pageHero, packagesSection);

  const tasks = [renderPricingSection(packagesBody, pricing, ctx)];

  const addonsSection = byKey.get('addons');
  if (addonsSection) {
    const shell = createSectionShell(addonsSection);
    main.appendChild(shell.element);
    tasks.push(renderAddonsSection(shell.body, addonsSection, ctx));
  }
  const faqSection = byKey.get('faqs');
  if (faqSection) {
    const shell = createSectionShell(faqSection, { center: true });
    main.appendChild(shell.element);
    tasks.push(renderFaqs(shell.body));
  }
  const contactSection = byKey.get('contact');
  if (contactSection) {
    const shell = createSectionShell(contactSection);
    main.appendChild(shell.element);
    tasks.push(renderContactSection(shell.body, contactSection, ctx));
  }
  await Promise.all(tasks);
}

if (document.body.dataset.page === 'pricing') initPricingPage();
