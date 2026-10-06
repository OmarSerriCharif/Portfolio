import { createCrud } from './crud.js';
import { VISIBLE_FIELD, truncate } from './common.js';

export function render(view) {
  createCrud({
    table: 'why_choose_us',
    singular: 'Advantage',
    plural: 'Why choose us',
    titleField: 'title',
    description: 'Your competitive advantages.',
    iconField: 'icon',
    image: (r) => r.image_url,
    subtitle: (r) => truncate(r.description),
    defaults: { is_visible: true },
    fields: [
      { name: 'title', label: 'Title', required: true, max: 100 },
      { name: 'icon', label: 'Icon', type: 'icon' },
      { name: 'description', label: 'Description', type: 'textarea', max: 1000, full: true },
      { name: 'image_url', label: 'Image (replaces the icon)', type: 'image', upload: { kind: 'image', folder: 'why-us' } },
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
