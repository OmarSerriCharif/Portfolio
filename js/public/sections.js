/**
 * Renderers for each home page section. Each receives the section row
 * (headings) and the loaded content, and returns a <section> element.
 * All content is inserted as text or through the allowlisted Markdown renderer.
 */
import { h, lazyImg, initials, safeUrl, isExternal, formatMonthYear } from '../dom.js';
import { renderMarkdown } from '../markdown.js';
import { emptyState } from '../ui.js';
import { socialList, animateCounter } from './chrome.js';
import { initContactForm } from './contact-form.js';

/** Common section wrapper with a numbered heading. */
function sectionShell(section, index, ...content) {
  const titleId = `${section.key}-title`;
  return h('section', { id: section.key, class: `section section--${section.key}`, 'aria-labelledby': titleId },
    h('div', { class: 'container' },
      h('header', { class: 'section-head reveal' },
        h('span', { class: 'section-head__num', 'aria-hidden': 'true', text: String(index).padStart(2, '0') }),
        h('h2', { class: 'section-head__title', id: titleId, text: section.title || section.nav_label }),
        section.subtitle && h('p', { class: 'section-head__subtitle', text: section.subtitle })),
      content));
}

function linkAttrs(url) {
  const external = isExternal(url);
  return { href: safeUrl(url), target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null };
}

/* --------------------------------- Hero ----------------------------------- */

function hero(section, _index, { hero: data }) {
  if (!data) return null;
  const ctas = (Array.isArray(data.cta_buttons) ? data.cta_buttons : [])
    .filter((b) => b && b.label && b.url)
    .map((b) => h('a', { class: `btn ${b.style === 'ghost' ? 'btn--ghost' : 'btn--primary'} btn--lg`, ...linkAttrs(b.url), text: b.label }));
  if (data.cv_url) {
    ctas.push(h('a', {
      class: 'btn btn--ghost btn--lg', href: data.cv_url, target: '_blank', rel: 'noopener noreferrer', download: '',
    }, h('span', { 'aria-hidden': 'true', text: '↓ ' }), data.cv_label || 'Download CV'));
  }

  return h('section', { id: 'hero', class: 'hero', 'aria-labelledby': 'hero-title' },
    h('div', { class: 'container hero__inner' },
      h('div', { class: 'hero__text' },
        data.eyebrow && h('p', { class: 'hero__eyebrow reveal', text: data.eyebrow }),
        h('h1', { class: 'hero__name reveal', id: 'hero-title', text: data.name }),
        h('p', { class: 'hero__headline reveal', text: data.headline }),
        data.bio && h('p', { class: 'hero__bio reveal', text: data.bio }),
        ctas.length > 0 && h('div', { class: 'hero__ctas reveal' }, ctas)),
      h('div', { class: 'hero__media reveal' },
        data.profile_image_url
          ? lazyImg(data.profile_image_url, `Portrait of ${data.name}`, 'hero__photo')
          : h('div', { class: 'hero__avatar', role: 'img', 'aria-label': data.name, text: initials(data.name) }))));
}

/* --------------------------------- About ---------------------------------- */

function about(section, index, { about: data, stats }) {
  const hasBody = Boolean(data?.body?.trim());
  if (!hasBody && !data?.image_url && !stats.length) {
    return sectionShell(section, index, emptyState({ title: 'More about me is coming soon.' }));
  }
  const statsEl = stats.length > 0 && h('ul', { class: 'stats' }, stats.map((s) => {
    const value = h('span', { class: 'stat__value', dataset: { value: s.value }, text: s.value });
    const item = h('li', { class: 'stat reveal' }, value, h('span', { class: 'stat__label', text: s.label }));
    item.addEventListener('reveal', () => animateCounter(value), { once: true });
    return item;
  }));

  return sectionShell(section, index,
    h('div', { class: `about${data?.image_url ? ' about--with-image' : ''}` },
      h('div', { class: 'about__text prose reveal' }, hasBody && renderMarkdown(data.body)),
      data?.image_url && h('figure', { class: 'about__figure reveal' }, lazyImg(data.image_url, section.title || 'About image', 'about__img'))),
    statsEl);
}

