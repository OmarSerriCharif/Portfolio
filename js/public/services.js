// Services: homepage cards and the service.html?slug=… details page.

import { listPublic, getPublicBySlug, adminList } from '../api.js';
import { el, assetUrl, getParam } from '../utils.js';
import { icon, hasIcon } from '../icons.js';
import { renderMarkdown, markdownToText } from '../markdown.js';
import { initSite, loadInto, emptyState, applySeo, skeletonCards, skeletonText, observeReveal } from '../main.js';
import { createSectionShell, ctaButton } from './sections.js';
import { renderContactSection } from './contact.js';

function serviceHref(slug) {
  return `service.html?slug=${encodeURIComponent(slug)}`;
}

// Prices are shown only in the pricing list (homepage section and pricing.html), not on service cards or pages.
export function serviceCard(service, index) {
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
      el('span', { class: 'card__link', 'aria-hidden': 'true' }, ['Learn more', icon('arrow-right', { size: 16 })]),
    ]),
  ]);
}

export async function renderServicesSection(body) {
  await loadInto(body, async () => {
    const services = await listPublic('services');
    if (!services.length) return emptyState('Our services will be listed here soon.', 'Services coming soon', 'briefcase');
    return el('div', { class: 'grid', style: { '--min': '270px' } }, services.map((s, i) => serviceCard(s, i)));
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

    const [features, sections] = await Promise.all([
      adminList('service_features', { eq: { service_id: service.id } }),
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

    const aside = el('aside', { class: 'detail__aside', 'aria-label': 'Get started' }, [
      el('div', { class: 'card' }, [
        el('span', { class: 'card__icon' }, [icon(hasIcon(service.icon) ? service.icon : 'layers', { size: 22 })]),
        el('h2', { class: 'card__title', text: service.name }),
        ctaButton(service.cta_label || 'Contact us', service.cta_url || '#contact', { interest: service.name }),
        ctaButton('View prices', 'pricing.html', { variant: 'outline' }),
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
