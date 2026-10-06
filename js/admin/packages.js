// Package features: manage features globally (with a package filter) or per package from the pricing list.
import { createCrud, openChildManager } from './crud.js';
import { truncate } from './common.js';

function featureFields(withPackage) {
  return [
    withPackage ? { name: 'package_id', label: 'Package', type: 'select', required: true, optionsFrom: { table: 'pricing_packages', label: 'name' }, full: true, hint: 'Assign this feature to a package.' } : null,
    { name: 'name', label: 'Feature', required: true, max: 150 },
    { name: 'is_included', label: 'Included in this package', type: 'checkbox', default: true },
    { name: 'description', label: 'Description', type: 'textarea', max: 300, full: true, rows: 3 },
    { name: 'quantity', label: 'Quantity', max: 40, placeholder: 'e.g. 12 posts' },
    { name: 'limitation', label: 'Limitation', max: 150, placeholder: 'e.g. up to 2 revisions' },
  ].filter(Boolean);
}

const common = {
  table: 'package_features',
  singular: 'Feature',
  plural: 'Package features',
  hasVisibility: false,
  dialogSize: '',
  defaults: { is_included: true },
  subtitle: (r) => [r.quantity, r.limitation, truncate(r.description, 60)].filter(Boolean).join(' · '),
  badges: (r) => (r.is_included ? [{ text: 'Included', variant: 'success' }] : [{ text: 'Not included', variant: 'error' }]),
};

export function openPackageFeatures(pkg) {
  return openChildManager(`${pkg.name} — features`, {
    ...common,
    fixed: { package_id: pkg.id },
    fields: featureFields(false),
  });
}

export function render(view) {
  createCrud({
    ...common,
    description: 'Features listed on each pricing card. Filter by package to reorder features within a package.',
    select: '*, pricing_packages(name)',
    subtitle: (r) => [r.pricing_packages?.name, r.quantity, r.limitation].filter(Boolean).join(' · '),
    filter: { name: 'package_id', label: 'Packages', optionsFrom: { table: 'pricing_packages', label: 'name' } },
    fields: featureFields(true),
  }).mount(view);
}
