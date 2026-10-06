import { createCrud } from './crud.js';
import { VISIBLE_FIELD } from './common.js';

export function render(view) {
  createCrud({
    table: 'clients',
    singular: 'Client',
    plural: 'Clients & conferences',
    description: 'Clients, events and conferences you have worked with.',
    image: (r) => r.logo_url,
    subtitle: (r) => r.category || '',
    defaults: { is_visible: true },
    fields: [
      { name: 'name', label: 'Name', required: true, max: 200, full: true },
      { name: 'category', label: 'Category', max: 80, placeholder: 'e.g. Medical conference' },
      { name: 'website_url', label: 'Website', type: 'url' },
      { name: 'logo_url', label: 'Logo', type: 'image', upload: { kind: 'image', folder: 'clients' } },
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
