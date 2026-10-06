import { createCrud } from './crud.js';
import { STATUS_FIELD, VISIBLE_FIELD, CURRENCY_FIELD, ADDON_PRICING_TYPES, truncate } from './common.js';
import { priceParts } from '../utils.js';

export function render(view) {
  createCrud({
    table: 'addons',
    singular: 'Add-on',
    plural: 'Add-ons',
    description: 'Optional services shown in the add-ons section. Add-ons with the same group are shown together.',
    hasStatus: true,
    iconField: 'icon',
    image: (r) => r.image_url,
    subtitle: (r) => {
      const p = priceParts(r, 'pricing_type');
      return [r.group_label, [p.prefix, p.amount, p.period].filter(Boolean).join(' '), truncate(r.description, 50)].filter(Boolean).join(' · ');
    },
    defaults: { status: 'draft', is_visible: true, currency: 'AED', pricing_type: 'fixed' },
    fields: [
      { type: 'section', label: 'Add-on' },
      { name: 'name', label: 'Name', required: true, max: 100 },
      { name: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true, max: 100 },
      { name: 'group_label', label: 'Group', max: 80, placeholder: 'e.g. Website Creation' },
      { name: 'service_id', label: 'Linked service', type: 'select', optionsFrom: { table: 'services', label: 'name' } },
      { name: 'description', label: 'Description', type: 'markdown', max: 2000 },
      { name: 'icon', label: 'Icon', type: 'icon' },
      { name: 'image_url', label: 'Image', type: 'image', upload: { kind: 'image', folder: 'addons' } },
      { type: 'section', label: 'Price' },
      { name: 'price', label: 'Price', type: 'number', minNum: 0, maxNum: 9999999999 },
      CURRENCY_FIELD,
      { name: 'pricing_type', label: 'Pricing type', type: 'select', required: true, options: ADDON_PRICING_TYPES },
      { name: 'price_note', label: 'Price note', max: 150 },
      { name: 'quantity', label: 'Quantity', max: 60, placeholder: 'e.g. 5 extra posts' },
      { type: 'section', label: 'Call to action' },
      { name: 'cta_label', label: 'CTA label', max: 40 },
      { name: 'cta_url', label: 'CTA URL', type: 'url' },
      { type: 'section', label: 'Publishing' },
      STATUS_FIELD,
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
