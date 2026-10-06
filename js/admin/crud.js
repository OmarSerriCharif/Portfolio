// Generic CRUD manager: list + drag-and-drop ordering + visibility/publish toggles + modal forms.
// Every content module in the dashboard is a configuration of this component.

import { el, clear, assetUrl } from '../utils.js';
import { icon, hasIcon } from '../icons.js';
import {
  adminList, adminInsert, adminUpdate, adminDelete, adminDeleteWhere, adminInsertMany,
  adminUpsertSingleton, getSingleton, reorder, deleteFileByUrl,
} from '../api.js';
import { buildForm } from './fields.js';
import { toast, openDialog, confirmDialog, loadingState, emptyState, errorState, viewHeader, withBusy } from './ui.js';

const UPLOAD_TYPES = new Set(['image', 'favicon', 'video', 'media', 'file']);

/**
 * @param {object} cfg
 *  table, singular, plural, description
 *  fields: form field definitions (see fields.js)
 *  titleField, subtitle(row) → string, image(row) → url, iconField
 *  hasStatus, hasVisibility (default true), visibilityField (default 'is_visible')
 *  orderable (default true), allowCreate / allowDelete (default true)
 *  fixed: { column: value } applied to queries and inserts (child lists)
 *  filter: { name, label, optionsFrom: { table, label } } — optional list filter
 *  badges(row) → [{ text, variant }]
 *  rowActions: [{ label, icon, onClick(row, api) }]
 *  relations: [{ field, joinTable, localKey, foreignKey }] — many-to-many saved after the row
 *  defaults: values for new rows
 *  beforeSave(payload, row) → payload
 *  dialogSize: '' | 'wide' | 'xl'
 *  heading: 'h2' header shown (false to hide)
 */
