/** Skills grouped by category. */
import { createListManager, pageHeader } from './crud.js';
import { listRows } from '../api.js';

export const title = 'Skills';

export function render(container) {
  const loadCategories = async () => ({ categories: await listRows('skill_categories') });

  const skills = createListManager({
    table: 'skills',
    heading: 'Skills',
    description: 'Drag to reorder within a category.',
    itemLabel: 'skill',
    loadExtra: loadCategories,
    groupBy: {
      field: 'category_id',
      groups: ({ categories }) => categories.map((c) => ({ value: c.id, label: c.name })),
    },
    title: (row) => `${row.icon ? `${row.icon} ` : ''}${row.name}`,
    meta: (row) => (row.proficiency !== null ? `Proficiency ${row.proficiency}%` : 'No proficiency level'),
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    defaults: { is_visible: true },
    fields: ({ categories }) => [
      { name: 'name', label: 'Skill name', required: true, maxLength: 60, width: 'half' },
      {
        name: 'category_id', label: 'Category', type: 'select', required: true, width: 'half',
        options: categories.map((c) => ({ value: c.id, label: c.name })),
        validate: () => (categories.length ? '' : 'Create a category first.'),
      },
      { name: 'icon', label: 'Icon (emoji or short text)', maxLength: 8, width: 'half', placeholder: '⚡' },
      { name: 'proficiency', label: 'Proficiency (0–100, optional)', type: 'number', min: 0, max: 100, width: 'half' },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on the site' },
    ],
  });

  const categories = createListManager({
    table: 'skill_categories',
    heading: 'Categories',
    description: 'Deleting a category also deletes its skills.',
    itemLabel: 'category',
    title: (row) => row.name,
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    defaults: { is_visible: true },
    fields: [
      { name: 'name', label: 'Category name', required: true, maxLength: 60 },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on the site' },
    ],
    onChange: () => skills.reload(),
  });

  container.append(pageHeader(title, 'Group your skills into categories.'), categories.element, skills.element);
}
