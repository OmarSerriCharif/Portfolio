/** Experience, education and certifications timeline. */
import { createListManager, pageHeader } from './crud.js';
import { TIMELINE_KINDS } from '../constants.js';
import { formatMonthYear } from '../dom.js';

export const title = 'Experience & Education';

export function render(container) {
  const list = createListManager({
    table: 'timeline_items',
    heading: 'Timeline',
    description: 'Drag to reorder within each group.',
    itemLabel: 'entry',
    groupBy: { field: 'kind', groups: () => TIMELINE_KINDS },
    title: (row) => row.title,
    meta: (row) => {
      const end = row.end_date ? formatMonthYear(row.end_date) : 'Present';
      const dates = row.kind === 'certification' ? formatMonthYear(row.start_date) : `${formatMonthYear(row.start_date)} – ${end}`;
      return `${row.organization} · ${dates}`;
    },
    badges: (row) => (row.is_visible ? [] : [{ text: 'Hidden', tone: 'muted' }]),
    toggles: [{ field: 'is_visible', label: 'Visible' }],
    defaults: { kind: 'experience', is_visible: true },
    fields: [
      { name: 'kind', label: 'Type', type: 'select', required: true, options: TIMELINE_KINDS, width: 'half' },
      { name: 'title', label: 'Title / role / degree', required: true, maxLength: 120, width: 'half' },
      { name: 'organization', label: 'Organization', required: true, maxLength: 120, width: 'half' },
      { name: 'location', label: 'Location', maxLength: 80, width: 'half' },
      { name: 'start_date', label: 'Start date (issue date for certifications)', type: 'date', required: true, width: 'half' },
      {
        name: 'end_date', label: 'End date', type: 'date', width: 'half', help: 'Leave empty for “Present”.',
        validate: (value, all) => (value && all.start_date && value < all.start_date ? 'End date must be after the start date.' : ''),
      },
      { name: 'description', label: 'Description', type: 'markdown', rows: 7, maxLength: 4000 },
      { name: 'is_visible', label: 'Visible', type: 'checkbox', checkboxLabel: 'Show on the site' },
    ],
  });
  container.append(pageHeader(title, 'Your career and learning timeline.'), list.element);
}
