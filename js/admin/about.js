/** About: text (Markdown), image and stats. */
import { createSingletonEditor, createListManager, pageHeader } from './crud.js';

export const title = 'About';

export function render(container) {
  const about = createSingletonEditor({
    table: 'about',
    heading: 'About text',
    fields: [
      { name: 'body', label: 'About text', type: 'markdown', rows: 12, maxLength: 5000 },
      { name: 'image_url', label: 'Image', type: 'image', folder: 'about' },
    ],
  });

  const stats = createListManager({
    table: 'about_stats',
    heading: 'Stats',
    description: 'Short highlights such as “4+ Years of experience”.',
    itemLabel: 'stat',
    title: (row) => `${row.value} — ${row.label}`,
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    defaults: { is_visible: true },
    fields: [
      { name: 'value', label: 'Value', required: true, maxLength: 20, width: 'half', placeholder: '4+' },
      { name: 'label', label: 'Label', required: true, maxLength: 60, width: 'half', placeholder: 'Years of experience' },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on the site' },
    ],
  });

  container.append(pageHeader(title, 'Tell your story.'), about.element, stats.element);
}
