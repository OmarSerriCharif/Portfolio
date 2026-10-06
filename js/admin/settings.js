import { createSingletonForm, createCrud } from './crud.js';
import { VISIBLE_FIELD, SOCIAL_PLATFORMS } from './common.js';
import { el } from '../utils.js';

export async function render(view, ctx) {
  const formWrap = el('div');
  const socialWrap = el('div', { class: 'panel', style: { padding: 'var(--space-5)', marginTop: 'var(--space-6)' } });
  const docsWrap = el('div', { class: 'panel', style: { padding: 'var(--space-5)', marginTop: 'var(--space-6)' } });
  view.append(formWrap, socialWrap, docsWrap);

  await createSingletonForm({
    table: 'site_settings',
    title: 'Site settings',
    description: 'Company details, branding, SEO and footer. Changes apply to the public website immediately.',
    onSaved: () => ctx?.refreshBranding?.(),
    fields: [
      { type: 'section', label: 'Company' },
      { name: 'company_name', label: 'Company name', required: true, max: 120 },
      { name: 'site_title', label: 'Website title', required: true, max: 120 },
      { name: 'tagline', label: 'Tagline', max: 200, full: true },
      { type: 'section', label: 'Contact' },
      { name: 'contact_email', label: 'Contact email', type: 'email', max: 254 },
      { name: 'contact_phone', label: 'Contact phone', type: 'tel', max: 30 },
      { name: 'location', label: 'Location', max: 200 },
      { name: 'business_hours', label: 'Business hours', max: 300 },
      { type: 'section', label: 'Branding' },
      { name: 'logo_url', label: 'Logo (light backgrounds)', type: 'image', upload: { kind: 'image', folder: 'branding' } },
      { name: 'logo_dark_url', label: 'Logo (dark backgrounds)', type: 'image', upload: { kind: 'image', folder: 'branding' }, hint: 'Used in dark mode and the footer.' },
      { name: 'logo_alt', label: 'Logo alt text', max: 120 },
      { name: 'favicon_url', label: 'Favicon', type: 'favicon', upload: { kind: 'favicon', folder: 'branding' } },
      { name: 'primary_color', label: 'Primary colour', type: 'color', required: true },
      { name: 'secondary_color', label: 'Secondary colour', type: 'color', required: true },
      { name: 'accent_color', label: 'Accent colour', type: 'color', required: true },
      { type: 'section', label: 'Theme' },
      { name: 'default_theme', label: 'Default theme', type: 'select', required: true, options: [
        { value: 'system', label: 'Follow visitor’s system setting' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
      ] },
      { name: 'allow_theme_toggle', label: 'Show light/dark toggle', type: 'checkbox', default: true },
      { type: 'section', label: 'SEO' },
      { name: 'seo_title', label: 'SEO title', max: 120, full: true, hint: 'Aim for 50–60 characters.' },
      { name: 'seo_description', label: 'SEO description', type: 'textarea', max: 320, rows: 3, full: true, hint: 'Aim for 120–160 characters.' },
      { name: 'seo_keywords', label: 'SEO keywords', type: 'textarea', max: 500, rows: 2, full: true, hint: 'Comma-separated.' },
      { name: 'canonical_url', label: 'Canonical base URL', type: 'url', absolute: true, full: true, hint: 'Your live domain, e.g. https://www.example.com/' },
      { name: 'og_image_url', label: 'Social sharing image (Open Graph)', type: 'image', upload: { kind: 'image', folder: 'seo' }, hint: 'Recommended 1200 × 630 px.' },
      { type: 'section', label: 'Footer' },
      { name: 'footer_text', label: 'Footer text', type: 'textarea', max: 500, rows: 2, full: true },
      { name: 'copyright_text', label: 'Copyright text', max: 200, full: true, hint: 'Use {year} for the current year.' },
    ],
  }).mount(formWrap);

  createCrud({
    table: 'social_links',
    singular: 'Social link',
    plural: 'Social media links',
    titleField: 'label',
    titleFallback: (r) => SOCIAL_PLATFORMS.find((p) => p.value === r.platform)?.label || r.platform,
    subtitle: (r) => r.url,
    defaults: { is_visible: true, platform: 'instagram' },
    dialogSize: '',
    fields: [
      { name: 'platform', label: 'Platform', type: 'select', required: true, options: SOCIAL_PLATFORMS },
      { name: 'label', label: 'Label (optional)', max: 60 },
      { name: 'url', label: 'URL', type: 'url', required: true, full: true,
        validate: (v) => (/^(https?:\/\/|mailto:|tel:)/.test(v) ? null : 'Use a full https:// link (or mailto:/tel:).') },
      VISIBLE_FIELD,
    ],
  }).mount(socialWrap);

  createCrud({
    table: 'documents',
    singular: 'Document',
    plural: 'Documents',
    titleField: 'title',
    description: 'PDFs such as a company profile or portfolio. Public documents are linked in the footer and contact section.',
    visibilityField: 'is_public',
    thumbIcon: 'file',
    subtitle: (r) => r.description || r.file_url,
    defaults: { is_public: false },
    dialogSize: '',
    fields: [
      { name: 'title', label: 'Title', required: true, max: 150, full: true },
      { name: 'description', label: 'Description', type: 'textarea', max: 500, rows: 2, full: true },
      { name: 'file_url', label: 'PDF file', type: 'file', required: true, upload: { kind: 'document', folder: 'documents' } },
      { name: 'is_public', label: 'Public (downloadable from the website)', type: 'checkbox' },
    ],
  }).mount(docsWrap);
}
