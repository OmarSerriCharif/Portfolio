/** Services offered. */
import { createListManager, pageHeader } from './crud.js';

export const title = 'Services';

export function render(container) {
  const list = createListManager({
    table: 'services',
    heading: 'Services',
    itemLabel: 'service',
    title: (row) => `${row.icon ? `${row.icon} ` : ''}${row.title}`,
    meta: (row) => row.description,
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    defaults: { is_visible: true },
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 80, width: 'half' },
      { name: 'icon', label: 'Icon (emoji or short text)', maxLength: 8, width: 'half' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4, maxLength: 600 },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on the site' },
    ],
  });
  container.append(pageHeader(title, 'What you offer to clients.'), list.element);
}
