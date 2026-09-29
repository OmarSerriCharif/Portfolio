/**
 * Declarative form builder with validation, used by every dashboard page.
 *
 *   const form = createForm({ fields, values });
 *   container.append(form.element);
 *   if (form.validate()) save(form.getValues());
 *
 * Field schema:
 *   { name, label, type, required, minLength, maxLength, min, max, pattern,
 *     patternMessage, placeholder, help, rows, options, width: 'half',
 *     nullable, accept ('image'|'icon'|'pdf'), folder, from (slug source),
 *     fields (repeater sub-fields), maxItems, validate(value, allValues) }
 *
 * Types: text, password, email, url, link, tel, slug, number, date, textarea, markdown,
 *        checkbox, select, color, tags, image, file, gallery, repeater
 *
 * Uploads: files are uploaded as soon as they are picked (with preview).
 * Call form.commitUploads() after a successful save to delete replaced or
 * removed files, and form.discardUploads() when the form is cancelled to
 * delete files uploaded in this session.
 */
import { h, clear, slugify, isHttpUrl, debounce, lazyImg } from './dom.js';
import { renderMarkdown } from './markdown.js';
import { UPLOAD_RULES } from './constants.js';
import { uploadFile, deleteFilesByUrl } from './api.js';
import { toast, setBusy } from './ui.js';
import { makeSortable } from './dnd.js';

let uid = 0;
const nextId = (name) => `f-${name}-${++uid}`;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;
const PHONE_RE = /^[0-9+()\-\s.]{5,30}$/;

