import { createCrud, openChildManager } from './crud.js';
import { STATUS_FIELD, VISIBLE_FIELD, truncate } from './common.js';

const galleryConfig = (cs) => ({
  table: 'case_study_images',
  singular: 'Image',
  plural: 'Gallery images',
  titleField: 'caption',
  titleFallback: (r) => r.alt_text || 'Image',
  fixed: { case_study_id: cs.id },
  hasVisibility: false,
  image: (r) => r.image_url,
  subtitle: (r) => r.alt_text || '',
  dialogSize: '',
  fields: [
    { name: 'image_url', label: 'Image', type: 'image', required: true, upload: { kind: 'image', folder: 'case-studies' } },
    { name: 'alt_text', label: 'Alt text', max: 200, full: true, hint: 'Describe the image for screen-reader users.' },
    { name: 'caption', label: 'Caption', max: 200, full: true },
  ],
});

export function render(view) {
  createCrud({
    table: 'case_studies',
    singular: 'Case study',
    plural: 'Case studies',
    titleField: 'title',
    description: 'Portfolio projects. Drafts never appear on the public website. Details page: case-study.html?slug=…',
    hasStatus: true,
    image: (r) => r.cover_image_url,
    subtitle: (r) => [r.client_name, truncate(r.short_description, 70)].filter(Boolean).join(' · '),
    badges: (r) => (r.is_featured ? [{ text: 'Featured', variant: 'accent' }] : []),
    defaults: { status: 'draft', is_visible: true, results: [], platforms: [] },
    relations: [{ field: 'service_ids', joinTable: 'case_study_services', localKey: 'case_study_id', foreignKey: 'service_id' }],
    rowActions: [{ label: 'Gallery', icon: 'image', onClick: (row) => openChildManager(`${row.title} — gallery`, galleryConfig(row)) }],
    fields: [
      { type: 'section', label: 'Project' },
      { name: 'title', label: 'Title', required: true, max: 160 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'title', required: true, max: 120 },
      { name: 'client_name', label: 'Client / company', max: 150 },
      { name: 'industry_id', label: 'Industry', type: 'select', optionsFrom: { table: 'industries', label: 'name' } },
      { name: 'short_description', label: 'Short description', type: 'textarea', max: 400, rows: 3, full: true },
      { name: 'content', label: 'Full content', type: 'markdown', max: 30000 },
      { name: 'cover_image_url', label: 'Cover image', type: 'image', upload: { kind: 'image', folder: 'case-studies' } },
      { name: 'cover_image_alt', label: 'Cover image alt text', max: 200, full: true },
      { type: 'section', label: 'Results & details' },
      { name: 'results', label: 'Results', type: 'pairs', keys: ['value', 'label'], full: true, hint: 'One per line: value | label (e.g. 1.18M+ | Combined views)' },
      { name: 'platforms', label: 'Technologies / platforms', type: 'tags', full: true },
      { name: 'service_ids', label: 'Services provided', type: 'relation', optionsFrom: { table: 'services', label: 'name' } },
      { name: 'live_url', label: 'Live URL', type: 'url', full: true },
      { type: 'section', label: 'Publishing' },
      STATUS_FIELD,
      VISIBLE_FIELD,
      { name: 'is_featured', label: 'Featured (shown first)', type: 'checkbox' },
    ],
  }).mount(view);
}
