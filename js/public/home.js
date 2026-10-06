// Homepage: renders every visible section in the order stored in the `sections` table.

import { listPublic } from '../api.js';
import { el } from '../utils.js';
import { initSite, emptyState, errorState, observeReveal } from '../main.js';
import {
  createSectionShell, renderHero, renderAbout, renderWhyChooseUs, renderIndustries,
  renderProcess, renderClients, renderTestimonials, renderTeam, renderFaqs,
} from './sections.js';
import { renderServicesSection } from './services.js';
import { renderPricingSection, renderAddonsSection } from './pricing.js';
import { renderCaseStudiesSection } from './case-study.js';
import { renderContactSection } from './contact.js';

const RENDERERS = {
  about: (body) => renderAbout(body),
  services: (body) => renderServicesSection(body),
  why_choose_us: (body) => renderWhyChooseUs(body),
  industries: (body) => renderIndustries(body),
  process: (body) => renderProcess(body),
  case_studies: (body) => renderCaseStudiesSection(body),
  clients: (body) => renderClients(body),
  pricing: (body, section, ctx) => renderPricingSection(body, section, ctx),
  addons: (body, section, ctx) => renderAddonsSection(body, section, ctx),
  testimonials: (body) => renderTestimonials(body),
  team: (body) => renderTeam(body),
  faqs: (body) => renderFaqs(body),
  contact: (body, section, ctx) => renderContactSection(body, section, ctx),
};

const CENTERED = new Set(['faqs', 'testimonials', 'team']);

async function renderHome(main, ctx) {
  const sections = await listPublic('sections');
  const known = sections.filter((s) => s.key === 'hero' || RENDERERS[s.key]);
  if (!known.length) {
    main.replaceChildren(el('div', { class: 'container page-loading' }, [
      emptyState('Content is being prepared. Please check back soon.', 'Coming soon', 'compass'),
    ]));
    return;
  }

  main.replaceChildren();
  const tasks = [];
  for (const section of known) {
    if (section.key === 'hero') {
      const element = el('section', { id: 'hero', class: 'section section--hero', 'aria-label': 'Introduction' });
      main.appendChild(element);
      tasks.push(renderHero(element, ctx));
      continue;
    }
    const { element, body } = createSectionShell(section, { center: CENTERED.has(section.key) });
    main.appendChild(element);
    tasks.push(RENDERERS[section.key](body, section, ctx));
  }
  observeReveal(main);
  await Promise.allSettled(tasks);

  // Re-apply the hash scroll now that sections exist.
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) target.scrollIntoView();
  }
}

async function initHome() {
  const main = document.getElementById('main');
  let ctx;
  try {
    ctx = { ...(await initSite({ isHome: true })), isHome: true };
  } catch (error) {
    main.replaceChildren(el('div', { class: 'container page-loading' }, [emptyState(error.message, 'Website not available', 'lock')]));
    return;
  }
  const attempt = async () => {
    try {
      await renderHome(main, ctx);
    } catch (error) {
      console.error(error);
      main.replaceChildren(el('div', { class: 'container page-loading' }, [errorState(error.message, attempt)]));
    }
  };
  await attempt();
}

if (document.body.dataset.page === 'home') initHome();