/* --------------------------------- Skills --------------------------------- */

function skills(section, index, { skillCategories }) {
  const groups = skillCategories.filter((c) => c.skills.length);
  if (!groups.length) return sectionShell(section, index, emptyState({ title: 'Skills will be listed here soon.' }));

  return sectionShell(section, index,
    h('div', { class: 'skills' }, groups.map((cat) => h('article', { class: 'skill-group reveal' },
      h('h3', { class: 'skill-group__title', text: cat.name }),
      h('ul', { class: 'skill-list' }, cat.skills.map((skill) => {
        const hasLevel = skill.proficiency !== null && skill.proficiency !== undefined;
        const bar = hasLevel && h('span', {
          class: 'skill__bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100',
          'aria-valuenow': String(skill.proficiency), 'aria-label': `${skill.name} proficiency`,
        }, h('span', { class: 'skill__fill' }));
        if (bar) bar.firstChild.style.setProperty('--level', `${skill.proficiency}%`);
        return h('li', { class: `skill${hasLevel ? ' skill--leveled' : ''}` },
          skill.icon && h('span', { class: 'skill__icon', 'aria-hidden': 'true', text: skill.icon }),
          h('span', { class: 'skill__name', text: skill.name }),
          hasLevel && h('span', { class: 'skill__level', text: `${skill.proficiency}%` }),
          bar);
      }))))));
}

/* ------------------------------- Experience ------------------------------- */

const KIND_LABELS = { experience: 'Experience', education: 'Education', certification: 'Certifications' };

function experience(section, index, { timeline }) {
  if (!timeline.length) return sectionShell(section, index, emptyState({ title: 'My timeline is coming soon.' }));

  const kinds = ['experience', 'education', 'certification'].filter((k) => timeline.some((t) => t.kind === k));
  const blocks = kinds.map((kind) => {
    const items = timeline.filter((t) => t.kind === kind);
    const heading = kinds.length > 1 && h('h3', { class: 'timeline-group__title reveal', text: KIND_LABELS[kind] });

    if (kind === 'certification') {
      return h('div', { class: 'timeline-group' }, heading,
        h('ul', { class: 'cert-list' }, items.map((item) => h('li', { class: 'cert reveal' },
          h('span', { class: 'cert__title', text: item.title }),
          h('span', { class: 'cert__meta', text: `${item.organization} · ${formatMonthYear(item.start_date)}` }),
          item.description && h('div', { class: 'cert__desc prose' }, renderMarkdown(item.description))))));
    }

    return h('div', { class: 'timeline-group' }, heading,
      h('ol', { class: 'timeline' }, items.map((item) => h('li', { class: 'timeline__item reveal' },
        h('div', { class: 'timeline__head' },
          h('div', {},
            h('h4', { class: 'timeline__title', text: item.title }),
            h('p', { class: 'timeline__org', text: [item.organization, item.location].filter(Boolean).join(' · ') })),
          h('p', { class: 'timeline__date' },
            h('time', { datetime: item.start_date, text: formatMonthYear(item.start_date) }),
            ' — ',
            item.end_date ? h('time', { datetime: item.end_date, text: formatMonthYear(item.end_date) }) : 'Present')),
        item.description && h('div', { class: 'timeline__desc prose' }, renderMarkdown(item.description))))));
  });
  return sectionShell(section, index, h('div', { class: 'timeline-groups' }, blocks));
}

/* -------------------------------- Projects -------------------------------- */

