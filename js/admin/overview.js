/** Overview: counts and recent messages. */
import { h, clear, formatDateTime } from '../dom.js';
import { getCounts, listMessages } from '../api.js';
import { skeleton, errorState, emptyState } from '../ui.js';
import { pageHeader } from './crud.js';

export const title = 'Overview';

function statCard(label, value, detail, href) {
  return h('a', { class: 'stat-card', href },
    h('span', { class: 'stat-card__label', text: label }),
    h('span', { class: 'stat-card__value', text: String(value) }),
    detail && h('span', { class: 'stat-card__detail', text: detail }));
}

export function render(container, { session }) {
  const statsEl = h('div', { class: 'stat-grid' },
    Array.from({ length: 4 }, () => h('div', { class: 'stat-card' }, skeleton({ lines: 2 }))));
  const recentEl = h('div', {}, skeleton({ lines: 4 }));

  const quickLinks = [
    ['#/projects', '＋ Add a project'],
    ['#/hero', '✎ Edit hero'],
    ['#/sections', '⇅ Reorder sections'],
    ['#/settings', '⚙ Site settings'],
  ];

  container.append(
    pageHeader(title, `Signed in as ${session.user.email}`),
    statsEl,
    h('div', { class: 'overview-grid' },
      h('section', { class: 'card' },
        h('div', { class: 'card__header' },
          h('h2', { class: 'card__title', text: 'Recent messages' }),
          h('a', { class: 'btn btn--ghost btn--sm', href: '#/messages', text: 'Open inbox' })),
        recentEl),
      h('section', { class: 'card' },
        h('div', { class: 'card__header' }, h('h2', { class: 'card__title', text: 'Quick actions' })),
        h('ul', { class: 'quick-links' }, quickLinks.map(([href, label]) =>
          h('li', {}, h('a', { class: 'quick-links__item', href, text: label })))))),
  );

  async function load() {
    try {
      const [counts, recent] = await Promise.all([getCounts(), listMessages({ limit: 5 })]);
      clear(statsEl,
        statCard('Projects', counts.projects, `${counts.published} published · ${counts.drafts} drafts`, '#/projects'),
        statCard('Messages', counts.messages, 'Total received', '#/messages'),
        statCard('Unread', counts.unread, counts.unread ? 'Waiting for a reply' : 'All caught up', '#/messages'),
        statCard('Skills', counts.skills, `${counts.testimonials} testimonials`, '#/skills'));

      clear(recentEl, recent.length
        ? h('ul', { class: 'recent-list' }, recent.map((m) => h('li', { class: m.is_read ? '' : 'is-unread' },
          h('a', { href: '#/messages', class: 'recent-list__link' },
            h('strong', { text: m.name }),
            h('span', { class: 'muted', text: m.subject || m.body.slice(0, 60) }),
            h('time', { datetime: m.created_at, class: 'muted', text: formatDateTime(m.created_at) })))))
        : emptyState({ icon: '✉', title: 'No messages yet' }));
    } catch (error) {
      clear(statsEl, errorState({ message: error.message, onRetry: () => { clear(statsEl); load(); } }));
      clear(recentEl);
    }
  }
  load();
}