/** Links may be absolute http(s), mailto:, tel:, an #anchor or a relative path. */
function isValidLink(value) {
  if (/^(#|\/|\.\/|[a-z0-9-]+\.html)/i.test(value)) return !/^\/\//.test(value);
  if (/^(mailto:|tel:)/i.test(value)) return true;
  return isHttpUrl(value);
}

/** Check a file against an upload rule before sending it. Returns an error or ''. */
export function checkFile(file, ruleName) {
  const rule = UPLOAD_RULES[ruleName];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!rule.extensions.includes(ext) || (file.type && !rule.mimeTypes.includes(file.type))) {
    return `"${file.name}" is not an allowed file type (${rule.label}).`;
  }
  if (file.size > rule.maxBytes) {
    return `"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). ${rule.label}.`;
  }
  return '';
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

function validateValue(field, value, allValues) {
  const isEmpty = value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (field.required && isEmpty) return `${field.label} is required.`;
  if (isEmpty) return field.validate ? field.validate(value, allValues) || '' : '';

  if (typeof value === 'string') {
    if (field.minLength && value.trim().length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters.`;
    }
    if (field.maxLength && value.length > field.maxLength) {
      return `${field.label} must be ${field.maxLength} characters or fewer.`;
    }
  }

  switch (field.type) {
    case 'email':
      if (!EMAIL_RE.test(value)) return 'Please enter a valid email address.';
      break;
    case 'url':
      if (!isHttpUrl(value)) return 'Please enter a full URL starting with https://';
      break;
    case 'link':
      if (!isValidLink(value)) return 'Use a full URL (https://…), mailto:, tel:, or an #anchor.';
      break;
    case 'tel':
      if (!PHONE_RE.test(value)) return 'Please enter a valid phone number.';
      break;
    case 'slug':
      if (!SLUG_RE.test(value)) return 'Use lowercase letters, numbers and single hyphens only.';
      break;
    case 'color':
      if (!HEX_RE.test(value)) return 'Use a hex color like #D9A441.';
      break;
    case 'number':
      if (Number.isNaN(value)) return `${field.label} must be a number.`;
      if (field.min !== undefined && value < field.min) return `${field.label} must be at least ${field.min}.`;
      if (field.max !== undefined && value > field.max) return `${field.label} must be at most ${field.max}.`;
      break;
    case 'tags':
    case 'gallery':
      if (field.maxItems && value.length > field.maxItems) return `Add at most ${field.maxItems} items.`;
      break;
    default:
      break;
  }

  if (field.pattern && typeof value === 'string' && !field.pattern.test(value)) {
    return field.patternMessage || `${field.label} is not in the expected format.`;
  }
  return field.validate ? field.validate(value, allValues) || '' : '';
}

/* -------------------------------------------------------------------------- */
/* Field controls                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Each control factory returns { input (focus target), element, getValue, setValue? }.
 * `ctx` gives access to upload tracking.
 */
const controls = {
  text: (field, value, id) => {
    const typeMap = { email: 'email', url: 'url', tel: 'tel', text: 'text', link: 'text', slug: 'text', date: 'date', password: 'password' };
    const input = h('input', {
      id,
      name: field.name,
      type: typeMap[field.type] || 'text',
      class: 'input',
      value: value ?? '',
      placeholder: field.placeholder,
      maxlength: field.maxLength,
      autocomplete: field.autocomplete || 'off',
      spellcheck: ['url', 'link', 'slug', 'email'].includes(field.type) ? 'false' : null,
      inputmode: field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : null,
    });
    return {
      input,
      element: input,
      // Passwords are taken verbatim; everything else is trimmed.
      getValue: () => (field.type === 'password' ? input.value : input.value.trim()),
      setValue: (v) => { input.value = v ?? ''; },
    };
  },

  number: (field, value, id) => {
    const input = h('input', {
      id, name: field.name, type: 'number', class: 'input', value: value ?? '',
      min: field.min, max: field.max, step: field.step || 1, placeholder: field.placeholder, inputmode: 'numeric',
    });
    return {
      input,
      element: input,
      getValue: () => (input.value === '' ? null : Number(input.value)),
    };
  },

  textarea: (field, value, id) => {
    const input = h('textarea', {
      id, name: field.name, class: 'input textarea', rows: field.rows || 4,
      maxlength: field.maxLength, placeholder: field.placeholder,
    });
    input.value = value ?? '';
    return { input, element: withCounter(input, field), getValue: () => input.value.trim() };
  },

  markdown: (field, value, id) => {
    const input = h('textarea', {
      id, name: field.name, class: 'input textarea textarea--code', rows: field.rows || 10,
      maxlength: field.maxLength, placeholder: field.placeholder || 'Write using Markdown…',
    });
    input.value = value ?? '';
    const preview = h('div', { class: 'md-preview prose', 'aria-live': 'polite', 'aria-label': `${field.label} preview` });
    const renderPreview = () => {
      clear(preview, input.value.trim()
        ? renderMarkdown(input.value)
        : h('p', { class: 'muted', text: 'Nothing to preview yet.' }));
    };
    input.addEventListener('input', debounce(renderPreview, 150));
    renderPreview();

    // Toolbar: wraps the selection or inserts a line prefix.
    const tools = [
      { label: 'B', title: 'Bold', wrap: ['**', '**'] },
      { label: 'I', title: 'Italic', wrap: ['*', '*'] },
      { label: 'H', title: 'Heading', prefix: '## ' },
      { label: '•', title: 'Bulleted list', prefix: '- ' },
      { label: '1.', title: 'Numbered list', prefix: '1. ' },
      { label: '❝', title: 'Quote', prefix: '> ' },
      { label: '</>', title: 'Inline code', wrap: ['`', '`'] },
      { label: '🔗', title: 'Link', wrap: ['[', '](https://)'] },
    ];
    const toolbar = h('div', { class: 'md-toolbar', role: 'toolbar', 'aria-label': 'Formatting' },
      tools.map((tool) => h('button', {
        type: 'button', class: 'md-tool', title: tool.title, 'aria-label': tool.title, text: tool.label,
        on: {
          click: () => {
            const { selectionStart: start, selectionEnd: end, value: text } = input;
            let insert;
            if (tool.wrap) {
              insert = tool.wrap[0] + (text.slice(start, end) || tool.title.toLowerCase()) + tool.wrap[1];
            } else {
              const lineStart = text.lastIndexOf('\n', start - 1) + 1;
              input.setRangeText(tool.prefix, lineStart, lineStart, 'end');
              input.dispatchEvent(new Event('input'));
              input.focus();
              return;
            }
            input.setRangeText(insert, start, end, 'select');
            input.dispatchEvent(new Event('input'));
            input.focus();
          },
        },
      })));

    const element = h('div', { class: 'md-editor' },
      toolbar,
      h('div', { class: 'md-editor__panes' },
        withCounter(input, field),
        h('div', { class: 'md-editor__preview' }, h('span', { class: 'md-editor__label', text: 'Live preview' }), preview)),
    );
    return { input, element, getValue: () => input.value.trim() };
  },

  checkbox: (field, value, id) => {
    const input = h('input', { id, name: field.name, type: 'checkbox', class: 'switch__input', role: 'switch' });
    input.checked = Boolean(value ?? field.default);
    const element = h('label', { class: 'switch', for: id },
      input,
      h('span', { class: 'switch__track', 'aria-hidden': 'true' }),
      h('span', { class: 'switch__label', text: field.checkboxLabel || field.label }));
    return { input, element, getValue: () => input.checked, ownLabel: true };
  },

  select: (field, value, id) => {
    const input = h('select', { id, name: field.name, class: 'input select' },
      !field.required && h('option', { value: '', text: field.placeholder || '— None —' }),
      (field.options || []).map((opt) => h('option', { value: opt.value, text: opt.label })));
    input.value = value ?? field.default ?? (field.required ? field.options?.[0]?.value ?? '' : '');
    return { input, element: input, getValue: () => input.value || (field.nullable ? null : '') };
  },

  color: (field, value, id) => {
    const initial = HEX_RE.test(value || '') ? value : field.default || '#D9A441';
    const picker = h('input', { type: 'color', class: 'color-picker', value: initial, 'aria-label': `${field.label} picker` });
    const input = h('input', { id, name: field.name, type: 'text', class: 'input input--mono', value: initial, maxlength: 7, spellcheck: 'false' });
    picker.addEventListener('input', () => { input.value = picker.value.toUpperCase(); });
    input.addEventListener('input', () => { if (HEX_RE.test(input.value)) picker.value = input.value; });
    return { input, element: h('div', { class: 'color-field' }, picker, input), getValue: () => input.value.trim() };
  },

  tags: (field, value, id) => {
    let tags = Array.isArray(value) ? [...value] : [];
    const list = h('ul', { class: 'chips', 'aria-label': `${field.label} list` });
    const input = h('input', {
      id, type: 'text', class: 'chips__input', placeholder: field.placeholder || 'Type and press Enter', maxlength: 40,
    });
    const render = () => {
      clear(list, tags.map((tag, index) => h('li', { class: 'chip' },
        h('span', { text: tag }),
        h('button', {
          type: 'button', class: 'chip__remove', 'aria-label': `Remove ${tag}`, text: '×',
          on: { click: () => { tags.splice(index, 1); render(); input.focus(); } },
        }))));
    };
    const commit = () => {
      const parts = input.value.split(',').map((t) => t.trim()).filter(Boolean);
      for (const part of parts) if (!tags.includes(part)) tags.push(part);
      input.value = '';
      render();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Backspace' && !input.value && tags.length) {
        tags.pop();
        render();
      }
    });
    input.addEventListener('blur', commit);
    render();
    return {
      input,
      element: h('div', { class: 'chips-field' }, list, input),
      getValue: () => { commit(); return tags; },
    };
  },

  upload: (field, value, id, ctx) => {
    let current = value || null;
    const rule = field.accept || 'image';
    const isImage = rule !== 'pdf';
    const fileInput = h('input', {
      id, type: 'file', class: 'visually-hidden', tabindex: '-1',
      accept: [...UPLOAD_RULES[rule].mimeTypes, ...UPLOAD_RULES[rule].extensions.map((e) => `.${e}`)].join(','),
    });
    const preview = h('div', { class: `uploader__preview${isImage ? '' : ' uploader__preview--file'}` });
    const pickBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm' });
    const removeBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm btn--danger-text', text: 'Remove' });

    const render = () => {
      if (current) {
        clear(preview, isImage
          ? lazyImg(current, `${field.label} preview`, 'uploader__img')
          : h('a', { href: current, target: '_blank', rel: 'noopener noreferrer', class: 'uploader__file', text: '📄 View current file' }));
      } else {
        clear(preview, h('span', { class: 'uploader__empty', text: isImage ? 'No image' : 'No file' }));
      }
      pickBtn.textContent = current ? 'Replace' : 'Upload';
      removeBtn.hidden = !current;
    };

    pickBtn.addEventListener('click', () => fileInput.click());
    removeBtn.addEventListener('click', () => { current = null; render(); });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      const problem = checkFile(file, rule);
      if (problem) { toast(problem, 'error'); return; }
      setBusy(pickBtn, true, 'Uploading…');
      try {
        current = await uploadFile(file, field.folder || 'uploads');
        ctx.trackUpload(current);
        toast('File uploaded. Remember to save.', 'info', 2500);
      } catch (error) {
        toast(error.message, 'error');
      } finally {
        setBusy(pickBtn, false);
        render();
      }
    });
    render();

    return {
      input: pickBtn,
      element: h('div', { class: 'uploader' }, preview,
        h('div', { class: 'uploader__actions' }, pickBtn, removeBtn,
          h('span', { class: 'uploader__hint', text: UPLOAD_RULES[rule].label })),
        fileInput),
      getValue: () => current,
    };
  },

  gallery: (field, value, id, ctx) => {
    let urls = Array.isArray(value) ? [...value] : [];
    const max = field.maxItems || 12;
    const grid = h('ul', { class: 'gallery-editor', 'aria-label': `${field.label} images` });
    const fileInput = h('input', {
      id, type: 'file', multiple: true, class: 'visually-hidden', tabindex: '-1',
      accept: UPLOAD_RULES.image.mimeTypes.join(','),
    });
    const addBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Add images' });

    const render = () => {
      clear(grid, urls.map((url, index) => h('li', { class: 'gallery-editor__item sortable-item', dataset: { id: url } },
        h('button', { type: 'button', class: 'drag-handle', 'aria-label': `Reorder image ${index + 1}`, title: 'Drag to reorder', text: '⋮⋮' }),
        lazyImg(url, `Gallery image ${index + 1}`),
        h('button', {
          type: 'button', class: 'gallery-editor__remove', 'aria-label': `Remove image ${index + 1}`, text: '×',
          on: { click: () => { urls.splice(index, 1); render(); } },
        }))));
      addBtn.disabled = urls.length >= max;
    };
    makeSortable(grid, {
      label: 'Image',
      onReorder: (ids) => { urls = ids; render(); },
    });

    addBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const files = [...fileInput.files].slice(0, max - urls.length);
      fileInput.value = '';
      if (!files.length) return;
      setBusy(addBtn, true, 'Uploading…');
      for (const file of files) {
        const problem = checkFile(file, 'image');
        if (problem) { toast(problem, 'error'); continue; }
        try {
          const url = await uploadFile(file, field.folder || 'gallery');
          ctx.trackUpload(url);
          urls.push(url);
          render();
        } catch (error) {
          toast(error.message, 'error');
        }
      }
      setBusy(addBtn, false);
      render();
    });
    render();

    return {
      input: addBtn,
      element: h('div', { class: 'gallery-field' }, grid,
        h('div', { class: 'uploader__actions' }, addBtn,
          h('span', { class: 'uploader__hint', text: `${UPLOAD_RULES.image.label}, up to ${max} images` })),
        fileInput),
      getValue: () => [...urls],
    };
  },

  repeater: (field, value, id) => {
    const rowsEl = h('div', { class: 'repeater__rows' });
    const rows = [];
    const addBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', id, text: `+ Add ${field.itemLabel || 'item'}` });

    const sync = () => { addBtn.disabled = rows.length >= (field.maxItems || 10); };
    const addRow = (rowValue = {}) => {
      const sub = createForm({ fields: field.fields, values: rowValue, embedded: true });
      const row = h('div', { class: 'repeater__row' }, sub.element,
        h('button', {
          type: 'button', class: 'icon-btn repeater__remove', 'aria-label': `Remove ${field.itemLabel || 'item'}`, text: '×',
          on: {
            click: () => {
              rows.splice(rows.indexOf(entry), 1);
              row.remove();
              sync();
            },
          },
        }));
      const entry = { sub, row };
      rows.push(entry);
      rowsEl.append(row);
      sync();
    };
    addBtn.addEventListener('click', () => addRow());
    (Array.isArray(value) ? value : []).forEach(addRow);

    return {
      input: addBtn,
      element: h('div', { class: 'repeater' }, rowsEl, addBtn),
      getValue: () => rows.map((r) => r.sub.getValues()),
      validate: () => rows.map((r) => r.sub.validate()).every(Boolean),
    };
  },
};

const CONTROL_FOR_TYPE = {
  text: 'text', email: 'text', url: 'text', link: 'text', tel: 'text', slug: 'text', date: 'text', password: 'text',
  number: 'number', textarea: 'textarea', markdown: 'markdown', checkbox: 'checkbox',
  select: 'select', color: 'color', tags: 'tags', image: 'upload', file: 'upload',
  gallery: 'gallery', repeater: 'repeater',
};

/** Wrap an input with a live "12 / 300" character counter. */
function withCounter(input, field) {
  if (!field.maxLength) return input;
  const counter = h('span', { class: 'field__counter', 'aria-hidden': 'true' });
  const update = () => {
    counter.textContent = `${input.value.length} / ${field.maxLength}`;
    counter.classList.toggle('is-near', input.value.length > field.maxLength * 0.9);
  };
  input.addEventListener('input', update);
  update();
  return h('div', { class: 'field__with-counter' }, input, counter);
}

/* -------------------------------------------------------------------------- */
/* Form                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * @param {{ fields: object[], values?: object, embedded?: boolean }} options
 */
export function createForm({ fields, values = {}, embedded = false }) {
  const element = embedded
    ? h('div', { class: 'form-grid form-grid--embedded' })
    : h('form', { class: 'form-grid', novalidate: true });

  const initialFiles = new Set();
  const uploaded = new Set();
  const ctx = { trackUpload: (url) => uploaded.add(url) };
  const entries = [];

  for (const field of fields) {
    const id = nextId(field.name);
    const errorId = `${id}-error`;
    const helpId = `${id}-help`;
    const kind = CONTROL_FOR_TYPE[field.type || 'text'];
    const initial = values[field.name] ?? field.default;

    if (['image', 'file'].includes(field.type) && initial) initialFiles.add(initial);
    if (field.type === 'gallery' && Array.isArray(initial)) initial.forEach((u) => initialFiles.add(u));

    const control = controls[kind](field, initial, id, ctx);
    const describedBy = [field.help && helpId, errorId].filter(Boolean).join(' ');
    control.input.setAttribute('aria-describedby', describedBy);
    if (field.required) control.input.setAttribute('aria-required', 'true');

    const error = h('p', { class: 'field__error', id: errorId, hidden: true });
    const wrapper = h('div', {
      class: `field field--${field.type || 'text'}${field.width === 'half' ? ' field--half' : ''}`,
    },
      !control.ownLabel && h('label', { class: 'field__label', for: id },
        field.label, field.required && h('span', { class: 'field__req', 'aria-hidden': 'true', text: ' *' })),
      control.element,
      field.help && h('p', { class: 'field__help', id: helpId, text: field.help }),
      error,
    );
    element.append(wrapper);

    entries.push({
      field,
      control,
      setError(message) {
        error.hidden = !message;
        error.textContent = message || '';
        wrapper.classList.toggle('has-error', Boolean(message));
        if (message) control.input.setAttribute('aria-invalid', 'true');
        else control.input.removeAttribute('aria-invalid');
      },
    });
  }

  // Auto-fill slugs from their source field until the slug is edited manually.
  for (const entry of entries.filter((e) => e.field.type === 'slug' && e.field.from)) {
    const source = entries.find((e) => e.field.name === entry.field.from);
    if (!source) continue;
    let touched = Boolean(values[entry.field.name]);
    entry.control.input.addEventListener('input', () => { touched = true; });
    source.control.input.addEventListener('input', () => {
      if (!touched) entry.control.setValue(slugify(source.control.getValue()));
    });
  }

  // Clear a field's error as soon as the user edits it.
  element.addEventListener('input', (event) => {
    const entry = entries.find((e) => e.control.element.contains(event.target));
    if (entry && !['repeater'].includes(entry.field.type)) entry.setError('');
  });

  function getValues() {
    const result = {};
    for (const { field, control } of entries) {
      let value = control.getValue();
      if (value === '' && (field.nullable ?? ['url', 'image', 'file', 'email', 'tel', 'date'].includes(field.type))) {
        value = null;
      }
      result[field.name] = value;
    }
    return result;
  }

  function validate() {
    const all = getValues();
    let firstInvalid = null;
    for (const entry of entries) {
      let message = validateValue(entry.field, all[entry.field.name], all);
      if (entry.control.validate && !entry.control.validate()) message = message || 'Please fix the highlighted fields.';
      entry.setError(message);
      if (message && !firstInvalid) firstInvalid = entry;
    }
    if (firstInvalid) firstInvalid.control.input.focus();
    return !firstInvalid;
  }

  /** Files referenced by the current values. */
  function currentFiles() {
    const all = getValues();
    const urls = new Set();
    for (const { field } of entries) {
      const v = all[field.name];
      if (['image', 'file'].includes(field.type) && v) urls.add(v);
      if (field.type === 'gallery') v.forEach((u) => urls.add(u));
    }
    return urls;
  }

  /** After a successful save: delete files that are no longer referenced. */
  async function commitUploads() {
    const keep = currentFiles();
    const stale = [...initialFiles, ...uploaded].filter((u) => !keep.has(u));
    initialFiles.clear();
    keep.forEach((u) => initialFiles.add(u));
    uploaded.clear();
    try {
      await deleteFilesByUrl(stale);
    } catch (error) {
      console.warn('Could not delete unused files:', error);
    }
  }

  /** On cancel: delete files uploaded during this editing session. */
  async function discardUploads() {
    const stale = [...uploaded].filter((u) => !initialFiles.has(u));
    uploaded.clear();
    try {
      await deleteFilesByUrl(stale);
    } catch (error) {
      console.warn('Could not delete unused files:', error);
    }
  }

  return {
    element,
    getValues,
    validate,
    commitUploads,
    discardUploads,
    hasPendingUploads: () => uploaded.size > 0,
  };
}

/**
 * Validate a plain <form> built in HTML (login, contact) with the same rules.
 * `rules` maps input names to field schemas. Shows inline errors.
 */
export function validateStaticForm(form, rules) {
  let firstInvalid = null;
  const values = {};
  for (const name of Object.keys(rules)) {
    const input = form.elements[name];
    values[name] = input.type === 'checkbox' ? input.checked : input.value.trim();
  }
  for (const [name, field] of Object.entries(rules)) {
    const input = form.elements[name];
    const message = validateValue(field, values[name], values);
    const error = form.querySelector(`#${input.id}-error`);
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
    input.closest('.field')?.classList.toggle('has-error', Boolean(message));
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      firstInvalid ||= input;
    } else {
      input.removeAttribute('aria-invalid');
    }
  }
  firstInvalid?.focus();
  return firstInvalid ? null : values;
}
