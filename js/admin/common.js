// Shared field definitions and option lists for dashboard modules (mirrors CHECK constraints in setup.sql).

export const STATUS_FIELD = {
  name: 'status', label: 'Status', type: 'select', required: true, default: 'draft',
  options: [{ value: 'draft', label: 'Draft (not public)' }, { value: 'published', label: 'Published' }],
};

export const VISIBLE_FIELD = { name: 'is_visible', label: 'Visible on website', type: 'checkbox', default: true };

export const CURRENCY_FIELD = { name: 'currency', label: 'Currency', type: 'currency', required: true, default: 'AED', max: 3, hint: '3-letter code, e.g. AED' };

export const PACKAGE_PERIODS = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Per month' },
  { value: 'quarterly', label: 'Per quarter' },
  { value: 'yearly', label: 'Per year' },
  { value: 'per_post', label: 'Per post' },
  { value: 'per_hour', label: 'Per hour' },
  { value: 'percentage', label: 'Percentage (e.g. of budget)' },
  { value: 'custom', label: 'Custom' },
];

export const SERVICE_PRICING_TYPES = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'starting_from', label: 'Starting from' },
  { value: 'monthly', label: 'Per month' },
  { value: 'per_post', label: 'Per post' },
  { value: 'per_hour', label: 'Per hour' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'quote', label: 'On request / quote' },
  { value: 'custom', label: 'Custom' },
];

export const ADDON_PRICING_TYPES = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'starting_from', label: 'Starting from' },
  { value: 'per_unit', label: 'Per unit' },
  { value: 'monthly', label: 'Per month' },
  { value: 'per_hour', label: 'Per hour' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'quote', label: 'On request / quote' },
];

export const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'whatsapp', 'snapchat', 'threads', 'behance', 'website', 'other']
  .map((p) => ({ value: p, label: p === 'x' ? 'X (Twitter)' : p.charAt(0).toUpperCase() + p.slice(1) }));

export function truncate(text, max = 90) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
