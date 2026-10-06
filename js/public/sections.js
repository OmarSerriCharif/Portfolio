// Renderers for the generic homepage sections. Every renderer builds DOM nodes from database rows
// with textContent / createElement only — no HTML strings.

import { listPublic, getSingleton } from '../api.js';
import { el, assetUrl, resolveLink, link, initials, safeUrl } from '../utils.js';
import { icon, hasIcon, socialIcon } from '../icons.js';
import { renderMarkdown } from '../markdown.js';
import { loadInto, sectionHeader, skeletonText, emptyState } from '../main.js';

/** Create the <section> wrapper for a sections row. Returns { element, body }. */
export function createSectionShell(section, { center = false } = {}) {
  const headingId = `${section.key}-title`;
  const element = el('section', {
    id: section.key,
    class: `section section--${section.key.replace(/_/g, '-')}`,
    'aria-labelledby': section.title ? headingId : null,
    'aria-label': section.title ? null : section.key.replace(/_/g, ' '),
  });
  const container = el('div', { class: 'container' });
  const header = sectionHeader(section, { center, headingId });
  const body = el('div', { class: 'section__body' });
  if (header) container.appendChild(header);
  container.appendChild(body);
  element.appendChild(container);
  return { element, body };
}

/** CTA anchor. `interest` pre-selects the service in the contact form. */
export function ctaButton(label, url, { variant = '', isHome = false, interest = null, size = '' } = {}) {
  const href = resolveLink(url, null, isHome);
  if (!label || !href) return null;
  return link(href, {
    class: ['btn', variant && `btn--${variant}`, size && `btn--${size}`].filter(Boolean).join(' '),
    'data-interest': interest || null,
  }, [label, icon('arrow-right', { size: 16 })]);
}

function imageEl(url, alt, attrs = {}) {
  const src = assetUrl(url);
  if (!src) return null;
  return el('img', { src, alt: alt || '', loading: 'lazy', decoding: 'async', ...attrs });
}

