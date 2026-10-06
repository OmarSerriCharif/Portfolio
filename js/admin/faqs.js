import { createCrud } from './crud.js';
import { STATUS_FIELD, VISIBLE_FIELD, truncate } from './common.js';

export function render(view) {
  createCrud({
    table: 'faqs',
    singular: 'FAQ',
    plural: 'FAQs',
    titleField: 'question',
    description: 'Questions shown in the FAQ accordion on the homepage and pricing page.',
    hasStatus: true,
    subtitle: (r) => truncate(r.answer),
    defaults: { status: 'draft', is_visible: true },
    fields: [
      { name: 'question', label: 'Question', required: true, max: 300, full: true },
      { name: 'answer', label: 'Answer', type: 'markdown', required: true, max: 5000 },
      STATUS_FIELD,
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
