import { createCrud } from './crud.js';
import { VISIBLE_FIELD } from './common.js';

const LABELS = {
  hero: 'Hero', about: 'About', services: 'Services', why_choose_us: 'Why choose us', case_studies: 'Case studies / work',
  industries: 'Industries', clients: 'Clients / conferences', pricing: 'Pricing packages', addons: 'Add-ons',
  process: 'Process', testimonials: 'Testimonials', team: 'Team', faqs: 'FAQs', contact: 'Contact',
};

export function render(view) {
  createCrud({
    table: 'sections',
    singular: 'Section',
    plural: 'Website sections',
    titleField: 'title',
    titleFallback: (r) => LABELS[r.key] || r.key,
    description: 'Drag sections to change the homepage order, toggle visibility, and edit each section’s eyebrow, heading and intro text.',
    subtitle: (r) => `${LABELS[r.key] || r.key} · #${r.key}`,
    allowCreate: false,
    allowDelete: false,
    dialogSize: '',
    fields: [
      { name: 'eyebrow', label: 'Eyebrow (small label)', max: 80, full: true },
      { name: 'title', label: 'Heading', max: 160, full: true },
      { name: 'subtitle', label: 'Intro text', type: 'textarea', max: 500, full: true },
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
