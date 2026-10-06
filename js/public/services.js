// Services: homepage cards and the service.html?slug=… details page.

import { listPublic, getPublicBySlug, adminList } from '../api.js';
import { el, assetUrl, getParam } from '../utils.js';
import { icon, hasIcon } from '../icons.js';
import { renderMarkdown, markdownToText } from '../markdown.js';
import { initSite, loadInto, emptyState, applySeo, skeletonCards, skeletonText, observeReveal } from '../main.js';
import { createSectionShell, ctaButton } from './sections.js';
import { priceBlock, loadPackages, packagesGrid, addonsGroups } from './pricing.js';
import { renderContactSection } from './contact.js';

function serviceHref(slug) {
  return `service.html?slug=${encodeURIComponent(slug)}`;
}

/** Price shown on a service card: the linked package if one exists, otherwise the service's own price. */
function servicePrice(service, packagesByService) {
  const pkg = (packagesByService.get(service.id) || [])[0];
  if (pkg) return priceBlock(pkg);
  if (service.starting_price !== null || service.pricing_type === 'quote' || service.pricing_type === 'custom') {
    return priceBlock({ ...service, price: service.starting_price }, { periodKey: 'pricing_type' });
  }
  return null;
}

export function serviceCard(service, index, packagesByService) {
  const price = servicePrice(service, packagesByService);
  const cover = assetUrl(service.cover_image_url);
  return el('article', { class: `card card--interactive service-card reveal${service.is_featured ? ' is-featured' : ''}` }, [
    cover ? el('div', { class: 'card__media' }, [el('img', { src: cover, alt: service.cover_image_alt || '', loading: 'lazy', decoding: 'async' })]) : null,
    el('div', { class: 'service-card__head' }, [
      el('span', { class: 'card__icon' }, [icon(hasIcon(service.icon) ? service.icon : 'layers', { size: 22 })]),
      el('span', { class: 'service-card__number', 'aria-hidden': 'true', text: String(index + 1).padStart(2, '0') }),
    ]),
    el('h3', { class: 'card__title' }, [el('a', { href: serviceHref(service.slug), text: service.name })]),
    service.short_description ? el('p', { class: 'card__text', text: service.short_description }) : null,
    el('div', { class: 'card__footer' }, [
      price,
      el('span', { class: 'card__link', 'aria-hidden': 'true' }, ['Learn more', icon('arrow-right', { size: 16 })]),
    ]),
  ]);
}

export async function renderServicesSection(body) {
  await loadInto(body, async () => {
    const [services, packages] = await Promise.all([
      listPublic('services'),
      listPublic('pricing_packages', { select: 'id, service_id, price, currency, pricing_period, price_note, minimum_price, original_price, display_order' }),
    ]);
    if (!services.length) return emptyState('Our services will be listed here soon.', 'Services coming soon', 'briefcase');
    const packagesByService = new Map();
    for (const p of packages) {
      if (!p.service_id) continue;
      if (!packagesByService.has(p.service_id)) packagesByService.set(p.service_id, []);
      packagesByService.get(p.service_id).push(p);
    }
    return el('div', { class: 'grid', style: { '--min': '270px' } }, services.map((s, i) => serviceCard(s, i, packagesByService)));
  }, { skeleton: () => skeletonCards(6) });
}

/* ------------------------------------------------------------------ */
/*  service.html                                                       */
/* ------------------------------------------------------------------ */

const KIND_TITLES = { feature: 'Features', benefit: 'Benefits', deliverable: 'Deliverables' };

function notFound(main) {
  applySeo({ title: 'Service not found' });
  main.replaceChildren(el('div', { class: 'container page-loading' }, [
    emptyState('This service does not exist or is no longer available.', 'Service not found', 'help'),
    el('p', { style: { textAlign: 'center' } }, [el('a', { class: 'btn', href: 'index.html#services' }, ['View all services'])]),
  ]));
}

