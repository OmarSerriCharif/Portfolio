import { createCrud } from './crud.js';
import { STATUS_FIELD, VISIBLE_FIELD, CURRENCY_FIELD, PACKAGE_PERIODS, truncate } from './common.js';
import { priceParts } from '../utils.js';
import { openPackageFeatures } from './packages.js';

export function render(view) {
  createCrud({
    table: 'pricing_packages',
    singular: 'Package',
    plural: 'Pricing packages',
    description: 'Pricing cards on the homepage and pricing.html. Use “Features” to manage what each package includes.',
    hasStatus: true,
    image: (r) => r.image_url,
    subtitle: (r) => {
      const p = priceParts(r);
      return [p.prefix, p.amount, p.period, p.note, truncate(r.short_description, 50)].filter(Boolean).join(' ');
    },
    badges: (r) => [
      r.is_popular ? { text: 'Most popular', variant: 'accent' } : null,
      r.is_featured ? { text: 'Featured', variant: 'primary' } : null,
      r.badge ? { text: r.badge } : null,
    ].filter(Boolean),
    defaults: { status: 'draft', is_visible: true, currency: 'AED', pricing_period: 'one_time' },
    rowActions: [{ label: 'Features', icon: 'list', onClick: (row) => openPackageFeatures(row) }],
    fields: [
      { type: 'section', label: 'Package' },
      { name: 'name', label: 'Package name', required: true, max: 100 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true, max: 100 },
      { name: 'service_id', label: 'Linked service', type: 'select', optionsFrom: { table: 'services', label: 'name' }, hint: 'Shown on that service’s page and card.' },
      { name: 'image_url', label: 'Image (optional)', type: 'image', upload: { kind: 'image', folder: 'packages' }, full: false },
      { name: 'short_description', label: 'Short description', type: 'textarea', max: 300, rows: 3, full: true },
      { name: 'description', label: 'Full description', type: 'markdown', max: 10000 },
      { type: 'section', label: 'Price' },
      { name: 'price', label: 'Price', type: 'number', minNum: 0, maxNum: 9999999999, hint: 'For percentage pricing enter the percentage (0–100).',
        validate: (v, all) => (all.pricing_period === 'percentage' && v !== null && v > 100 ? 'A percentage cannot exceed 100.' : null) },
      CURRENCY_FIELD,
      { name: 'pricing_period', label: 'Pricing period', type: 'select', required: true, options: PACKAGE_PERIODS },
      { name: 'price_note', label: 'Price note', max: 150, placeholder: 'e.g. of the campaign budget' },
      { name: 'minimum_price', label: 'Minimum price', type: 'number', minNum: 0, maxNum: 9999999999 },
      { name: 'original_price', label: 'Original / previous price', type: 'number', minNum: 0, maxNum: 9999999999, hint: 'Shown struck through when higher than the price.' },
      { name: 'discount_label', label: 'Discount label', max: 40, placeholder: 'e.g. Save 20%' },
      { name: 'badge', label: 'Badge', max: 40, placeholder: 'e.g. Best value' },
      { type: 'section', label: 'Call to action' },
      { name: 'cta_label', label: 'CTA label', max: 40 },
      { name: 'cta_url', label: 'CTA URL', type: 'url', hint: '#contact, pricing.html or https://…' },
      { type: 'section', label: 'Publishing' },
      STATUS_FIELD,
      VISIBLE_FIELD,
      { name: 'is_popular', label: '“Most popular” package', type: 'checkbox' },
      { name: 'is_featured', label: 'Featured package', type: 'checkbox' },
    ],
  }).mount(view);
}
