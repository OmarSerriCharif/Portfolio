/** Testimonials. */
import { createListManager, pageHeader } from './crud.js';
import { initials } from '../dom.js';

export const title = 'Testimonials';

export function render(container) {
  const list = createListManager({
    table: 'testimonials',
    heading: 'Testimonials',
    itemLabel: 'testimonial',
    thumb: (row) => row.photo_url,
    thumbFallback: (row) => initials(row.name),
    title: (row) => row.name,
    meta: (row) => row.role,
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    fileFields: ['photo_url'],
    defaults: { is_visible: true },
    fields: [
      { name: 'name', label: 'Name', required: true, maxLength: 80, width: 'half' },
      { name: 'role', label: 'Role / company', maxLength: 120, width: 'half' },
      { name: 'quote', label: 'Quote', type: 'textarea', rows: 5, required: true, maxLength: 1000 },
      { name: 'photo_url', label: 'Photo', type: 'image', folder: 'testimonials' },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on the site' },
    ],
  });
  container.append(pageHeader(title, 'What people say about working with you.'), list.element);
}
