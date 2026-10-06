import { createCrud } from './crud.js';
import { STATUS_FIELD, VISIBLE_FIELD, truncate } from './common.js';

export function render(view) {
  createCrud({
    table: 'testimonials',
    singular: 'Testimonial',
    plural: 'Testimonials',
    titleField: 'client_name',
    description: 'Only add real testimonials from real clients.',
    hasStatus: true,
    image: (r) => r.photo_url,
    subtitle: (r) => [[r.role, r.company].filter(Boolean).join(', '), r.rating ? `${r.rating}/5` : null, truncate(r.quote, 60)].filter(Boolean).join(' · '),
    defaults: { status: 'draft', is_visible: true },
    fields: [
      { name: 'client_name', label: 'Client name', required: true, max: 120 },
      { name: 'role', label: 'Role', max: 120 },
      { name: 'company', label: 'Company', max: 120 },
      { name: 'rating', label: 'Rating', type: 'select', numeric: true, options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} / 5` })) },
      { name: 'quote', label: 'Quote', type: 'textarea', required: true, max: 1500, full: true, rows: 5 },
      { name: 'photo_url', label: 'Photo', type: 'image', upload: { kind: 'image', folder: 'testimonials' } },
      STATUS_FIELD,
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
