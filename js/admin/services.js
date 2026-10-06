import { createCrud, openChildManager } from './crud.js';
import { STATUS_FIELD, VISIBLE_FIELD, CURRENCY_FIELD, SERVICE_PRICING_TYPES, truncate } from './common.js';
import { formatMoney } from '../utils.js';

export const serviceFeaturesConfig = (service) => ({
  table: 'service_features',
  singular: 'Item',
  plural: 'Features, benefits & deliverables',
  titleField: 'title',
  fixed: { service_id: service.id },
  hasVisibility: false,
  subtitle: (r) => truncate(r.description),
  badges: (r) => [{ text: { feature: 'Feature', benefit: 'Benefit', deliverable: 'Deliverable' }[r.kind] || r.kind, variant: 'primary' }],
  dialogSize: '',
  defaults: { kind: 'feature' },
  fields: [
    { name: 'kind', label: 'Type', type: 'select', required: true, options: [
      { value: 'feature', label: 'Feature' }, { value: 'benefit', label: 'Benefit' }, { value: 'deliverable', label: 'Deliverable' },
    ] },
    { name: 'title', label: 'Title', required: true, max: 150 },
    { name: 'description', label: 'Description', type: 'textarea', max: 500, full: true },
  ],
});

export const servicesConfig = {
  table: 'services',
  singular: 'Service',
  plural: 'Services',
  description: 'Services shown as cards on the homepage, each with its own details page (service.html?slug=…).',
  hasStatus: true,
  iconField: 'icon',
  image: (r) => r.cover_image_url,
  subtitle: (r) => [r.starting_price !== null ? formatMoney(r.starting_price, r.currency) : null, truncate(r.short_description, 70)].filter(Boolean).join(' · '),
  badges: (r) => (r.is_featured ? [{ text: 'Featured', variant: 'accent' }] : []),
  defaults: { status: 'draft', is_visible: true, currency: 'AED' },
  rowActions: [{
    label: 'Features',
    icon: 'list',
    onClick: (row) => openChildManager(`${row.name} — features, benefits & deliverables`, serviceFeaturesConfig(row)),
  }],
  fields: [
    { type: 'section', label: 'Basics' },
    { name: 'name', label: 'Service name', required: true, max: 100 },
    { name: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true, max: 100, hint: 'Used in the URL: service.html?slug=…' },
    { name: 'short_description', label: 'Short description', type: 'textarea', max: 300, rows: 3, full: true },
    { name: 'description', label: 'Full description', type: 'markdown', max: 20000 },
    { name: 'icon', label: 'Icon', type: 'icon' },
    { name: 'cover_image_url', label: 'Cover image', type: 'image', upload: { kind: 'image', folder: 'services' } },
    { name: 'cover_image_alt', label: 'Cover image alt text', max: 200, full: true },
    { type: 'section', label: 'Pricing', hint: 'Optional. If a pricing package is linked to this service, its price is shown instead.' },
    { name: 'starting_price', label: 'Price', type: 'number', minNum: 0, maxNum: 9999999999 },
    CURRENCY_FIELD,
    { name: 'pricing_type', label: 'Pricing type', type: 'select', options: SERVICE_PRICING_TYPES },
    { name: 'price_note', label: 'Price note', max: 150, placeholder: 'e.g. of the campaign budget' },
    { type: 'section', label: 'Call to action' },
    { name: 'cta_label', label: 'CTA label', max: 40 },
    { name: 'cta_url', label: 'CTA URL', type: 'url', hint: '#contact, pricing.html or https://…' },
    { type: 'section', label: 'Publishing' },
    STATUS_FIELD,
    VISIBLE_FIELD,
    { name: 'is_featured', label: 'Featured service', type: 'checkbox' },
  ],
};

export function render(view) {
  createCrud(servicesConfig).mount(view);
}
