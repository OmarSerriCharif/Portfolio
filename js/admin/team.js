import { createCrud } from './crud.js';
import { VISIBLE_FIELD, truncate } from './common.js';

const PLATFORMS = 'instagram, facebook, x, linkedin, tiktok, youtube, whatsapp, behance, website';

export function render(view) {
  createCrud({
    table: 'team_members',
    singular: 'Team member',
    plural: 'Team',
    image: (r) => r.photo_url,
    subtitle: (r) => [r.job_title, truncate(r.bio, 60)].filter(Boolean).join(' · '),
    defaults: { is_visible: true, social_links: [] },
    fields: [
      { name: 'name', label: 'Name', required: true, max: 120 },
      { name: 'job_title', label: 'Job title', max: 120 },
      { name: 'bio', label: 'Short bio', type: 'textarea', max: 1000, full: true },
      { name: 'photo_url', label: 'Photo', type: 'image', upload: { kind: 'image', folder: 'team' } },
      { name: 'social_links', label: 'Social links', type: 'pairs', keys: ['platform', 'url'], urlKey: 'url', full: true,
        hint: `One per line: platform | https://… (platforms: ${PLATFORMS})`,
        validate: (rows) => (rows.some((r) => !/^https?:\/\//.test(r.url || '')) ? 'Each social link needs a full https:// URL.' : null) },
      VISIBLE_FIELD,
    ],
  }).mount(view);
}
