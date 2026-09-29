/** Sections: visibility, navigation labels, headings and order. */
import { createListManager, pageHeader } from './crud.js';

export const title = 'Sections';

export function render(container) {
  const list = createListManager({
    table: 'sections',
    heading: 'Page sections',
    description: 'Drag to change the order of sections on the home page. Hidden sections are removed from the page and the menu.',
    itemLabel: 'section',
    canCreate: false,
    canDelete: false,
    title: (row) => row.nav_label,
    meta: (row) => `${row.key} · ${row.title || 'No heading'}`,
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    fields: [
      { name: 'nav_label', label: 'Menu label', required: true, maxLength: 30, width: 'half' },
      { name: 'title', label: 'Heading', maxLength: 80, width: 'half' },
      { name: 'subtitle', label: 'Subheading', type: 'textarea', rows: 2, maxLength: 200 },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show this section on the site' },
    ],
  });
  container.append(pageHeader(title, 'Choose which sections appear and in what order.'), list.element);
}
