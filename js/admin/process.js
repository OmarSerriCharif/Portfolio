import { createCrud } from './crud.js';
import { VISIBLE_FIELD, truncate } from './common.js';

export function render(view) {
  createCrud({
    table: 'process_steps',
    singular: 'Step',
    plural: 'Process steps',
    titleField: 'title',
    description: 'Steps of the “How it works” section. If no step number is set, the position is used.',
    iconField: 'icon',
    image: (r) => r.image_url,
    subtitle: (r) => [r.step_number ? `Step ${r.step_number}` : null, truncate(r.description, 70)].filter(Boolean).join(' · '),
    defaults: { is_visible: true },
    fields: [
      { name: 'title', label: 'Title', required: true, max: 100 },
      { name: 'step_number', label: 'Step number', type: 'number', minNum: 1, maxNum: 99, integer: true },
      { name: 'description', label: 'Description', type: 'textarea', max: 1000, full: true },
      { name: 'icon', label: 'Icon', type: 'icon' },
      { name: 'image_url', label: 'Image', type: 'image', upload: { kind: 'image', folder: 'process' } },
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
