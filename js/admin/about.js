import { createSingletonForm, createCrud } from './crud.js';
import { VISIBLE_FIELD, truncate } from './common.js';
import { el } from '../utils.js';

export async function render(view) {
  const aboutWrap = el('div');
  const statsWrap = el('div', { class: 'panel', style: { padding: 'var(--space-5)', marginTop: 'var(--space-6)' } });
  const valuesWrap = el('div', { class: 'panel', style: { padding: 'var(--space-5)', marginTop: 'var(--space-6)' } });
  view.append(aboutWrap, statsWrap, valuesWrap);

  await createSingletonForm({
    table: 'about',
    title: 'About the company',
    description: 'Company description, mission, vision and image.',
    fields: [
      { name: 'heading', label: 'Heading (shown if the section has no title)', required: true, max: 160, full: true },
      { name: 'body', label: 'Company description', type: 'markdown', max: 5000 },
      { name: 'mission', label: 'Mission', type: 'textarea', max: 1000, full: true },
      { name: 'vision', label: 'Vision', type: 'textarea', max: 1000, full: true },
      { name: 'image_url', label: 'Company image', type: 'image', upload: { kind: 'image', folder: 'about' } },
      { name: 'image_alt', label: 'Image alt text', max: 200, full: true },
    ],
  }).mount(aboutWrap);

  createCrud({
    table: 'statistics',
    singular: 'Statistic',
    plural: 'Statistics',
    titleField: 'value',
    description: 'Numbers shown under the About section (years of experience, clients, projects…). Only publish real figures.',
    subtitle: (r) => [r.label, truncate(r.description, 50)].filter(Boolean).join(' · '),
    defaults: { is_visible: true },
    dialogSize: '',
    fields: [
      { name: 'value', label: 'Value', required: true, max: 30, placeholder: 'e.g. 20+' },
      { name: 'label', label: 'Label', required: true, max: 80 },
      { name: 'description', label: 'Description', max: 200, full: true },
      VISIBLE_FIELD,
    ],
  }).mount(statsWrap);

  createCrud({
    table: 'company_values',
    singular: 'Value',
    plural: 'Company values',
    titleField: 'title',
    iconField: 'icon',
    subtitle: (r) => truncate(r.description),
    defaults: { is_visible: true },
    dialogSize: '',
    fields: [
      { name: 'title', label: 'Value', required: true, max: 80 },
      { name: 'icon', label: 'Icon', type: 'icon' },
      { name: 'description', label: 'Description', type: 'textarea', max: 500, full: true },
      VISIBLE_FIELD,
    ],
  }).mount(valuesWrap);
}
