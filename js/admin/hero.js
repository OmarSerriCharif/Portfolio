/** Hero: name, headline, bio, photo, call-to-action buttons and CV. */
import { createSingletonEditor, pageHeader } from './crud.js';

export const title = 'Hero';

export function render(container) {
  const editor = createSingletonEditor({
    table: 'hero',
    heading: 'Hero section',
    description: 'The first thing visitors see.',
    fields: [
      { name: 'eyebrow', label: 'Status line', maxLength: 80, placeholder: 'Available for new opportunities' },
      { name: 'name', label: 'Name', required: true, maxLength: 80, width: 'half' },
      { name: 'headline', label: 'Headline', required: true, maxLength: 140, width: 'half' },
      { name: 'bio', label: 'Short bio', type: 'textarea', rows: 3, maxLength: 600 },
      { name: 'profile_image_url', label: 'Profile image', type: 'image', folder: 'hero' },
      {
        name: 'cta_buttons', label: 'Call-to-action buttons', type: 'repeater', itemLabel: 'button', maxItems: 4,
        fields: [
          { name: 'label', label: 'Label', required: true, maxLength: 40, width: 'half' },
          { name: 'url', label: 'Link', type: 'link', required: true, maxLength: 500, width: 'half', placeholder: '#projects or https://…' },
          {
            name: 'style', label: 'Style', type: 'select', required: true, width: 'half',
            options: [{ value: 'primary', label: 'Primary (filled)' }, { value: 'ghost', label: 'Secondary (outline)' }],
          },
        ],
      },
      { name: 'cv_url', label: 'CV / résumé (PDF)', type: 'file', accept: 'pdf', folder: 'cv' },
      { name: 'cv_label', label: 'CV button label', required: true, maxLength: 40, width: 'half' },
    ],
  });
  container.append(pageHeader(title, 'Introduce yourself.'), editor.element);
}
