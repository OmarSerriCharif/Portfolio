// Case studies: homepage cards and the case-study.html?slug=… details page.

import { listPublic, getPublicBySlug, adminList } from '../api.js';
import { el, assetUrl, getParam, initials, safeUrl, link } from '../utils.js';
import { icon } from '../icons.js';
import { renderMarkdown, markdownToText } from '../markdown.js';
import { initSite, loadInto, emptyState, applySeo, skeletonCards, skeletonText, observeReveal } from '../main.js';
import { ctaButton } from './sections.js';

function caseHref(slug) {
  return `case-study.html?slug=${encodeURIComponent(slug)}`;
}

/** Short label for projects without a cover image: "LIVEX 2026" → "LIVEX", "Abu Dhabi Book Fair 2026" → "ADBF". */
function monogram(text) {
  const words = String(text || '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/\d/.test(w));
  if (!words.length) return initials(text, 3);
  if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
  return words.slice(0, 4).map((w) => w.charAt(0).toUpperCase()).join('');
}

function results(cs) {
  return (Array.isArray(cs.results) ? cs.results : []).filter((r) => r && (r.value || r.label));
}

export function caseStudyCard(cs, industryName) {
  const cover = assetUrl(cs.cover_image_url);
  const res = results(cs).slice(0, 2);
  const client = cs.client_name && cs.client_name !== cs.title ? cs.client_name : null;
  return el('article', { class: 'card card--interactive case-card reveal' }, [
    el('div', { class: 'card__media' }, [
      cover
        ? el('img', { src: cover, alt: cs.cover_image_alt || '', loading: 'lazy', decoding: 'async' })
        : el('div', { class: 'monogram', 'aria-hidden': 'true', text: monogram(cs.title) }),
    ]),
    (client || industryName)
      ? el('p', { class: 'case-card__meta' }, [
          client ? el('span', { text: client }) : null,
          client && industryName ? el('span', { 'aria-hidden': 'true', text: '·' }) : null,
          industryName ? el('span', { text: industryName }) : null,
        ])
      : null,
    el('h3', { class: 'card__title' }, [el('a', { href: caseHref(cs.slug), text: cs.title })]),
    cs.short_description ? el('p', { class: 'card__text', text: cs.short_description }) : null,
    res.length ? el('ul', { class: 'case-card__results', role: 'list' }, res.map((r) => el('li', {}, [
      el('strong', { text: r.value || '' }), el('span', { text: r.label || '' }),
    ]))) : null,
    el('div', { class: 'card__footer' }, [
      el('span', { class: 'card__link', 'aria-hidden': 'true' }, ['View project', icon('arrow-right', { size: 16 })]),
    ]),
  ]);
}

export async function renderCaseStudiesSection(body) {
  await loadInto(body, async () => {
    const [studies, industries] = await Promise.all([
      listPublic('case_studies', { select: 'id, title, slug, short_description, cover_image_url, cover_image_alt, client_name, industry_id, results, is_featured, display_order' }),
      listPublic('industries', { select: 'id, name' }).catch(() => []),
    ]);
    if (!studies.length) return emptyState('Our latest work will be showcased here soon.', 'Portfolio coming soon', 'image');
    const names = new Map(industries.map((i) => [i.id, i.name]));
    // Featured projects first, then display order.
    const sorted = [...studies].sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.display_order - b.display_order);
    return el('div', { class: 'grid', style: { '--min': '280px' } }, sorted.map((cs) => caseStudyCard(cs, names.get(cs.industry_id))));
  }, { skeleton: () => skeletonCards(3) });
}

/* ------------------------------------------------------------------ */
/*  case-study.html                                                    */
/* ------------------------------------------------------------------ */

function notFound(main) {
  applySeo({ title: 'Project not found' });
  main.replaceChildren(el('div', { class: 'container page-loading' }, [
    emptyState('This project does not exist or is no longer available.', 'Project not found', 'help'),
    el('p', { style: { textAlign: 'center' } }, [el('a', { class: 'btn', href: 'index.html#case_studies' }, ['View all work'])]),
  ]));
}

