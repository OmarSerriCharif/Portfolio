import { countRows, adminList } from '../api.js';
import { el, formatDate } from '../utils.js';
import { icon } from '../icons.js';
import { viewHeader, loadingState, errorState, emptyState } from './ui.js';
import { truncate } from './common.js';

const STATUS_TABLES = ['services', 'pricing_packages', 'addons', 'case_studies', 'testimonials', 'faqs'];

function statCard(label, value, iconName, href) {
  return el(href ? 'a' : 'div', { class: 'stat-card', href: href || null }, [
    el('span', { class: 'stat-card__label' }, [icon(iconName, { size: 18 }), label]),
    el('span', { class: 'stat-card__value', text: String(value) }),
  ]);
}

export async function render(view) {
  view.appendChild(viewHeader('Overview', 'Live counts from your database.'));
  const body = el('div');
  view.appendChild(body);

  const load = async () => {
    body.replaceChildren(loadingState());
    try {
      const [services, packages, addons, caseStudies, testimonials, messages, unread, published, drafts, recent] = await Promise.all([
        countRows('services'),
        countRows('pricing_packages'),
        countRows('addons'),
        countRows('case_studies'),
        countRows('testimonials'),
        countRows('contact_messages'),
        countRows('contact_messages', { is_read: false }),
        Promise.all(STATUS_TABLES.map((t) => countRows(t, { status: 'published' }))).then((a) => a.reduce((x, y) => x + y, 0)),
        Promise.all(STATUS_TABLES.map((t) => countRows(t, { status: 'draft' }))).then((a) => a.reduce((x, y) => x + y, 0)),
        adminList('contact_messages', { order: 'created_at', ascending: false, range: [0, 4] }),
      ]);

      const cards = el('div', { class: 'stat-cards' }, [
        statCard('Services', services, 'briefcase', '#/services'),
        statCard('Pricing packages', packages, 'tag', '#/pricing'),
        statCard('Add-ons', addons, 'plus', '#/addons'),
        statCard('Case studies', caseStudies, 'image', '#/case-studies'),
        statCard('Testimonials', testimonials, 'message', '#/testimonials'),
        statCard('Leads / messages', messages, 'inbox', '#/messages'),
        statCard('Unread messages', unread, 'mail', '#/messages'),
        statCard('Published content', published, 'eye'),
        statCard('Draft content', drafts, 'eye-off'),
      ]);

      const recentPanel = el('section', { class: 'panel', 'aria-labelledby': 'recent-title' }, [
        el('div', { class: 'panel__header' }, [
          el('h3', { id: 'recent-title', text: 'Latest messages' }),
          el('a', { class: 'btn btn--outline btn--sm', href: '#/messages' }, ['Open inbox', icon('arrow-right', { size: 14 })]),
        ]),
        el('div', { class: 'panel__body' }, [
          recent.length
            ? el('ul', { class: 'inbox__list', role: 'list' }, recent.map((m) => el('li', {}, [
                el('a', { class: `message-row${m.is_read ? '' : ' is-unread'}`, href: `#/messages?id=${m.id}`, style: { textDecoration: 'none' } }, [
                  el('span', { class: 'message-row__top' }, [
                    el('span', { class: 'message-row__name', text: m.name }),
                    el('span', { class: 'message-row__date', text: formatDate(m.created_at, true) }),
                  ]),
                  el('span', { class: 'message-row__preview', text: truncate(m.message, 100) }),
                ]),
              ])))
            : emptyState('No messages yet', 'Leads from the contact form will appear here.'),
        ]),
      ]);

      body.replaceChildren(cards, recentPanel);
    } catch (error) {
      body.replaceChildren(errorState(error.message, load));
    }
  };
  await load();
}
