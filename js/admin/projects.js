/** Projects with drafts, featured flag, Markdown content and gallery. */
import { createListManager, pageHeader } from './crud.js';

export const title = 'Projects';

export function render(container) {
  const list = createListManager({
    table: 'projects',
    heading: 'All projects',
    description: 'Drafts are never visible on the public site.',
    itemLabel: 'project',
    thumb: (row) => row.cover_image_url,
    thumbFallback: (row) => row.title.charAt(0).toUpperCase(),
    title: (row) => row.title,
    meta: (row) => `/${row.slug}${row.category ? ` · ${row.category}` : ''}`,
    badges: (row) => [
      row.status === 'published' ? { text: 'Published', tone: 'success' } : { text: 'Draft', tone: 'warning' },
      row.is_featured && { text: '★ Featured', tone: 'primary' },
    ].filter(Boolean),
    toggles: [
      { field: 'status', label: 'Published', on: 'published', off: 'draft' },
      { field: 'is_featured', label: 'Featured' },
    ],
    fileFields: ['cover_image_url', 'gallery'],
    defaults: { status: 'draft', is_featured: false },
    fields: [
      { name: 'title', label: 'Title', required: true, maxLength: 120, width: 'half' },
      {
        name: 'slug', label: 'Slug (URL)', type: 'slug', from: 'title', required: true, maxLength: 80, width: 'half',
        help: 'Used in project.html?slug=…',
      },
      { name: 'category', label: 'Category', maxLength: 40, width: 'half', placeholder: 'Content Brand' },
      {
        name: 'status', label: 'Status', type: 'select', required: true, width: 'half',
        options: [{ value: 'draft', label: 'Draft (hidden)' }, { value: 'published', label: 'Published' }],
      },
      { name: 'summary', label: 'Short description', type: 'textarea', rows: 3, required: true, maxLength: 300 },
      { name: 'content', label: 'Full content', type: 'markdown', rows: 14, maxLength: 20000 },
      { name: 'cover_image_url', label: 'Cover image', type: 'image', folder: 'projects' },
      { name: 'gallery', label: 'Image gallery', type: 'gallery', folder: 'projects', maxItems: 12 },
      { name: 'tech_stack', label: 'Tech stack / tags', type: 'tags', maxItems: 20 },
      { name: 'live_url', label: 'Live URL', type: 'url', maxLength: 500, width: 'half' },
      { name: 'github_url', label: 'GitHub URL', type: 'url', maxLength: 500, width: 'half' },
      { name: 'is_featured', label: 'Featured', type: 'checkbox', checkboxLabel: 'Feature this project' },
    ],
  });
  container.append(pageHeader(title, 'Showcase your best work.'), list.element);
}
