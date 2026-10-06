// Lead / message inbox.
import { adminList, adminUpdate, adminDelete } from '../api.js';
import { el, clear, formatDate, EMAIL_RE } from '../utils.js';
import { icon } from '../icons.js';
import { viewHeader, loadingState, errorState, emptyState, toast, confirmDialog, withBusy } from './ui.js';
import { truncate } from './common.js';

const PAGE_SIZE = 20;
const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];
const STATUS_VARIANT = { new: 'accent', contacted: 'primary', qualified: 'primary', converted: 'success', closed: 'muted' };

export async function render(view, ctx) {
  const state = { page: 0, status: '', read: '', search: '', rows: [], total: 0, selectedId: ctx.params.get('id') };

  const statusFilter = el('select', { class: 'select', 'aria-label': 'Filter by status' }, [
    el('option', { value: '', text: 'All statuses' }),
    ...STATUSES.map((s) => el('option', { value: s.value, text: s.label })),
  ]);
  const readFilter = el('select', { class: 'select', 'aria-label': 'Filter by read state' }, [
    el('option', { value: '', text: 'Read & unread' }),
    el('option', { value: 'unread', text: 'Unread only' }),
    el('option', { value: 'read', text: 'Read only' }),
  ]);
  const search = el('input', { type: 'search', class: 'input', placeholder: 'Search name or email…', 'aria-label': 'Search messages', maxlength: 100 });

  view.appendChild(viewHeader('Messages', 'Leads submitted through the contact form.', [search, statusFilter, readFilter]));

  const listCol = el('div');
  const detailCol = el('div', { class: 'message-detail' });
  view.appendChild(el('div', { class: 'inbox' }, [listCol, detailCol]));

  const load = async () => {
    listCol.replaceChildren(loadingState());
    try {
      const { rows, total } = await adminList('contact_messages', {
        order: 'created_at',
        ascending: false,
        count: true,
        range: [state.page * PAGE_SIZE, state.page * PAGE_SIZE + PAGE_SIZE - 1],
        filters: (q) => {
          let query = q;
          if (state.status) query = query.eq('status', state.status);
          if (state.read) query = query.eq('is_read', state.read === 'read');
          if (state.search) {
            const term = state.search.replace(/[%,()*]/g, ' ').trim();
            if (term) query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,company.ilike.%${term}%`);
          }
          return query;
        },
      });
      state.rows = rows;
      state.total = total;
      renderList();
      if (state.selectedId) {
        const row = rows.find((r) => r.id === state.selectedId);
        if (row) showDetail(row);
      } else {
        detailCol.replaceChildren(emptyState('Select a message', 'Choose a message from the list to read it.'));
      }
    } catch (error) {
      listCol.replaceChildren(errorState(error.message, load));
    }
  };

  const renderList = () => {
    clear(listCol);
    if (!state.rows.length) {
      listCol.appendChild(emptyState('No messages', state.status || state.read || state.search ? 'No messages match these filters.' : 'Leads from the website will appear here.'));
      return;
    }
    const list = el('ul', { class: 'inbox__list', role: 'list', 'aria-label': 'Messages' });
    for (const row of state.rows) {
      const btn = el('button', {
        type: 'button',
        class: `message-row${row.is_read ? '' : ' is-unread'}`,
        'aria-current': row.id === state.selectedId ? 'true' : 'false',
      }, [
        el('span', { class: 'message-row__top' }, [
          el('span', { class: 'message-row__name' }, [row.name, row.is_read ? null : el('span', { class: 'sr-only', text: ' (unread)' })]),
          el('span', { class: 'message-row__date', text: formatDate(row.created_at, true) }),
        ]),
        el('span', { class: 'message-row__preview', text: [row.service, truncate(row.message, 80)].filter(Boolean).join(' — ') }),
        el('span', {}, [el('span', { class: `badge badge--${STATUS_VARIANT[row.status]}`, text: STATUSES.find((s) => s.value === row.status)?.label || row.status })]),
      ]);
      btn.addEventListener('click', () => showDetail(row, true));
      list.appendChild(el('li', {}, [btn]));
    }
    listCol.appendChild(list);

    const pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    const prev = el('button', { type: 'button', class: 'btn btn--outline btn--sm', disabled: state.page === 0 }, [icon('arrow-left', { size: 14 }), 'Previous']);
    const next = el('button', { type: 'button', class: 'btn btn--outline btn--sm', disabled: state.page >= pages - 1 }, ['Next', icon('arrow-right', { size: 14 })]);
    prev.addEventListener('click', () => { state.page -= 1; load(); });
    next.addEventListener('click', () => { state.page += 1; load(); });
    listCol.appendChild(el('div', { class: 'pagination' }, [prev, el('span', { text: `Page ${state.page + 1} of ${pages} · ${state.total} total` }), next]));
  };

  const showDetail = async (row, focus = false) => {
    state.selectedId = row.id;
    listCol.querySelectorAll('.message-row').forEach((b, i) => b.setAttribute('aria-current', String(state.rows[i]?.id === row.id)));

    if (!row.is_read) {
      try {
        Object.assign(row, await adminUpdate('contact_messages', row.id, { is_read: true }));
        renderList();
        ctx.refreshUnread?.();
      } catch (error) {
        toast(error.message, 'error');
      }
    }

    const statusSelect = el('select', { id: 'msg-status', class: 'select' }, STATUSES.map((s) => el('option', { value: s.value, text: s.label })));
    statusSelect.value = row.status;
    const notes = el('textarea', { id: 'msg-notes', class: 'textarea', rows: 4, maxlength: 5000 });
    notes.value = row.notes || '';
    const save = el('button', { type: 'button', class: 'btn btn--sm' }, [icon('check', { size: 14 }), 'Save']);
    const toggleRead = el('button', { type: 'button', class: 'btn btn--outline btn--sm' }, [icon('mail', { size: 14 }), 'Mark as unread']);
    const del = el('button', { type: 'button', class: 'btn btn--danger btn--sm' }, [icon('trash', { size: 14 }), 'Delete']);

    save.addEventListener('click', () => withBusy(save, async () => {
      try {
        Object.assign(row, await adminUpdate('contact_messages', row.id, { status: statusSelect.value, notes: notes.value.trim() || null }));
        toast('Message updated.', 'success');
        renderList();
      } catch (error) {
        toast(error.message, 'error');
      }
    }));
    toggleRead.addEventListener('click', async () => {
      try {
        Object.assign(row, await adminUpdate('contact_messages', row.id, { is_read: false }));
        toast('Marked as unread.', 'success');
        state.selectedId = null;
        renderList();
        detailCol.replaceChildren(emptyState('Select a message', 'Choose a message from the list to read it.'));
        ctx.refreshUnread?.();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
    del.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'Delete message?', message: `The message from ${row.name} will be permanently deleted.`, confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      try {
        await adminDelete('contact_messages', row.id);
        toast('Message deleted.', 'success');
        state.selectedId = null;
        await load();
        ctx.refreshUnread?.();
      } catch (error) {
        toast(error.message, 'error');
      }
    });

    const meta = el('dl', { class: 'message-detail__meta' });
    const add = (term, value) => { if (value) meta.append(el('div', {}, [el('dt', { text: term }), el('dd', {}, [value])])); };
    add('Email', EMAIL_RE.test(row.email) ? el('a', { href: `mailto:${row.email}`, text: row.email }) : row.email);
    add('Phone', row.phone ? el('a', { href: `tel:${row.phone.replace(/[^+0-9]/g, '')}`, text: row.phone }) : null);
    add('Company', row.company);
    add('Service', row.service);
    add('Budget', row.budget);
    add('Received', formatDate(row.created_at, true));
    add('Page', row.source_page);

    const heading = el('h3', { tabindex: '-1', text: row.name });
    detailCol.replaceChildren(el('article', { class: 'panel', 'aria-label': `Message from ${row.name}` }, [
      el('div', { class: 'panel__header' }, [heading, el('div', { class: 'toolbar' }, [toggleRead, del])]),
      el('div', { class: 'panel__body' }, [
        meta,
        el('div', { class: 'message-detail__body', text: row.message }),
        el('div', { class: 'form-grid', style: { marginTop: 'var(--space-5)' } }, [
          el('div', { class: 'field' }, [el('label', { for: 'msg-status', text: 'Status' }), statusSelect]),
          el('div', { class: 'field field--full' }, [el('label', { for: 'msg-notes', text: 'Internal notes' }), notes]),
        ]),
        el('div', { class: 'toolbar', style: { marginTop: 'var(--space-4)', justifyContent: 'flex-end' } }, [
          EMAIL_RE.test(row.email) ? el('a', { class: 'btn btn--outline btn--sm', href: `mailto:${row.email}?subject=${encodeURIComponent('Re: your enquiry')}` }, [icon('mail', { size: 14 }), 'Reply by email']) : null,
          save,
        ]),
      ]),
    ]));
    if (focus) heading.focus();
  };

  let searchTimer;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.search = search.value.trim(); state.page = 0; load(); }, 300);
  });
  statusFilter.addEventListener('change', () => { state.status = statusFilter.value; state.page = 0; load(); });
  readFilter.addEventListener('change', () => { state.read = readFilter.value; state.page = 0; load(); });

  await load();
}
