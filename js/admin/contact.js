/** Contact details and social links. */
import { createSingletonEditor, createListManager, pageHeader } from './crud.js';

export const title = 'Contact';

export function render(container) {
  const info = createSingletonEditor({
    table: 'contact_info',
    heading: 'Contact details',
    fields: [
      { name: 'intro', label: 'Intro text', type: 'textarea', rows: 3, maxLength: 400 },
      { name: 'email', label: 'Email', type: 'email', maxLength: 254, width: 'half' },
      { name: 'phone', label: 'Phone', type: 'tel', maxLength: 30, width: 'half' },
      { name: 'location', label: 'Location', maxLength: 120, width: 'half' },
      { name: 'form_enabled', label: 'Contact form', type: 'checkbox', checkboxLabel: 'Show the contact form', default: true },
    ],
  });

  const socials = createListManager({
    table: 'social_links',
    heading: 'Social links',
    itemLabel: 'link',
    title: (row) => `${row.icon ? `${row.icon} ` : ''}${row.platform}`,
    meta: (row) => row.url,
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    defaults: { is_visible: true },
    fields: [
      { name: 'platform', label: 'Platform', required: true, maxLength: 40, width: 'half', placeholder: 'LinkedIn' },
      { name: 'icon', label: 'Icon (emoji or short text)', maxLength: 8, width: 'half', placeholder: 'in' },
      {
        name: 'url', label: 'URL', type: 'link', required: true, maxLength: 500,
        pattern: /^(https?:\/\/|mailto:)/i, patternMessage: 'Use a full https:// URL or a mailto: link.',
      },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on the site' },
    ],
  });

  container.append(pageHeader(title, 'How people can reach you.'), info.element, socials.element);
}