function iconBadge(name) {
  return el('span', { class: 'card__icon' }, [icon(hasIcon(name) ? name : 'check', { size: 22 })]);
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export async function renderHero(element, ctx) {
  const container = el('div', { class: 'container' });
  element.appendChild(container);
  await loadInto(container, async () => {
    const hero = await getSingleton('hero');
    if (!hero) return emptyState('Add your hero content from the dashboard.', 'Welcome');

    const elements = Array.isArray(hero.elements) && hero.elements.length
      ? hero.elements
      : ['badge', 'headline', 'subheadline', 'description', 'ctas', 'stat', 'trust'].map((key) => ({ key, visible: true }));

    const content = el('div', { class: 'hero__content' });
    let hasH1 = false;
    for (const item of elements) {
      if (!item || item.visible === false) continue;
      let node = null;
      switch (item.key) {
        case 'badge':
          if (hero.badge) node = el('span', { class: 'hero__badge', text: hero.badge });
          break;
        case 'headline':
          if (hero.headline) { node = el('h1', { class: 'hero__title', text: hero.headline }); hasH1 = true; }
          break;
        case 'subheadline':
          if (hero.subheadline) node = el('p', { class: 'hero__subtitle', text: hero.subheadline });
          break;
        case 'description':
          if (hero.description) node = el('p', { class: 'hero__description', text: hero.description });
          break;
        case 'ctas': {
          const primary = ctaButton(hero.primary_cta_label, hero.primary_cta_url, { variant: 'accent', isHome: ctx.isHome });
          const secondary = ctaButton(hero.secondary_cta_label, hero.secondary_cta_url, { variant: 'outline', isHome: ctx.isHome });
          if (primary || secondary) node = el('div', { class: 'hero__ctas' }, [primary, secondary]);
          break;
        }
        case 'stat':
          if (hero.stat_value) {
            node = el('p', { class: 'hero__stat' }, [
              el('span', { class: 'hero__stat-value', text: hero.stat_value }),
              hero.stat_label ? el('span', { class: 'hero__stat-label', text: hero.stat_label }) : null,
            ]);
          }
          break;
        case 'trust':
          if (hero.trust_statement) node = el('p', { class: 'hero__trust' }, [icon('award', { size: 18 }), hero.trust_statement]);
          break;
        default:
          break;
      }
      if (node) content.appendChild(node);
    }
    // Keep a single h1 for accessibility even if the headline element is hidden.
    if (!hasH1 && ctx.settings?.company_name) {
      content.prepend(el('h1', { class: 'sr-only', text: ctx.settings.company_name }));
    }

    let media = null;
    const mediaUrl = assetUrl(hero.media_url);
    if (hero.media_type === 'image' && mediaUrl) {
      media = el('div', { class: 'hero__media' }, [
        el('img', { src: mediaUrl, alt: hero.media_alt || '', fetchpriority: 'high', decoding: 'async', width: 800, height: 900 }),
      ]);
    } else if (hero.media_type === 'video' && mediaUrl) {
      const poster = assetUrl(hero.media_poster_url);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      media = el('div', { class: 'hero__media' }, [
        el('video', {
          src: mediaUrl,
          poster,
          muted: true,
          loop: true,
          playsinline: true,
          autoplay: !reduced,
          controls: reduced,
          'aria-label': hero.media_alt || null,
        }),
      ]);
      const video = media.querySelector('video');
      video.muted = true;
    }

    return el('div', { class: `hero${media ? '' : ' hero--no-media'}` }, [content, media]);
  }, { skeleton: () => skeletonText(5) });
}

/* ------------------------------------------------------------------ */
/*  About + statistics + values                                        */
/* ------------------------------------------------------------------ */

export async function renderAbout(body) {
  await loadInto(body, async () => {
    const [about, stats, values] = await Promise.all([
      getSingleton('about'),
      listPublic('statistics'),
      listPublic('company_values'),
    ]);
    if (!about && !stats.length && !values.length) return emptyState('Company information will appear here soon.');

    const text = el('div', { class: 'reveal' });
    if (about?.body) text.appendChild(el('div', { class: 'prose' }, [renderMarkdown(about.body, { headingStart: 3 })]));

    const statements = [];
    if (about?.mission) statements.push(el('div', { class: 'statement' }, [el('h3', { text: 'Mission' }), el('p', { text: about.mission })]));
    if (about?.vision) statements.push(el('div', { class: 'statement' }, [el('h3', { text: 'Vision' }), el('p', { text: about.vision })]));
    if (statements.length) text.appendChild(el('div', { class: 'about__statements' }, statements));

    if (values.length) {
      text.appendChild(el('ul', { class: 'values', role: 'list', 'aria-label': 'Our values' }, values.map((v) => el('li', {}, [
        iconBadge(v.icon),
        el('div', {}, [el('h3', { text: v.title }), v.description ? el('p', { class: 'muted', text: v.description }) : null]),
      ]))));
    }

    const image = about ? imageEl(about.image_url, about.image_alt) : null;
    const wrapper = el('div', { class: `about${image ? '' : ' about--no-media'}` }, [
      text,
      image ? el('div', { class: 'about__media reveal' }, [image]) : null,
    ]);

    const statsList = stats.length
      ? el('ul', { class: 'stats', role: 'list' }, stats.map((s) => el('li', { class: 'stat reveal' }, [
          el('span', { class: 'stat__value', text: s.value }),
          el('span', { class: 'stat__label', text: s.label }),
          s.description ? el('span', { class: 'stat__desc', text: s.description }) : null,
        ])))
      : null;

    return [wrapper, statsList];
  }, { skeleton: () => skeletonText(6) });
}

/* ------------------------------------------------------------------ */
/*  Card-grid sections                                                 */
/* ------------------------------------------------------------------ */

function featureCard({ title, description, iconName, imageUrl, imageAlt, extraClass = '', number = null }) {
  return el('article', { class: `card feature-card reveal ${extraClass}`.trim() }, [
    number !== null ? el('span', { class: 'process-step__number', 'aria-hidden': 'true', text: String(number) }) : null,
    imageUrl ? imageEl(imageUrl, imageAlt, { class: 'feature-card__image' }) : (iconName !== false ? iconBadge(iconName) : null),
    el('h3', { class: 'card__title' }, [number !== null ? el('span', { class: 'sr-only', text: `Step ${number}: ` }) : null, title]),
    description ? el('p', { class: 'card__text', text: description }) : null,
  ]);
}

export async function renderWhyChooseUs(body) {
  await loadInto(body, async () => {
    const items = await listPublic('why_choose_us');
    if (!items.length) return emptyState('Our advantages will be listed here soon.');
    return el('div', { class: 'grid', style: { '--min': '240px' } }, items.map((i) => featureCard({
      title: i.title, description: i.description, iconName: i.icon, imageUrl: i.image_url, imageAlt: '',
    })));
  });
}

export async function renderIndustries(body) {
  await loadInto(body, async () => {
    const items = await listPublic('industries');
    if (!items.length) return emptyState('Industries we serve will be listed here soon.');
    return el('div', { class: 'grid', style: { '--min': '240px' } }, items.map((i) => featureCard({
      title: i.name, description: i.description, iconName: i.icon, imageUrl: i.image_url, imageAlt: i.image_alt,
    })));
  });
}

export async function renderProcess(body) {
  await loadInto(body, async () => {
    const steps = await listPublic('process_steps');
    if (!steps.length) return emptyState('Our process will be described here soon.');
    return el('ol', { class: 'grid process', role: 'list', style: { '--min': '220px' } }, steps.map((s, index) => el('li', {}, [
      featureCard({
        title: s.title,
        description: s.description,
        iconName: s.icon || false,
        imageUrl: s.image_url,
        imageAlt: '',
        extraClass: 'process-step',
        number: s.step_number || index + 1,
      }),
    ])));
  });
}

export async function renderClients(body) {
  await loadInto(body, async () => {
    const clients = await listPublic('clients');
    if (!clients.length) return emptyState('Clients will be listed here soon.');
    return el('ul', { class: 'clients reveal', role: 'list' }, clients.map((c) => {
      const logo = imageEl(c.logo_url, c.name);
      const href = safeUrl(c.website_url);
      const inner = logo || c.name;
      return el('li', { class: `client${logo ? ' client--logo' : ''}` }, [
        href ? link(assetUrl(href), {}, [inner]) : inner,
      ]);
    }));
  }, { skeleton: () => skeletonText(6) });
}

function stars(rating) {
  const wrap = el('span', { class: 'stars', role: 'img', 'aria-label': `Rated ${rating} out of 5` });
  for (let i = 1; i <= 5; i += 1) {
    const star = icon('star', { size: 16, className: `icon${i > rating ? ' icon--empty' : ''}` });
    wrap.appendChild(star);
  }
  return wrap;
}

function avatar(photoUrl, name) {
  const src = assetUrl(photoUrl);
  return el('span', { class: 'avatar' }, [
    src ? el('img', { src, alt: '', loading: 'lazy', decoding: 'async' }) : el('span', { 'aria-hidden': 'true', text: initials(name) }),
  ]);
}

export async function renderTestimonials(body) {
  await loadInto(body, async () => {
    const items = await listPublic('testimonials');
    if (!items.length) return emptyState('Client testimonials will appear here soon.', 'No testimonials yet', 'message');
    return el('div', { class: 'grid', style: { '--min': '300px' } }, items.map((t) => el('figure', { class: 'card testimonial reveal' }, [
      t.rating ? stars(t.rating) : null,
      el('blockquote', { class: 'testimonial__quote' }, [el('p', { text: t.quote })]),
      el('figcaption', { class: 'testimonial__author' }, [
        avatar(t.photo_url, t.client_name),
        el('span', {}, [
          el('cite', { class: 'testimonial__name', text: t.client_name }),
          (t.role || t.company) ? el('span', { class: 'testimonial__role', text: [t.role, t.company].filter(Boolean).join(', ') }) : null,
        ]),
      ]),
    ])));
  });
}

export async function renderTeam(body) {
  await loadInto(body, async () => {
    const members = await listPublic('team_members');
    if (!members.length) return emptyState('Team members will be introduced here soon.', 'Meet the team soon', 'users');
    return el('div', { class: 'grid', style: { '--min': '240px' } }, members.map((m) => {
      const socials = (Array.isArray(m.social_links) ? m.social_links : []).filter((s) => s && safeUrl(s.url));
      return el('article', { class: 'card team-card reveal' }, [
        avatar(m.photo_url, m.name),
        el('h3', { class: 'card__title', text: m.name }),
        m.job_title ? el('p', { class: 'team-card__role', text: m.job_title }) : null,
        m.bio ? el('p', { class: 'card__text', text: m.bio }) : null,
        socials.length ? el('ul', { class: 'social-list', role: 'list' }, socials.map((s) => el('li', {}, [
          link(safeUrl(s.url), { class: 'icon-btn icon-btn--sm', 'aria-label': `${m.name} on ${s.platform}` }, [socialIcon(s.platform, { size: 16 })]),
        ]))) : null,
      ]);
    }));
  });
}

/* ------------------------------------------------------------------ */
/*  FAQ accordion                                                      */
/* ------------------------------------------------------------------ */

export function faqAccordion(faqs) {
  const list = el('div', { class: 'accordion' });
  faqs.forEach((faq, index) => {
    const triggerId = `faq-trigger-${index}`;
    const panelId = `faq-panel-${index}`;
    const trigger = el('button', {
      type: 'button',
      class: 'accordion__trigger',
      id: triggerId,
      'aria-expanded': 'false',
      'aria-controls': panelId,
    }, [el('span', { text: faq.question }), icon('chevron-down')]);
    const panel = el('div', {
      class: 'accordion__panel prose',
      id: panelId,
      role: 'region',
      'aria-labelledby': triggerId,
      hidden: true,
    }, [renderMarkdown(faq.answer, { headingStart: 4 })]);
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
    trigger.addEventListener('keydown', (event) => {
      const triggers = [...list.querySelectorAll('.accordion__trigger')];
      const i = triggers.indexOf(trigger);
      let next = null;
      if (event.key === 'ArrowDown') next = triggers[(i + 1) % triggers.length];
      else if (event.key === 'ArrowUp') next = triggers[(i - 1 + triggers.length) % triggers.length];
      else if (event.key === 'Home') next = triggers[0];
      else if (event.key === 'End') next = triggers[triggers.length - 1];
      if (next) {
        event.preventDefault();
        next.focus();
      }
    });
    list.appendChild(el('div', { class: 'accordion__item reveal' }, [
      el('h3', { class: 'accordion__heading' }, [trigger]),
      panel,
    ]));
  });
  return list;
}

export async function renderFaqs(body) {
  await loadInto(body, async () => {
    const faqs = await listPublic('faqs');
    if (!faqs.length) return emptyState('Frequently asked questions will appear here soon.', 'No questions yet', 'help');
    return faqAccordion(faqs);
  }, { skeleton: () => skeletonText(5) });
}
