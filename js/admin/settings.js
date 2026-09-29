/** Site settings: title, branding, colors, SEO and footer. */
import { createSingletonEditor, pageHeader } from './crud.js';
import { applyPrimaryColor } from '../dom.js';

export const title = 'Site settings';

export function render(container) {
  const editor = createSingletonEditor({
    table: 'site_settings',
    heading: 'General',
    description: 'Branding and SEO used across the public site.',
    fields: [
      { name: 'site_title', label: 'Site title', required: true, maxLength: 80, width: 'half' },
      { name: 'logo_text', label: 'Logo text', maxLength: 40, width: 'half', help: 'Shown when no logo image is set.' },
      { name: 'logo_url', label: 'Logo image', type: 'image', folder: 'branding', width: 'half' },
      { name: 'favicon_url', label: 'Favicon', type: 'image', accept: 'icon', folder: 'branding', width: 'half' },
      { name: 'primary_color', label: 'Primary color', type: 'color', required: true, width: 'half' },
      { name: 'meta_title', label: 'SEO title', required: true, maxLength: 70, help: 'Shown in search results and browser tabs.' },
      { name: 'meta_description', label: 'SEO description', type: 'textarea', rows: 3, maxLength: 170 },
      { name: 'og_image_url', label: 'Social share image (Open Graph)', type: 'image', folder: 'branding', help: 'Recommended 1200 × 630.' },
      { name: 'footer_text', label: 'Footer text', maxLength: 200 },
    ],
    afterSave: (saved) => applyPrimaryColor(saved.primary_color),
  });
  container.append(pageHeader(title, 'Control the look and search appearance of your portfolio.'), editor.element);
}
