import { createCrud } from './crud.js';
import { VISIBLE_FIELD, truncate } from './common.js';

export function render(view) {
  createCrud({
    table: 'industries',
    singular: 'Industry',
    plural: 'Industries',
    description: 'Industries and target clients shown in the industries section.',
    iconField: 'icon',
    image: (r) => r.image_url,
    subtitle: (r) => truncate(r.description),
    defaults: { is_visible: true },
    fields: [
      { name: 'name', label: 'Industry name', required: true, max: 100 },
      { name: 'icon', label: 'Icon', type: 'icon' },
      { name: 'description', label: 'Description', type: 'textarea', max: 1000, full: true },
      { name: 'image_url', label: 'Image', type: 'image', upload: { kind: 'image', folder: 'industries' } },
      { name: 'image_alt', label: 'Image alt text', max: 200, full: true },
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