async function initServicePage() {
  const main = document.getElementById('main');
  let ctx;
  try {
    ctx = { ...(await initSite({ isHome: false })), isHome: false };
  } catch (error) {
    main.replaceChildren(el('div', { class: 'container page-loading' }, [emptyState(error.message, 'Website not available', 'lock')]));
    return;
  }

  const slug = getParam('slug');
  if (!slug) { notFound(main); return; }

  const content = el('div', { class: 'container page-loading' });
  main.replaceChildren(content);

  await loadInto(content, async () => {
    const service = await getPublicBySlug('services', slug);
    if (!service) { notFound(main); return []; }

    applySeo({
      title: service.name,
      description: service.short_description || markdownToText(service.description, 160),
      image: service.cover_image_url || undefined,
      keepQuery: true,
    });

    const [features, pkgData, addons, sections] = await Promise.all([
      adminList('service_features', { eq: { service_id: service.id } }),
      loadPackages({ serviceId: service.id }),
      listPublic('addons', { eq: { service_id: service.id } }),
      listPublic('sections').catch(() => []),
    ]);

    const hero = el('header', { class: 'page-hero' }, [
      el('div', { class: 'container page-hero__inner' }, [
        el('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' }, [
          el('ol', {}, [
            el('li', {}, [el('a', { href: 'index.html', text: 'Home' })]),
            el('li', {}, [el('a', { href: 'index.html#services', text: 'Services' })]),
            el('li', { 'aria-current': 'page', text: service.name }),
          ]),
        ]),
        el('h1', { text: service.name }),
        service.short_description ? el('p', { class: 'lead', text: service.short_description }) : null,
      ]),
    ]);

    const article = el('article', {});
    const cover = assetUrl(service.cover_image_url);
    if (cover) article.appendChild(el('figure', { class: 'detail__cover' }, [el('img', { src: cover, alt: service.cover_image_alt || '' })]));
    if (service.description) {
      article.appendChild(el('div', { class: 'detail__block prose' }, [renderMarkdown(service.description, { headingStart: 2 })]));
    }

    const kinds = ['feature', 'benefit', 'deliverable'];
    for (const kind of kinds) {
      const items = features.filter((f) => f.kind === kind);
      if (!items.length) continue;
      article.appendChild(el('section', { class: 'detail__block kind-group', 'aria-label': KIND_TITLES[kind] }, [
        el('h2', { text: KIND_TITLES[kind] }),
        el('ul', { class: 'feature-list', role: 'list' }, items.map((f) => el('li', {}, [
          icon('check', { size: 16 }),
          el('span', {}, [f.title, f.description ? el('span', { class: 'feature__meta', text: f.description }) : null]),
        ]))),
      ]));
    }

    if (pkgData.packages.length) {
      article.appendChild(el('section', { class: 'detail__block' }, [
        el('h2', { text: 'Pricing' }),
        packagesGrid(pkgData.packages, pkgData.featuresByPackage),
      ]));
    }
    if (addons.length) {
      article.appendChild(el('section', { class: 'detail__block' }, [
        el('h2', { text: 'Options' }),
        ...addonsGroups(addons),
      ]));
    }

    const aside = el('aside', { class: 'detail__aside', 'aria-label': 'Get started' }, [
      el('div', { class: 'card' }, [
        el('span', { class: 'card__icon' }, [icon(hasIcon(service.icon) ? service.icon : 'layers', { size: 22 })]),
        el('h2', { class: 'card__title', text: service.name }),
        pkgData.packages[0] ? priceBlock(pkgData.packages[0]) : (service.starting_price !== null ? priceBlock({ ...service, price: service.starting_price }, { periodKey: 'pricing_type' }) : null),
        service.price_note && !pkgData.packages[0] ? el('p', { class: 'card__text', text: service.price_note }) : null,
        ctaButton(service.cta_label || 'Contact us', service.cta_url || '#contact', { variant: 'accent', interest: service.name }),
      ]),
    ]);

    const body = el('section', { class: 'section' }, [
      el('div', { class: 'container detail' }, [article, aside]),
    ]);

    main.replaceChildren(hero, body);
    observeReveal(main);

    const contactSection = sections.find((s) => s.key === 'contact');
    if (contactSection) {
      const shell = createSectionShell(contactSection);
      main.appendChild(shell.element);
      await renderContactSection(shell.body, contactSection, ctx, { interest: service.name });
    }
    return [];
  }, { skeleton: () => skeletonText(8) });
}

if (document.body.dataset.page === 'service') initServicePage();
