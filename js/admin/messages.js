/** Messages inbox: read, mark read/unread, delete. */
import { h, clear, formatDateTime } from '../dom.js';
import { listMessages, setMessageRead, deleteMessage } from '../api.js';
import { toast, confirmDialog, openModal, skeletonList, emptyState, errorState } from '../ui.js';
import { pageHeader } from './crud.js';

export const title = 'Messages';

/** Let the shell refresh the unread badge. */
const notifyChanged = () => document.dispatchEvent(new CustomEvent('messages:changed'));

export function render(container) {
  let messages = [];
  let filter = 'all';

  const filterButtons = [['all', 'All'], ['unread', 'Unread']].map(([value, label]) =>
    h('button', {
      type: 'button', class: 'segmented__btn', dataset: { filter: value },
      'aria-pressed': String(value === filter), text: label,
    }));
  const segmented = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Filter messages' }, filterButtons);
  const body = h('div', { class: 'inbox' });

  container.append(
    pageHeader(title, 'Messages sent through your contact form.', segmented),
    h('section', { class: 'card' }, body),
  );

  async function load() {
    clear(body, skeletonList(4));
    try {
      messages = await listMessages({ unreadOnly: filter === 'unread' });
      renderList();
    } catch (error) {
      clear(body, errorState({ message: error.message, onRetry: load }));
    }
  }

  function renderList() {
    if (!messages.length) {
      clear(body, emptyState({
        icon: '✉',
        title: filter === 'unread' ? 'No unread messages' : 'Your inbox is empty',
        message: filter === 'unread' ? 'You are all caught up.' : 'Messages from the contact form will appear here.',
      }));
      return;
    }
    clear(body, h('ul', { class: 'inbox__list' }, messages.map((m) =>
      h('li', { class: `inbox__item${m.is_read ? '' : ' is-unread'}`, dataset: { id: m.id } },
        h('button', { type: 'button', class: 'inbox__open', dataset: { action: 'open' } },
          h('span', { class: 'inbox__dot', 'aria-hidden': 'true' }),
          h('span', { class: 'inbox__from' },
            h('strong', { text: m.name }),
            h('span', { class: 'muted', text: ` <${m.email}>` }),
            !m.is_read && h('span', { class: 'visually-hidden', text: ' (unread)' })),
          h('span', { class: 'inbox__subject', text: m.subject || '(no subject)' }),
          h('span', { class: 'inbox__excerpt', text: m.body.slice(0, 140) }),
          h('time', { class: 'inbox__date', datetime: m.created_at, text: formatDateTime(m.created_at) })),
        h('div', { class: 'inbox__actions' },
          h('button', {
            type: 'button', class: 'btn btn--ghost btn--sm', dataset: { action: 'toggle-read' },
            text: m.is_read ? 'Mark unread' : 'Mark read',
          }),
          h('button', { type: 'button', class: 'btn btn--ghost btn--sm btn--danger-text', dataset: { action: 'delete' }, text: 'Delete' }))))));
  }

  async function markRead(message, isRead, { silent = false } = {}) {
    try {
      await setMessageRead(message.id, isRead);
      message.is_read = isRead;
      if (filter === 'unread' && isRead) messages = messages.filter((m) => m !== message);
      renderList();
      notifyChanged();
      if (!silent) toast(isRead ? 'Marked as read.' : 'Marked as unread.', 'success', 1800);
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function remove(message) {
    const ok = await confirmDialog({
      title: 'Delete message?',
      message: `The message from ${message.name} will be permanently deleted.`,
    });
    if (!ok) return false;
    try {
      await deleteMessage(message.id);
      messages = messages.filter((m) => m !== message);
      renderList();
      notifyChanged();
      toast('Message deleted.');
      return true;
    } catch (error) {
      toast(error.message, 'error');
      return false;
    }
  }

  function open(message) {
    const subject = message.subject ? `Re: ${message.subject}` : 'Re: your message';
    const content = h('article', { class: 'message-view' },
      h('dl', { class: 'message-view__meta' },
        h('dt', { text: 'From' }), h('dd', { text: `${message.name} <${message.email}>` }),
        h('dt', { text: 'Subject' }), h('dd', { text: message.subject || '(no subject)' }),
        h('dt', { text: 'Received' }), h('dd', { text: formatDateTime(message.created_at) })),
      h('p', { class: 'message-view__body', text: message.body }));
    const modal = openModal({ title: 'Message', content, size: 'md' });

    const reply = h('a', {
      class: 'btn btn--primary',
      href: `mailto:${message.email}?subject=${encodeURIComponent(subject)}`,
      text: 'Reply by email',
    });
    const unread = h('button', { type: 'button', class: 'btn btn--ghost', text: 'Mark unread' });
    const del = h('button', { type: 'button', class: 'btn btn--ghost btn--danger-text', text: 'Delete' });
    unread.addEventListener('click', async () => { modal.close(); await markRead(message, false); });
    del.addEventListener('click', async () => { if (await remove(message)) modal.close(); });
    modal.footer.append(del, unread, reply);

    if (!message.is_read) markRead(message, true, { silent: true });
  }

  body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const message = messages.find((m) => m.id === button.closest('[data-id]')?.dataset.id);
    if (!message) return;
    if (button.dataset.action === 'open') open(message);
    if (button.dataset.action === 'toggle-read') markRead(message, !message.is_read);
    if (button.dataset.action === 'delete') remove(message);
  });

  segmented.addEventListener('click', (event) => {
    const button = event.target.closest('[data-filter]');
    if (!button || button.dataset.filter === filter) return;
    filter = button.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    load();
  });

  load();
}