export function projectCard(project) {
  const href = `project.html?slug=${encodeURIComponent(project.slug)}`;
  return h('article', { class: `project-card reveal${project.is_featured ? ' project-card--featured' : ''}` },
    h('a', { class: 'project-card__media', href, tabindex: '-1', 'aria-hidden': 'true' },
      project.cover_image_url
        ? lazyImg(project.cover_image_url, '', 'project-card__img')
        : h('span', { class: 'project-card__placeholder', text: initials(project.title) })),
    h('div', { class: 'project-card__body' },
      h('p', { class: 'project-card__eyebrow' },
        project.category && h('span', { text: project.category }),
        project.is_featured && h('span', { class: 'project-card__featured', text: '★ Featured' })),
      h('h3', { class: 'project-card__title' }, h('a', { href, text: project.title })),
      h('p', { class: 'project-card__summary', text: project.summary }),
      project.tech_stack?.length > 0 && h('ul', { class: 'tags', 'aria-label': 'Technologies' },
        project.tech_stack.map((t) => h('li', { class: 'tag', text: t }))),
      h('div', { class: 'project-card__links' },
        h('a', { class: 'link-arrow', href, text: 'Case study →' }),
        project.live_url && h('a', { class: 'link-arrow', ...linkAttrs(project.live_url), text: 'Live ↗' }),
        project.github_url && h('a', { class: 'link-arrow', ...linkAttrs(project.github_url), text: 'GitHub ↗' }))));
}

function projects(section, index, { projects: list }) {
  if (!list.length) return sectionShell(section, index, emptyState({ title: 'Projects are on their way.' }));
  return sectionShell(section, index, h('div', { class: 'project-grid' }, list.map(projectCard)));
}

/* -------------------------------- Services -------------------------------- */

function services(section, index, { services: list }) {
  if (!list.length) return sectionShell(section, index, emptyState({ title: 'Services will be listed soon.' }));
  return sectionShell(section, index,
    h('ul', { class: 'service-grid' }, list.map((s) => h('li', { class: 'service-card reveal' },
      s.icon && h('span', { class: 'service-card__icon', 'aria-hidden': 'true', text: s.icon }),
      h('h3', { class: 'service-card__title', text: s.title }),
      s.description && h('p', { class: 'service-card__desc', text: s.description })))));
}

/* ------------------------------ Testimonials ------------------------------ */

function testimonials(section, index, { testimonials: list }) {
  if (!list.length) return sectionShell(section, index, emptyState({ title: 'Testimonials coming soon.' }));
  return sectionShell(section, index,
    h('ul', { class: 'testimonial-grid' }, list.map((t) => h('li', { class: 'testimonial reveal' },
      h('figure', {},
        h('blockquote', { class: 'testimonial__quote' }, h('p', { text: t.quote })),
        h('figcaption', { class: 'testimonial__author' },
          t.photo_url
            ? lazyImg(t.photo_url, `Photo of ${t.name}`, 'testimonial__photo')
            : h('span', { class: 'testimonial__avatar', 'aria-hidden': 'true', text: initials(t.name) }),
          h('span', {},
            h('strong', { class: 'testimonial__name', text: t.name }),
            t.role && h('span', { class: 'testimonial__role', text: t.role }))))))));
}

/* --------------------------------- Contact -------------------------------- */

function contact(section, index, { contact: info, socials }) {
  const details = [
    info?.email && { label: 'Email', value: info.email, href: `mailto:${info.email}` },
    info?.phone && { label: 'Phone', value: info.phone, href: `tel:${info.phone.replace(/[^\d+]/g, '')}` },
    info?.location && { label: 'Location', value: info.location },
  ].filter(Boolean);

  const aside = h('div', { class: 'contact__info reveal' },
    info?.intro && h('p', { class: 'contact__intro', text: info.intro }),
    details.length > 0 && h('dl', { class: 'contact__details' }, details.map((d) => [
      h('dt', { text: d.label }),
      h('dd', {}, d.href ? h('a', { href: d.href, text: d.value }) : d.value),
    ])),
    socialList(socials));

  const formEnabled = info ? info.form_enabled !== false : true;
  return sectionShell(section, index,
    h('div', { class: `contact${formEnabled ? '' : ' contact--no-form'}` }, aside, formEnabled && initContactForm()));
}

export const RENDERERS = { hero, about, skills, experience, projects, services, testimonials, contact };