export function createCrud(cfg) {
  const options = {
    hasVisibility: true,
    visibilityField: 'is_visible',
    orderable: true,
    allowCreate: true,
    allowDelete: true,
    titleField: 'name',
    dialogSize: 'wide',
    heading: true,
    fixed: {},
    ...cfg,
  };

  let rows = [];
  let filterValue = '';
  let listEl;
  let bodyEl;
  let countEl;

  const eqFilters = () => {
    const eq = { ...options.fixed };
    if (options.filter && filterValue) eq[options.filter.name] = filterValue;
    return eq;
  };

  async function load() {
    clear(bodyEl);
    bodyEl.appendChild(loadingState());
    try {
      rows = await adminList(options.table, {
        select: options.select || '*',
        eq: eqFilters(),
        order: options.orderable ? 'display_order' : (options.order || 'created_at'),
        ascending: options.orderable ? true : options.ascending ?? false,
      });
      render();
    } catch (error) {
      clear(bodyEl);
      bodyEl.appendChild(errorState(error.message, load));
    }
  }

  function render() {
    clear(bodyEl);
    if (countEl) countEl.textContent = `${rows.length} ${rows.length === 1 ? options.singular.toLowerCase() : options.plural.toLowerCase()}`;
    if (!rows.length) {
      bodyEl.appendChild(emptyState(
        `No ${options.plural.toLowerCase()} yet`,
        options.allowCreate ? `Create your first ${options.singular.toLowerCase()} to show it on the website.` : '',
        options.allowCreate ? el('button', { type: 'button', class: 'btn btn--sm', on: { click: () => openForm(null) } }, [icon('plus', { size: 16 }), `Add ${options.singular.toLowerCase()}`]) : null,
      ));
      return;
    }
    listEl = el('ul', { class: 'item-list', role: 'list', 'aria-label': options.plural });
    rows.forEach((row, index) => listEl.appendChild(renderRow(row, index)));
    if (options.orderable) enableDragAndDrop(listEl);
    bodyEl.appendChild(listEl);
    if (options.orderable && rows.length > 1) {
      bodyEl.appendChild(el('p', { class: 'field__hint', style: { marginTop: 'var(--space-3)' }, text: 'Drag items by the handle, or use the arrow buttons, to change their order on the website.' }));
    }
  }

  function rowTitle(row) {
    return row[options.titleField] || options.titleFallback?.(row) || `Untitled ${options.singular.toLowerCase()}`;
  }

  function renderRow(row, index) {
    const title = rowTitle(row);
    const visible = options.hasVisibility ? row[options.visibilityField] !== false : true;
    const published = options.hasStatus ? row.status === 'published' : true;

    const badges = [];
    if (options.hasStatus) badges.push(el('span', { class: `badge ${published ? 'badge--success' : 'badge--muted'}`, text: published ? 'Published' : 'Draft' }));
    if (options.hasVisibility && !visible) badges.push(el('span', { class: 'badge badge--muted', text: options.visibilityField === 'is_public' ? 'Private' : 'Hidden' }));
    for (const b of options.badges?.(row) || []) badges.push(el('span', { class: `badge ${b.variant ? `badge--${b.variant}` : ''}`, text: b.text }));

    const imageUrl = options.image ? assetUrl(options.image(row)) : null;
    const iconName = options.iconField ? row[options.iconField] : null;
    const thumb = (options.image || options.iconField || options.thumbIcon)
      ? el('span', { class: 'item__thumb', 'aria-hidden': 'true' }, [
          imageUrl ? el('img', { src: imageUrl, alt: '', loading: 'lazy' }) : icon(hasIcon(iconName) ? iconName : (options.thumbIcon || 'image'), { size: 22 }),
        ])
      : el('span', { 'aria-hidden': 'true' });

    const actions = el('div', { class: 'item__actions' });
    if (options.hasStatus) {
      const btn = el('button', {
        type: 'button', class: 'btn btn--ghost btn--sm',
        'aria-label': `${published ? 'Unpublish' : 'Publish'} ${title}`,
      }, [icon(published ? 'eye-off' : 'check', { size: 16 }), published ? 'Unpublish' : 'Publish']);
      btn.addEventListener('click', () => quickUpdate(row, { status: published ? 'draft' : 'published' }, btn,
        published ? `${title} moved to drafts.` : `${title} published.`));
      actions.appendChild(btn);
    }
    if (options.hasVisibility) {
      const sw = el('button', {
        type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(visible),
        'aria-label': `${options.visibilityField === 'is_public' ? 'Public' : 'Visible'}: ${title}`,
        title: visible ? 'Visible on website' : 'Hidden from website',
      });
      sw.addEventListener('click', () => quickUpdate(row, { [options.visibilityField]: !visible }, sw,
        `${title} is now ${!visible ? 'visible' : 'hidden'}.`));
      actions.appendChild(el('span', { class: 'toggle-label' }, [sw, el('span', { 'aria-hidden': 'true', text: visible ? 'Visible' : 'Hidden' })]));
    }
    for (const action of options.rowActions || []) {
      const btn = el('button', { type: 'button', class: 'btn btn--ghost btn--sm', 'aria-label': `${action.label}: ${title}` }, [icon(action.icon || 'list', { size: 16 }), action.label]);
      btn.addEventListener('click', () => action.onClick(row, api));
      actions.appendChild(btn);
    }
    const editBtn = el('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Edit ${title}`, title: 'Edit' }, [icon('pen', { size: 16 })]);
    editBtn.addEventListener('click', () => openForm(row));
    actions.appendChild(editBtn);
    if (options.allowDelete) {
      const delBtn = el('button', { type: 'button', class: 'icon-btn icon-btn--sm icon-btn--danger', 'aria-label': `Delete ${title}`, title: 'Delete' }, [icon('trash', { size: 16 })]);
      delBtn.addEventListener('click', () => removeRow(row));
      actions.appendChild(delBtn);
    }

    const move = options.orderable
      ? el('div', { class: 'item__move' }, [
          el('button', { type: 'button', class: 'icon-btn', 'data-move': 'up', 'aria-label': `Move ${title} up`, disabled: index === 0 }, [icon('chevron-up', { size: 14 })]),
          el('button', { type: 'button', class: 'icon-btn', 'data-move': 'down', 'aria-label': `Move ${title} down`, disabled: index === rows.length - 1 }, [icon('chevron-down', { size: 14 })]),
        ])
      : el('span', { 'aria-hidden': 'true' });

    const li = el('li', {
      class: `item${visible && published ? '' : ' is-muted'}`,
      dataset: { id: row.id },
      draggable: options.orderable ? 'true' : null,
    }, [
      options.orderable
        ? el('span', { class: 'item__handle', title: 'Drag to reorder', 'aria-hidden': 'true' }, [icon('grip', { size: 18 })])
        : el('span', { 'aria-hidden': 'true' }),
      // Up/down buttons: keyboard and touch-friendly alternative to drag and drop.
      move,
      thumb,
      el('div', { class: 'item__main' }, [
        el('div', { class: 'item__title', text: title }),
        options.subtitle ? el('div', { class: 'item__subtitle', text: options.subtitle(row) || '' }) : null,
        badges.length ? el('div', { class: 'item__badges' }, badges) : null,
      ]),
      actions,
    ]);
    move.querySelectorAll('[data-move]').forEach((btn) => btn.addEventListener('click', () => moveRow(row.id, btn.dataset.move === 'up' ? -1 : 1)));
    return li;
  }

  async function quickUpdate(row, values, control, message) {
    control.disabled = true;
    try {
      const updated = await adminUpdate(options.table, row.id, values);
      Object.assign(row, updated);
      toast(message, 'success');
      render();
      options.onChange?.();
    } catch (error) {
      toast(error.message, 'error');
      control.disabled = false;
    }
  }

  async function persistOrder(message = 'Order saved.') {
    const ids = rows.map((r) => r.id);
    try {
      await reorder(options.table, ids);
      rows.forEach((r, i) => { r.display_order = i + 1; });
      toast(message, 'success', 2000);
      options.onChange?.();
    } catch (error) {
      toast(error.message, 'error');
      await load();
    }
  }

  async function moveRow(id, dir) {
    const index = rows.findIndex((r) => r.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    render();
    listEl.querySelector(`[data-id="${id}"] [data-move="${dir < 0 ? 'up' : 'down'}"]`)?.focus()
      || listEl.querySelector(`[data-id="${id}"] [data-move]`)?.focus();
    await persistOrder();
  }

  function enableDragAndDrop(list) {
    let dragged = null;
    let startOrder = '';
    list.addEventListener('dragstart', (e) => {
      const li = e.target.closest('.item');
      if (!li) return;
      dragged = li;
      startOrder = [...list.children].map((c) => c.dataset.id).join(',');
      li.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', li.dataset.id);
    });
    list.addEventListener('dragover', (e) => {
      if (!dragged) return;
      const over = e.target.closest('.item');
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!over || over === dragged) return;
      const rect = over.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      list.insertBefore(dragged, before ? over : over.nextSibling);
    });
    list.addEventListener('drop', (e) => { if (dragged) e.preventDefault(); });
    list.addEventListener('dragend', async () => {
      if (!dragged) return;
      dragged.classList.remove('is-dragging');
      dragged = null;
      const order = [...list.children].map((c) => c.dataset.id);
      if (order.join(',') === startOrder) return;
      const byId = new Map(rows.map((r) => [r.id, r]));
      rows = order.map((id) => byId.get(id)).filter(Boolean);
      render();
      await persistOrder();
    });
  }

  async function removeRow(row) {
    const ok = await confirmDialog({
      title: `Delete ${options.singular.toLowerCase()}?`,
      message: `“${rowTitle(row)}” will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await adminDelete(options.table, row.id);
      // Remove uploaded files that belonged to this record.
      for (const def of options.fields) {
        if (UPLOAD_TYPES.has(def.type) && row[def.name]) await deleteFileByUrl(row[def.name]).catch(() => {});
      }
      rows = rows.filter((r) => r.id !== row.id);
      render();
      toast(`${options.singular} deleted.`, 'success');
      options.onChange?.();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  async function loadRelations(row) {
    const values = {};
    for (const rel of options.relations || []) {
      if (!row) { values[rel.field] = []; continue; }
      const links = await adminList(rel.joinTable, { select: rel.foreignKey, eq: { [rel.localKey]: row.id }, order: null });
      values[rel.field] = links.map((l) => l[rel.foreignKey]);
    }
    return values;
  }

  async function saveRelations(id, values) {
    for (const rel of options.relations || []) {
      await adminDeleteWhere(rel.joinTable, { [rel.localKey]: id });
      await adminInsertMany(rel.joinTable, (values[rel.field] || []).map((fid) => ({ [rel.localKey]: id, [rel.foreignKey]: fid })));
    }
  }

  async function openForm(row) {
    const isNew = !row;
    const dialog = openDialog({ title: isNew ? `New ${options.singular.toLowerCase()}` : `Edit ${options.singular.toLowerCase()}`, size: options.dialogSize });
    dialog.body.appendChild(loadingState());

    let relationValues = {};
    try {
      relationValues = await loadRelations(row);
    } catch (error) {
      clear(dialog.body);
      dialog.body.appendChild(errorState(error.message));
      return;
    }

    const record = isNew ? { ...(options.defaults || {}), ...options.fixed } : { ...row };
    Object.assign(record, relationValues);
    const fields = options.fields.map((f) => ((options.relations || []).some((r) => r.field === f.name) ? { ...f, virtual: true } : f));
    const built = buildForm(fields, record);
    clear(dialog.body);
    dialog.body.appendChild(built.form);

    const cancel = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Cancel']);
    const save = el('button', { type: 'submit', class: 'btn', form: built.form.id }, [icon('check', { size: 16 }), isNew ? 'Create' : 'Save changes']);
    dialog.footer.append(cancel, save);
    cancel.addEventListener('click', () => dialog.close());

    dialog.setBeforeClose(async () => {
      if (!built.isDirty()) {
        await built.discard();
        return true;
      }
      const leave = await confirmDialog({ title: 'Discard changes?', message: 'You have unsaved changes. Close without saving?', confirmLabel: 'Discard', danger: true });
      if (leave) await built.discard();
      return leave;
    });

    built.form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { ok, values, payload } = built.validate();
      if (!ok) {
        toast('Please fix the highlighted fields.', 'error');
        return;
      }
      let data = { ...payload, ...options.fixed };
      if (options.beforeSave) data = options.beforeSave(data, row);
      dialog.setBusy(true);
      try {
        await withBusy(save, async () => {
          let saved;
          if (isNew) {
            if (options.orderable) data.display_order = rows.length ? Math.max(...rows.map((r) => r.display_order || 0)) + 1 : 1;
            saved = await adminInsert(options.table, data);
          } else {
            saved = await adminUpdate(options.table, row.id, data);
          }
          await saveRelations(saved.id, values);
          await built.afterSave();
          toast(isNew ? `${options.singular} created.` : `${options.singular} saved.`, 'success');
          dialog.setBusy(false);
          dialog.close(true);
          await load();
          options.onChange?.();
        });
      } catch (error) {
        dialog.setBusy(false);
        toast(error.message, 'error');
      }
    });
  }

  const api = { load, openForm, get rows() { return rows; } };

  function mount(container) {
    const actions = [];
    if (options.filter) {
      const id = `filter-${options.table}`;
      const select = el('select', { id, class: 'select', 'aria-label': options.filter.label }, [el('option', { value: '', text: `All ${options.filter.label.toLowerCase()}` })]);
      adminList(options.filter.optionsFrom.table, { select: `id, ${options.filter.optionsFrom.label || 'name'}` })
        .then((opts) => opts.forEach((o) => select.appendChild(el('option', { value: o.id, text: o[options.filter.optionsFrom.label || 'name'] }))))
        .catch(() => {});
      select.addEventListener('change', () => { filterValue = select.value; load(); });
      actions.push(select);
    }
    if (options.allowCreate) {
      actions.push(el('button', { type: 'button', class: 'btn btn--sm', on: { click: () => openForm(null) } }, [icon('plus', { size: 16 }), `Add ${options.singular.toLowerCase()}`]));
    }
    countEl = el('span', { class: 'muted', style: { fontSize: 'var(--fs-sm)' } });
    if (options.heading) {
      container.appendChild(viewHeader(options.plural, options.description || '', actions));
    } else if (actions.length) {
      container.appendChild(el('div', { class: 'toolbar', style: { marginBottom: 'var(--space-4)', justifyContent: 'flex-end' } }, actions));
    }
    container.appendChild(el('p', { style: { marginBottom: 'var(--space-3)' } }, [countEl]));
    bodyEl = el('div');
    container.appendChild(bodyEl);
    load();
    return api;
  }

  return { mount, load, openForm };
}

/** Open a child CRUD manager (e.g. features of a package) inside a large dialog. */
export function openChildManager(title, cfg) {
  const dialog = openDialog({ title, size: 'xl' });
  const manager = createCrud({ ...cfg, heading: false });
  manager.mount(dialog.body);
  const done = el('button', { type: 'button', class: 'btn' }, ['Done']);
  done.addEventListener('click', () => dialog.close());
  dialog.footer.appendChild(done);
  return dialog;
}

/**
 * Editor for single-row tables (site_settings, hero, about).
 * cfg: { table, title, description, fields }
 */
export function createSingletonForm(cfg) {
  async function mount(container) {
    container.appendChild(viewHeader(cfg.title, cfg.description || ''));
    const panel = el('div', { class: 'panel' });
    const body = el('div', { class: 'panel__body' }, [loadingState()]);
    panel.appendChild(body);
    container.appendChild(panel);

    const load = async () => {
      clear(body);
      body.appendChild(loadingState());
      let record;
      try {
        record = (await getSingleton(cfg.table)) || { ...(cfg.defaults || {}) };
      } catch (error) {
        clear(body);
        body.appendChild(errorState(error.message, load));
        return;
      }
      const built = buildForm(cfg.fields, record);
      const save = el('button', { type: 'submit', class: 'btn' }, [icon('check', { size: 16 }), 'Save changes']);
      built.form.appendChild(el('div', { class: 'toolbar', style: { marginTop: 'var(--space-6)', justifyContent: 'flex-end' } }, [save]));
      built.form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const { ok, payload } = built.validate();
        if (!ok) {
          toast('Please fix the highlighted fields.', 'error');
          return;
        }
        try {
          await withBusy(save, async () => {
            await adminUpsertSingleton(cfg.table, cfg.beforeSave ? cfg.beforeSave(payload) : payload);
            await built.afterSave();
          });
          toast(`${cfg.title} saved.`, 'success');
          cfg.onSaved?.(payload);
        } catch (error) {
          toast(error.message, 'error');
        }
      });
      clear(body);
      body.appendChild(built.form);
    };
    await load();
  }
  return { mount };
}
