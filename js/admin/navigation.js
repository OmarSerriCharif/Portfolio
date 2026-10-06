import { createCrud } from './crud.js';
import { VISIBLE_FIELD } from './common.js';

export function render(view) {
  createCrud({
    table: 'navigation_items',
    singular: 'Link',
    plural: 'Navigation',
    titleField: 'label',
    description: 'Links in the header and footer. “Section” links scroll to a homepage section (use the section key, e.g. services).',
    subtitle: (r) => `${{ section: 'Section', page: 'Page', external: 'External' }[r.link_type]} → ${r.target}`,
    badges: (r) => [{ text: { header: 'Header', footer: 'Footer', both: 'Header + footer' }[r.location] }],
    defaults: { is_visible: true, link_type: 'section', location: 'both' },
    dialogSize: '',
    fields: [
      { name: 'label', label: 'Label', required: true, max: 50 },
      { name: 'link_type', label: 'Link type', type: 'select', required: true, options: [
        { value: 'section', label: 'Homepage section' }, { value: 'page', label: 'Page on this site' }, { value: 'external', label: 'External URL' },
      ] },
      { name: 'target', label: 'Target', type: 'url', required: true, full: true,
        hint: 'Section: section key (about, services, pricing, contact…). Page: pricing.html. External: https://…',
        validate: (v, all) => {
          if (all.link_type === 'section' && !/^[a-z0-9_]+$/.test(v)) return 'Use a section key such as services or case_studies.';
          if (all.link_type === 'external' && !/^https?:\/\//.test(v)) return 'External links must start with https://';
          if (all.link_type === 'page' && /^https?:\/\//.test(v)) return 'Use “External URL” for links to other websites.';
          return null;
        } },
      { name: 'location', label: 'Show in', type: 'select', required: true, options: [
        { value: 'both', label: 'Header and footer' }, { value: 'header', label: 'Header only' }, { value: 'footer', label: 'Footer only' },
      ] },
      { name: 'open_in_new_tab', label: 'Open in a new tab', type: 'checkbox' },
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
