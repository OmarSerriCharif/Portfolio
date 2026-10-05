/**
 * Reusable building blocks for dashboard pages:
 *   - createListManager: a sortable list with add/edit/delete + inline toggles
 *   - createSingletonEditor: an inline form for single-row tables
 * Section modules configure these instead of repeating CRUD code.
 */
import { h, clear, lazyImg } from '../dom.js';
import { createForm } from '../forms.js';
import { toast, openModal, confirmDialog, setBusy, skeletonList, emptyState, errorState, skeleton } from '../ui.js';
import { makeSortable } from '../dnd.js';
import * as api from '../api.js';

/** Page header used by every dashboard page. */
export function pageHeader(title, description, ...actions) {
  return h('header', { class: 'page-header' },
    h('div', { class: 'page-header__text' },
      h('h1', { class: 'page-header__title', text: title }),
      description && h('p', { class: 'page-header__desc', text: description })),
    actions.length > 0 && h('div', { class: 'page-header__actions' }, actions));
}

/**
 * Open a modal form to create or edit a row.
 * Resolves with the saved row, or null if cancelled.
 */
export function editInModal({ title, fields, values = {}, save }) {
  return new Promise((resolve) => {
    const form = createForm({ fields, values });
    let saved = null;
    const modal = openModal({
      title,
      size: 'lg',
      content: form.element,
      onClose: () => {
        if (!saved) form.discardUploads();
        resolve(saved);
      },
    });

    const cancel = h('button', { type: 'button', class: 'btn btn--ghost', text: 'Cancel' });
    const submit = h('button', { type: 'submit', class: 'btn btn--primary', text: 'Save' });
    // The submit button lives in the footer; associate it with the form.
    const formId = `form-${Math.random().toString(36).slice(2, 8)}`;
    form.element.id = formId;
    submit.setAttribute('form', formId);
    modal.footer.append(cancel, submit);
    cancel.addEventListener('click', () => modal.close());

    form.element.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.validate()) {
        toast('Please fix the highlighted fields.', 'error');
        return;
      }
      setBusy(submit, true, 'Saving…');
      try {
        saved = await save(form.getValues());
        await form.commitUploads();
        modal.close();
      } catch (error) {
        toast(error.message, 'error');
        setBusy(submit, false);
      }
    });

    // Focus the first field for keyboard users.
    form.element.querySelector('input:not([type=hidden]):not([type=file]), textarea, select')?.focus();
  });
}

/**
 * A managed list for a table.
 *
 * config = {
 *   table, heading, description, itemLabel,
 *   fields: (extra) => fieldSchemas,
 *   loadExtra?: async () => extra data (e.g. categories for a select),
 *   groupBy?: { field, groups: (extra) => [{ value, label }] },
 *   filter?: { column: value },
 *   title(row), meta?(row, extra), thumb?(row), badges?(row) → [{ text, tone }],
 *   toggles?: [{ field, label, on = true, off = false }],
 *   defaults?: object, orderable = true, canCreate = true, canDelete = true,
 *   fileFields?: ['cover_image_url', 'gallery'],
 *   transform?: (values, existingRow) => values,
 *   onChange?: () => void,
 * }
 */