async function initCaseStudyPage() {
  const main = document.getElementById('main');
  try {
    await initSite({ isHome: false });
  } catch (error) {
    main.replaceChildren(el('div', { class: 'container page-loading' }, [emptyState(error.message, 'Website not available', 'lock')]));
    return;
  }

  const slug = getParam('slug');
  if (!slug) { notFound(main); return; }

  const content = el('div', { class: 'container page-loading' });
  main.replaceChildren(content);

  await loadInto(content, async () => {
    const cs = await getPublicBySlug('case_studies', slug);
    if (!cs) { notFound(main); return []; }

    applySeo({
      title: cs.title,
      description: cs.short_description || markdownToText(cs.content, 160),
      image: cs.cover_image_url || undefined,
      type: 'article',
      keepQuery: true,
    });

    const [images, serviceLinks, industries] = await Promise.all([
      adminList('case_study_images', { eq: { case_study_id: cs.id } }),
      adminList('case_study_services', { select: 'service_id, services(name, slug)', eq: { case_study_id: cs.id }, order: null }),
      cs.industry_id ? listPublic('industries', { select: 'id, name', eq: { id: cs.industry_id } }).catch(() => []) : Promise.resolve([]),
    ]);
    const services = serviceLinks.map((l) => l.services).filter(Boolean);
    const industry = industries[0]?.name;

    const hero = el('header', { class: 'page-hero' }, [
      el('div', { class: 'container page-hero__inner' }, [
        el('nav', { class: 'breadcrumb', 'aria-label': 'Breadcrumb' }, [
          el('ol', {}, [
            el('li', {}, [el('a', { href: 'index.html', text: 'Home' })]),
            el('li', {}, [el('a', { href: 'index.html#case_studies', text: 'Work' })]),
            el('li', { 'aria-current': 'page', text: cs.title }),
          ]),
        ]),
        cs.client_name ? el('span', { class: 'eyebrow', text: cs.client_name }) : null,
        el('h1', { text: cs.title }),
        cs.short_description ? el('p', { class: 'lead', text: cs.short_description }) : null,
      ]),
    ]);

    const article = el('article', {});
    const cover = assetUrl(cs.cover_image_url);
    if (cover) article.appendChild(el('figure', { class: 'detail__cover' }, [el('img', { src: cover, alt: cs.cover_image_alt || '' })]));

    const res = results(cs);
    if (res.length) {
      article.appendChild(el('section', { class: 'detail__block', 'aria-labelledby': 'results-title' }, [
        el('h2', { id: 'results-title', text: 'Results' }),
        el('ul', { class: 'results-list', role: 'list' }, res.map((r) => el('li', { class: 'reveal' }, [
          el('strong', { text: r.value || '' }), el('span', { text: r.label || '' }),
        ]))),
      ]));
    }

    if (cs.content) {
      article.appendChild(el('div', { class: 'detail__block prose' }, [renderMarkdown(cs.content, { headingStart: 2 })]));
    }

    const gallery = images.filter((img) => assetUrl(img.image_url));
    if (gallery.length) {
      article.appendChild(el('section', { class: 'detail__block', 'aria-labelledby': 'gallery-title' }, [
        el('h2', { id: 'gallery-title', text: 'Gallery' }),
        el('ul', { class: 'gallery', role: 'list' }, gallery.map((img) => el('li', { class: 'reveal' }, [
          el('figure', {}, [
            el('img', { src: assetUrl(img.image_url), alt: img.alt_text || '', loading: 'lazy', decoding: 'async' }),
            img.caption ? el('figcaption', { text: img.caption }) : null,
          ]),
        ]))),
      ]));
    }

    const meta = el('dl', { class: 'meta-list' });
    const addMeta = (term, value) => {
      if (!value || (Array.isArray(value) && !value.length)) return;
      meta.appendChild(el('dt', { text: term }));
      meta.appendChild(el('dd', {}, [value]));
    };
    addMeta('Client', cs.client_name);
    addMeta('Industry', industry);
    if (services.length) {
      addMeta('Services', el('ul', { class: 'chip-list', role: 'list' }, services.map((s) => el('li', {}, [
        el('a', { class: 'chip', href: `service.html?slug=${encodeURIComponent(s.slug)}`, text: s.name }),
      ]))));
    }
    if (Array.isArray(cs.platforms) && cs.platforms.length) {
      addMeta('Platforms', el('ul', { class: 'chip-list', role: 'list' }, cs.platforms.map((p) => el('li', { class: 'chip', text: p }))));
    }
    const live = safeUrl(cs.live_url);
    if (live) addMeta('Live', link(assetUrl(live), {}, ['Visit project ', icon('external', { size: 14 })]));

    const aside = el('aside', { class: 'detail__aside', 'aria-label': 'Project details' }, [
      meta.children.length ? el('div', { class: 'card' }, [meta]) : null,
      el('div', { class: 'card' }, [
        el('h2', { class: 'card__title', text: 'Have a similar project?' }),
        ctaButton('Contact us', 'index.html#contact', { variant: 'accent', interest: services[0]?.name || null }),
      ]),
    ]);

    main.replaceChildren(hero, el('section', { class: 'section' }, [el('div', { class: 'container detail' }, [article, aside])]));
    observeReveal(main);
    return [];
  }, { skeleton: () => skeletonText(8) });
}

if (document.body.dataset.page === 'case-study') initCaseStudyPage();