export function createListManager(config) {
  const {
    table, heading, description, itemLabel = 'item', orderable = true,
    canCreate = true, canDelete = true, toggles = [], fileFields = [],
  } = config;

  let rows = [];
  let extra = {};
  const body = h('div', { class: 'list-manager__body' });
  const addBtn = canCreate ? h('button', { type: 'button', class: 'btn btn--primary', text: `+ Add ${itemLabel}` }) : null;

  const element = h('section', { class: 'card list-manager', 'aria-label': heading },
    h('div', { class: 'card__header' },
      h('div', {},
        h('h2', { class: 'card__title', text: heading }),
        description && h('p', { class: 'card__desc', text: description })),
      addBtn),
    body);

  const fieldsFor = () => (typeof config.fields === 'function' ? config.fields(extra) : config.fields);

  async function load() {
    clear(body, skeletonList(3));
    try {
      [extra, rows] = await Promise.all([
        config.loadExtra ? config.loadExtra() : {},
        api.listRows(table, { filter: config.filter }),
      ]);
      render();
    } catch (error) {
      clear(body, errorState({ message: error.message, onRetry: load }));
    }
  }

  function renderRow(row) {
    const badges = config.badges?.(row) || [];
    const thumbUrl = config.thumb?.(row);
    return h('li', { class: 'list-item sortable-item', dataset: { id: row.id } },
      orderable && h('button', {
        type: 'button', class: 'drag-handle',
        'aria-label': `Reorder ${config.title(row)}. Use arrow keys to move.`,
        title: 'Drag to reorder', text: '⋮⋮',
      }),
      config.thumb && (thumbUrl
        ? lazyImg(thumbUrl, '', 'list-item__thumb')
        : h('span', { class: 'list-item__thumb list-item__thumb--empty', 'aria-hidden': 'true', text: config.thumbFallback?.(row) || '—' })),
      h('div', { class: 'list-item__main' },
        h('p', { class: 'list-item__title' },
          h('span', { text: config.title(row) }),
          badges.map((b) => h('span', { class: `badge badge--${b.tone || 'neutral'}`, text: b.text }))),
        config.meta && h('p', { class: 'list-item__meta', text: config.meta(row, extra) || '' })),
      h('div', { class: 'list-item__actions' },
        toggles.map((t) => {
          const on = t.on ?? true;
          const id = `t-${t.field}-${row.id}`;
          const input = h('input', {
            type: 'checkbox', class: 'switch__input', role: 'switch', id,
            dataset: { toggle: t.field }, 'aria-label': `${t.label}: ${config.title(row)}`,
          });
          input.checked = row[t.field] === on;
          return h('label', { class: 'switch switch--sm', for: id, title: t.label },
            input,
            h('span', { class: 'switch__track', 'aria-hidden': 'true' }),
            h('span', { class: 'switch__label', text: t.label }));
        }),
        h('button', { type: 'button', class: 'btn btn--ghost btn--sm', dataset: { action: 'edit' }, text: 'Edit' }),
        canDelete && h('button', {
          type: 'button', class: 'btn btn--ghost btn--sm btn--danger-text', dataset: { action: 'delete' }, text: 'Delete',
        })));
  }

  function render() {
    if (!rows.length) {
      clear(body, emptyState({
        title: `No ${itemLabel}s yet`,
        message: canCreate ? `Add your first ${itemLabel} to show it on the site.` : '',
      }));
      return;
    }
    const groups = config.groupBy
      ? config.groupBy.groups(extra).map((g) => ({ ...g, rows: rows.filter((r) => r[config.groupBy.field] === g.value) }))
        .filter((g) => g.rows.length)
      : [{ value: null, label: null, rows }];

    clear(body, groups.map((group) => {
      const list = h('ul', { class: 'list', 'aria-label': group.label || heading }, group.rows.map(renderRow));
      if (orderable) {
        makeSortable(list, {
          label: itemLabel,
          onReorder: async (ids) => {
            try {
              await api.reorder(table, ids);
              // Keep local rows in sync with the new order.
              ids.forEach((id, index) => { const r = rows.find((x) => x.id === id); if (r) r.display_order = index; });
              rows.sort((a, b) => a.display_order - b.display_order);
              toast('Order saved.', 'success', 2000);
              config.onChange?.();
            } catch (error) {
              toast(error.message, 'error');
              load();
            }
          },
        });
      }
      return group.label
        ? h('div', { class: 'list-group' }, h('h3', { class: 'list-group__title', text: group.label }), list)
        : list;
    }));
  }

  async function openEditor(row = null) {
    const values = row || { ...(config.defaults || {}) };
    const saved = await editInModal({
      title: row ? `Edit ${itemLabel}` : `Add ${itemLabel}`,
      fields: fieldsFor(),
      values,
      save: (formValues) => {
        const payload = config.transform ? config.transform(formValues, row) : formValues;
        return row ? api.updateRow(table, row.id, payload) : api.createRow(table, payload);
      },
    });
    if (!saved) return;
    toast(row ? `${capitalize(itemLabel)} updated.` : `${capitalize(itemLabel)} added.`);
    await load();
    config.onChange?.();
  }

  async function remove(row) {
    const ok = await confirmDialog({
      title: `Delete ${itemLabel}?`,
      message: `"${config.title(row)}" will be permanently deleted. This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await api.deleteRow(table, row.id);
      const files = fileFields.flatMap((f) => [row[f]].flat()).filter(Boolean);
      await api.deleteFilesByUrl(files).catch((e) => console.warn('File cleanup failed:', e));
      toast(`${capitalize(itemLabel)} deleted.`);
      await load();
      config.onChange?.();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function toggle(row, input) {
    const t = toggles.find((x) => x.field === input.dataset.toggle);
    const value = input.checked ? (t.on ?? true) : (t.off ?? false);
    input.disabled = true;
    try {
      const updated = await api.updateRow(table, row.id, { [t.field]: value });
      Object.assign(row, updated);
      toast(`${t.label}: ${input.checked ? 'on' : 'off'}`, 'success', 1800);
      config.onChange?.();
    } catch (error) {
      input.checked = !input.checked;
      toast(error.message, 'error');
    } finally {
      input.disabled = false;
    }
  }

  // Event delegation for every row.
  body.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const row = rows.find((r) => r.id === button.closest('[data-id]')?.dataset.id);
    if (!row) return;
    if (button.dataset.action === 'edit') openEditor(row);
    if (button.dataset.action === 'delete') remove(row);
  });
  body.addEventListener('change', (event) => {
    const input = event.target.closest('[data-toggle]');
    if (!input) return;
    const row = rows.find((r) => r.id === input.closest('[data-id]')?.dataset.id);
    if (row) toggle(row, input);
  });
  addBtn?.addEventListener('click', () => openEditor());

  load();
  return { element, reload: load };
}

/**
 * Inline editor for a single-row table (site_settings, hero, about, contact_info).
 */
export function createSingletonEditor({ table, heading, description, fields, transform, afterSave }) {
  const body = h('div', { class: 'singleton__body' }, skeleton({ lines: 6 }));
  const element = h('section', { class: 'card singleton', 'aria-label': heading },
    h('div', { class: 'card__header' },
      h('div', {},
        h('h2', { class: 'card__title', text: heading }),
        description && h('p', { class: 'card__desc', text: description }))),
    body);

  async function load() {
    clear(body, skeleton({ lines: 6 }));
    try {
      const values = (await api.getSingleton(table)) || {};
      const form = createForm({ fields, values });
      const submit = h('button', { type: 'submit', class: 'btn btn--primary', text: 'Save changes' });
      form.element.append(h('div', { class: 'form-actions' }, submit));
      form.element.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.validate()) {
          toast('Please fix the highlighted fields.', 'error');
          return;
        }
        setBusy(submit, true, 'Saving…');
        try {
          const payload = transform ? transform(form.getValues()) : form.getValues();
          const saved = await api.saveSingleton(table, payload);
          await form.commitUploads();
          toast('Changes saved.');
          afterSave?.(saved);
        } catch (error) {
          toast(error.message, 'error');
        } finally {
          setBusy(submit, false);
        }
      });
      clear(body, form.element);
    } catch (error) {
      clear(body, errorState({ message: error.message, onRetry: load }));
    }
  }

  load();
  return { element, reload: load };
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
