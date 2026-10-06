// Declarative form builder for the dashboard. Validation rules mirror the CHECK constraints in setup.sql.

import { el, clear, slugify, debounce, assetUrl, URL_RE, EMAIL_RE, PHONE_RE, SLUG_RE, COLOR_RE, CURRENCY_RE } from '../utils.js';
import { icon, ICON_NAMES } from '../icons.js';
import { renderMarkdown } from '../markdown.js';
import { adminList, uploadFile, deleteFileByUrl, BUCKETS } from '../api.js';
import { toast } from './ui.js';

let fieldCounter = 0;

export const UPLOAD_RULES = {
  image: {
    bucket: BUCKETS.media,
    mimes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    exts: ['png', 'jpg', 'jpeg', 'webp', 'gif'],
    maxSize: 5 * 1024 * 1024,
    accept: 'image/png,image/jpeg,image/webp,image/gif',
  },
  favicon: {
    bucket: BUCKETS.media,
    mimes: ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon'],
    exts: ['png', 'ico'],
    maxSize: 1024 * 1024,
    accept: '.png,.ico,image/png,image/x-icon',
  },
  video: {
    bucket: BUCKETS.media,
    mimes: ['video/mp4', 'video/webm'],
    exts: ['mp4', 'webm'],
    maxSize: 25 * 1024 * 1024,
    accept: 'video/mp4,video/webm',
  },
  media: {
    bucket: BUCKETS.media,
    mimes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
    exts: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm'],
    maxSize: 25 * 1024 * 1024,
    imageMaxSize: 5 * 1024 * 1024,
    accept: 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm',
  },
  document: {
    bucket: BUCKETS.documents,
    mimes: ['application/pdf'],
    exts: ['pdf'],
    maxSize: 20 * 1024 * 1024,
    accept: 'application/pdf,.pdf',
  },
};

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function validateFile(file, kind) {
  const rule = UPLOAD_RULES[kind];
  if (!rule) return 'Unsupported upload type.';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!rule.exts.includes(ext)) return `Allowed file types: ${rule.exts.join(', ')}.`;
  // Some systems report .ico with an empty MIME type; the extension check above still applies.
  if (file.type && !rule.mimes.includes(file.type)) return `This file type (${file.type}) is not allowed.`;
  if (!file.type && kind !== 'favicon') return 'The file type could not be detected.';
  if (file.size > rule.maxSize) return `File is too large. Maximum size is ${formatBytes(rule.maxSize)}.`;
  if (rule.imageMaxSize && file.type.startsWith('image/') && file.size > rule.imageMaxSize) {
    return `Images can be at most ${formatBytes(rule.imageMaxSize)}.`;
  }
  if (file.size === 0) return 'The file is empty.';
  return null;
}

/* ------------------------------------------------------------------ */
/*  Individual controls                                                */
/* ------------------------------------------------------------------ */

function fieldWrapper(def, id, control, { counter = null } = {}) {
  const hintId = def.hint ? `${id}-hint` : null;
  const errorId = `${id}-error`;
  const error = el('span', { class: 'field__error', id: errorId, 'aria-live': 'polite' });
  const labelEl = def.type === 'checkbox'
    ? null
    : el(def.group ? 'span' : 'label', { class: def.group ? 'field__label' : null, for: def.group ? null : id, id: `${id}-label` }, [
        def.label,
        def.required ? el('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : null,
        def.required ? el('span', { class: 'sr-only', text: ' (required)' }) : null,
      ]);
  const wrapper = el('div', { class: `field${def.full ? ' field--full' : ''}` }, [
    labelEl,
    control,
    def.hint ? el('span', { class: 'field__hint', id: hintId, text: def.hint }) : null,
    counter,
    error,
  ]);
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');
  return { wrapper, error, describedBy };
}

function attachCounter(input, max) {
  if (!max) return null;
  const counter = el('span', { class: 'field__counter', 'aria-hidden': 'true' });
  const update = () => { counter.textContent = `${input.value.length} / ${max}`; };
  input.addEventListener('input', update);
  update();
  return { counter, update };
}

function basicInput(def, id, value) {
  const typeMap = { email: 'email', tel: 'tel', number: 'number', color: 'color', date: 'date', url: 'text', slug: 'text', text: 'text', password: 'password', currency: 'text' };
  const input = el('input', {
    id,
    name: def.name,
    type: typeMap[def.type] || 'text',
    class: 'input',
    maxlength: def.max || null,
    min: def.minNum ?? null,
    max: def.maxNum ?? null,
    step: def.step || (def.type === 'number' ? 'any' : null),
    placeholder: def.placeholder || null,
    inputmode: def.type === 'url' ? 'url' : null,
    autocomplete: def.autocomplete || 'off',
    spellcheck: def.type === 'slug' || def.type === 'url' ? 'false' : null,
  });
  if (value !== null && value !== undefined) input.value = def.type === 'color' ? (value || '#000000') : String(value);
  const counter = ['text', 'url'].includes(def.type || 'text') ? attachCounter(input, def.max) : null;
  const { wrapper, error, describedBy } = fieldWrapper(def, id, input, { counter: counter?.counter });
  input.setAttribute('aria-describedby', describedBy);
  return {
    wrapper, error, input,
    focus: () => input.focus(),
    get: () => {
      const raw = input.value.trim();
      if (def.type === 'number') return raw === '' ? null : Number(raw);
      if (def.type === 'currency') return raw.toUpperCase() || null;
      return raw === '' ? null : raw;
    },
    set: (v) => { input.value = v ?? ''; counter?.update(); },
  };
}

function textareaInput(def, id, value) {
  const textarea = el('textarea', { id, name: def.name, class: 'textarea', rows: def.rows || 4, maxlength: def.max || null, placeholder: def.placeholder || null });
  textarea.value = value ?? '';
  const counter = attachCounter(textarea, def.max);
  const { wrapper, error, describedBy } = fieldWrapper(def, id, textarea, { counter: counter?.counter });
  textarea.setAttribute('aria-describedby', describedBy);
  return {
    wrapper, error, input: textarea,
    focus: () => textarea.focus(),
    get: () => (textarea.value.trim() === '' ? null : textarea.value.trim()),
  };
}

function markdownInput(def, id, value) {
  const textarea = el('textarea', { id, name: def.name, class: 'textarea', rows: def.rows || 10, maxlength: def.max || null });
  textarea.value = value ?? '';
  const previewId = `${id}-preview`;
  const preview = el('div', { class: 'md-preview prose', id: previewId, 'aria-live': 'polite', 'aria-label': 'Live preview' });
  const update = () => preview.replaceChildren(renderMarkdown(textarea.value, { headingStart: 3 }));
  textarea.addEventListener('input', debounce(update, 150));
  update();
  const counter = attachCounter(textarea, def.max);
  const control = el('div', { class: 'md-editor' }, [textarea, preview]);
  const hintDef = { ...def, hint: def.hint || 'Markdown: # Heading, **bold**, *italic*, [link](https://…), - list, 1. list, > quote. HTML is not rendered.' };
  const { wrapper, error, describedBy } = fieldWrapper(hintDef, id, control, { counter: counter?.counter });
  textarea.setAttribute('aria-describedby', describedBy);
  return {
    wrapper, error, input: textarea,
    focus: () => textarea.focus(),
    get: () => (textarea.value.trim() === '' ? null : textarea.value.trim()),
  };
}

function selectInput(def, id, value) {
  const select = el('select', { id, name: def.name, class: 'select' });
  const fill = (options) => {
    clear(select);
    if (def.nullable !== false && !def.required) select.appendChild(el('option', { value: '', text: def.emptyLabel || '— None —' }));
    for (const opt of options) select.appendChild(el('option', { value: String(opt.value), text: opt.label }));
    if (value !== null && value !== undefined) select.value = String(value);
    else if (def.default !== undefined) select.value = String(def.default);
  };
  fill(def.options || []);
  if (def.optionsFrom) {
    select.disabled = true;
    const { table, label = 'name', valueKey = 'id', order = 'display_order' } = def.optionsFrom;
    adminList(table, { select: `${valueKey}, ${label}`, order })
      .then((rows) => fill(rows.map((r) => ({ value: r[valueKey], label: r[label] }))))
      .catch((err) => toast(err.message, 'error'))
      .finally(() => { select.disabled = false; });
  }
  const { wrapper, error, describedBy } = fieldWrapper(def, id, select);
  select.setAttribute('aria-describedby', describedBy);
  return {
    wrapper, error, input: select,
    focus: () => select.focus(),
    get: () => {
      if (select.value === '') return null;
      if (def.numeric) return Number(select.value);
      return select.value;
    },
  };
}

function iconInput(def, id, value) {
  const options = ICON_NAMES.map((n) => ({ value: n, label: n }));
  const ctrl = selectInput({ ...def, options }, id, value);
  const preview = el('span', { class: 'icon-picker__preview', 'aria-hidden': 'true' });
  const update = () => preview.replaceChildren(ctrl.input.value ? icon(ctrl.input.value, { size: 22 }) : '');
  ctrl.input.addEventListener('change', update);
  update();
  const picker = el('div', { class: 'icon-picker' }, [preview]);
  ctrl.input.replaceWith(picker);
  picker.appendChild(ctrl.input);
  return ctrl;
}

function checkboxInput(def, id, value) {
  const input = el('input', { id, name: def.name, type: 'checkbox' });
  input.checked = value === null || value === undefined ? Boolean(def.default) : Boolean(value);
  const label = el('label', { class: 'checkbox', for: id }, [input, def.label]);
  const { wrapper, error, describedBy } = fieldWrapper(def, id, label);
  input.setAttribute('aria-describedby', describedBy);
  return { wrapper, error, input, focus: () => input.focus(), get: () => input.checked };
}

function listInput(def, id, value, separator) {
  const textarea = el('textarea', { id, name: def.name, class: 'textarea', rows: def.rows || 4 });
  textarea.value = Array.isArray(value) ? value.join(separator === ',' ? ', ' : '\n') : '';
  const { wrapper, error, describedBy } = fieldWrapper({ ...def, hint: def.hint || (separator === ',' ? 'Separate items with commas.' : 'One item per line.') }, id, textarea);
  textarea.setAttribute('aria-describedby', describedBy);
  return {
    wrapper, error, input: textarea,
    focus: () => textarea.focus(),
    get: () => textarea.value.split(separator === ',' ? ',' : '\n').map((s) => s.trim()).filter(Boolean),
  };
}

function pairsInput(def, id, value) {
  const [k1, k2] = def.keys || ['value', 'label'];
  const textarea = el('textarea', { id, name: def.name, class: 'textarea', rows: def.rows || 4 });
  textarea.value = Array.isArray(value) ? value.map((r) => `${r?.[k1] ?? ''} | ${r?.[k2] ?? ''}`).join('\n') : '';
  const { wrapper, error, describedBy } = fieldWrapper({ ...def, hint: def.hint || `One per line: ${k1} | ${k2}` }, id, textarea);
  textarea.setAttribute('aria-describedby', describedBy);
  return {
    wrapper, error, input: textarea,
    focus: () => textarea.focus(),
    get: () => textarea.value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const index = line.indexOf('|');
      const a = (index >= 0 ? line.slice(0, index) : line).trim();
      const b = (index >= 0 ? line.slice(index + 1) : '').trim();
      return { [k1]: a, [k2]: b };
    }),
  };
}

function uploadInput(def, id, value) {
  const kind = def.upload?.kind || (def.type === 'file' ? 'document' : def.type);
  const rule = UPLOAD_RULES[kind];
  const folder = def.upload?.folder || 'uploads';
  let current = value || null;
  const original = value || null;
  const pendingDeletes = new Set();
  const uploadedThisSession = new Set();

  const fileInput = el('input', { type: 'file', accept: rule.accept, class: 'sr-only', id: `${id}-file`, tabindex: '-1' });
  const urlInput = el('input', { id, type: 'text', class: 'input', inputmode: 'url', spellcheck: 'false', placeholder: 'https://… or assets/img/…', autocomplete: 'off' });
  urlInput.value = current || '';
  const preview = el('div', { class: 'upload__preview' });
  const status = el('div', { class: 'upload__status', role: 'status', 'aria-live': 'polite' });
  const uploadBtn = el('button', { type: 'button', class: 'btn btn--outline btn--sm' }, [icon('upload', { size: 16 }), 'Upload']);
  const removeBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, [icon('trash', { size: 16 }), 'Remove']);

  const renderPreview = () => {
    const src = assetUrl(current);
    clear(preview);
    if (!src) {
      preview.appendChild(icon(kind === 'document' ? 'file' : 'image', { size: 28 }));
    } else if (kind === 'video' || (kind === 'media' && /\.(mp4|webm)(\?|$)/i.test(current))) {
      preview.appendChild(el('video', { src, muted: true, playsinline: true, preload: 'metadata' }));
    } else if (kind === 'document') {
      preview.appendChild(el('a', { href: src, target: '_blank', rel: 'noopener noreferrer', 'aria-label': 'Open current document' }, [icon('file', { size: 32 })]));
    } else {
      preview.appendChild(el('img', { src, alt: 'Current file preview' }));
    }
    uploadBtn.lastChild.textContent = current ? 'Replace' : 'Upload';
    removeBtn.hidden = !current;
  };

  const setCurrent = (url) => {
    if (current && current !== url) {
      if (uploadedThisSession.has(current)) {
        // Uploaded and replaced before saving: remove immediately.
        deleteFileByUrl(current).catch(() => {});
        uploadedThisSession.delete(current);
      } else {
        pendingDeletes.add(current);
      }
    }
    current = url;
    pendingDeletes.delete(url);
    urlInput.value = url || '';
    renderPreview();
  };

  const handleFile = async (file) => {
    if (!file) return;
    const problem = validateFile(file, kind);
    if (problem) {
      status.replaceChildren(el('span', { class: 'field__error', text: problem }));
      toast(problem, 'error');
      return;
    }
    uploadBtn.disabled = true;
    removeBtn.disabled = true;
    status.replaceChildren(
      el('span', { class: 'spinner', 'aria-hidden': 'true' }),
      el('span', { text: `Uploading ${file.name} (${formatBytes(file.size)})…` }),
    );
    const progress = el('progress', { 'aria-label': 'Upload progress' });
    status.appendChild(progress);
    try {
      const { url } = await uploadFile(rule.bucket, file, folder);
      uploadedThisSession.add(url);
      setCurrent(url);
      status.replaceChildren(el('span', { text: 'Upload complete. Save to apply.' }));
    } catch (err) {
      status.replaceChildren(el('span', { class: 'field__error', text: err.message }));
      toast(err.message, 'error');
    } finally {
      uploadBtn.disabled = false;
      removeBtn.disabled = false;
      fileInput.value = '';
    }
  };

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => handleFile(fileInput.files[0]));
  removeBtn.addEventListener('click', () => {
    setCurrent(null);
    status.replaceChildren(el('span', { text: 'File removed. Save to apply.' }));
  });
  urlInput.addEventListener('change', () => {
    const v = urlInput.value.trim();
    current = v || null;
    renderPreview();
  });

  const control = el('div', { class: 'upload' }, [
    preview,
    el('div', { class: 'upload__controls' }, [
      el('div', { class: 'upload__buttons' }, [uploadBtn, removeBtn]),
      urlInput,
      el('span', { class: 'field__hint', text: `${rule.exts.join(', ').toUpperCase()} · max ${formatBytes(rule.imageMaxSize || rule.maxSize)}${rule.imageMaxSize ? ` (images), ${formatBytes(rule.maxSize)} (video)` : ''}` }),
      status,
      fileInput,
    ]),
  ]);

  // Drag a file onto the control to upload it.
  control.addEventListener('dragover', (e) => {
    if ([...(e.dataTransfer?.types || [])].includes('Files')) {
      e.preventDefault();
      control.classList.add('is-dragover');
    }
  });
  control.addEventListener('dragleave', () => control.classList.remove('is-dragover'));
  control.addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    control.classList.remove('is-dragover');
    handleFile(e.dataTransfer.files[0]);
  });

  renderPreview();
  const { wrapper, error, describedBy } = fieldWrapper(def, id, control);
  urlInput.setAttribute('aria-describedby', describedBy);
  return {
    wrapper, error, input: urlInput,
    focus: () => uploadBtn.focus(),
    get: () => (urlInput.value.trim() || null),
    async afterSave() {
      // Clean up storage objects that are no longer referenced.
      for (const url of pendingDeletes) {
        if (url !== original || (urlInput.value.trim() || null) !== original) {
          try { await deleteFileByUrl(url); } catch { /* keep going */ }
        }
      }
      pendingDeletes.clear();
      uploadedThisSession.clear();
    },
    async discard() {
      for (const url of uploadedThisSession) {
        try { await deleteFileByUrl(url); } catch { /* ignore */ }
      }
      uploadedThisSession.clear();
    },
  };
}

function relationInput(def, id, value) {
  const group = el('div', { class: 'checkbox-group', role: 'group', 'aria-labelledby': `${id}-label` }, [el('span', { class: 'spinner', 'aria-hidden': 'true' })]);
  const selected = new Set((value || []).map(String));
  const { table, label = 'name' } = def.optionsFrom;
  adminList(table, { select: `id, ${label}` })
    .then((rows) => {
      clear(group);
      if (!rows.length) group.appendChild(el('span', { class: 'muted', text: 'Nothing to choose from yet.' }));
      rows.forEach((row, i) => {
        const cid = `${id}-${i}`;
        const box = el('input', { type: 'checkbox', id: cid, value: row.id });
        box.checked = selected.has(String(row.id));
        group.appendChild(el('label', { class: 'checkbox', for: cid }, [box, row[label]]));
      });
    })
    .catch((err) => { clear(group); group.appendChild(el('span', { class: 'field__error', text: err.message })); });
  const { wrapper, error } = fieldWrapper({ ...def, group: true }, id, group);
  return {
    wrapper, error, input: group,
    focus: () => group.querySelector('input')?.focus(),
    get: () => [...group.querySelectorAll('input:checked')].map((b) => b.value),
  };
}

function elementsInput(def, id, value) {
  const labels = def.elementLabels || {};
  const items = Array.isArray(value) && value.length ? value : (def.default || []);
  const list = el('ul', { class: 'element-list', role: 'list', 'aria-labelledby': `${id}-label` });

  const move = (li, dir) => {
    const sibling = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
    if (!sibling) return;
    if (dir < 0) list.insertBefore(li, sibling);
    else list.insertBefore(sibling, li);
    li.querySelector(dir < 0 ? '[data-up]' : '[data-down]')?.focus();
  };

  let dragged = null;
  items.forEach((item, i) => {
    const cid = `${id}-${i}`;
    const box = el('input', { type: 'checkbox', id: cid });
    box.checked = item.visible !== false;
    const li = el('li', { draggable: 'true', dataset: { key: item.key } }, [
      el('span', { class: 'item__handle', 'aria-hidden': 'true' }, [icon('grip', { size: 16 })]),
      el('label', { class: 'checkbox', for: cid }, [box, labels[item.key] || item.key]),
      el('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-up': '', 'aria-label': `Move ${labels[item.key] || item.key} up` }, [icon('chevron-up', { size: 14 })]),
      el('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'data-down': '', 'aria-label': `Move ${labels[item.key] || item.key} down` }, [icon('chevron-down', { size: 14 })]),
    ]);
    li.querySelector('[data-up]').addEventListener('click', () => move(li, -1));
    li.querySelector('[data-down]').addEventListener('click', () => move(li, 1));
    li.addEventListener('dragstart', (e) => { dragged = li; li.classList.add('is-dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.key); });
    li.addEventListener('dragend', () => { li.classList.remove('is-dragging'); dragged = null; });
    li.addEventListener('dragover', (e) => {
      if (!dragged || dragged === li) return;
      e.preventDefault();
      const rect = li.getBoundingClientRect();
      list.insertBefore(dragged, e.clientY < rect.top + rect.height / 2 ? li : li.nextSibling);
    });
    list.appendChild(li);
  });

  const { wrapper, error } = fieldWrapper({ ...def, group: true }, id, list);
  return {
    wrapper, error, input: list,
    focus: () => list.querySelector('input')?.focus(),
    get: () => [...list.children].map((li) => ({ key: li.dataset.key, visible: li.querySelector('input').checked })),
  };
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

function validateValue(def, value, values) {
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
  if (def.required && empty && def.type !== 'checkbox') return `${def.label} is required.`;
  if (empty) return null;

  if (typeof value === 'string') {
    if (def.max && value.length > def.max) return `Maximum ${def.max} characters.`;
    if (def.min && value.length < def.min) return `Minimum ${def.min} characters.`;
  }
  switch (def.type) {
    case 'email': if (!EMAIL_RE.test(value)) return 'Enter a valid email address.'; break;
    case 'tel': if (!PHONE_RE.test(value)) return 'Use digits, spaces and + ( ) . - only (6–30 characters).'; break;
    case 'url':
    case 'image':
    case 'favicon':
    case 'video':
    case 'media':
    case 'file':
      if (!URL_RE.test(value) || value.length > 2048) return 'Enter a valid URL (https://…, mailto:, tel:, #section or a relative path).';
      if (def.absolute && !/^https?:\/\//.test(value)) return 'Enter a full URL starting with https://';
      break;
    case 'slug': if (!SLUG_RE.test(value)) return 'Use lowercase letters, numbers and single hyphens (e.g. my-service).'; break;
    case 'color': if (!COLOR_RE.test(value)) return 'Use a hex colour like #182551.'; break;
    case 'currency': if (!CURRENCY_RE.test(value)) return 'Use a 3-letter currency code (e.g. AED).'; break;
    case 'number':
      if (!Number.isFinite(value)) return 'Enter a number.';
      if (def.minNum !== undefined && value < def.minNum) return `Must be at least ${def.minNum}.`;
      if (def.maxNum !== undefined && value > def.maxNum) return `Must be at most ${def.maxNum}.`;
      if (def.integer && !Number.isInteger(value)) return 'Enter a whole number.';
      break;
    case 'pairs':
      for (const row of value) {
        const [k1, k2] = def.keys || ['value', 'label'];
        if (!row[k1]) return `Each line needs a ${k1}.`;
        if (def.urlKey && row[def.urlKey] && !URL_RE.test(row[def.urlKey])) return `Invalid URL: ${row[def.urlKey]}`;
        if (String(row[k1]).length > 200 || String(row[k2]).length > 200) return 'Each item must be under 200 characters.';
      }
      break;
    case 'lines':
    case 'tags':
      for (const item of value) if (item.length > 100) return 'Each item must be under 100 characters.';
      break;
    default:
      break;
  }
  if (def.pattern && typeof value === 'string' && !def.pattern.test(value)) return def.patternMessage || 'Invalid format.';
  if (def.validate) return def.validate(value, values) || null;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Form                                                               */
/* ------------------------------------------------------------------ */

/**
 * Build a form from field definitions.
 * fields: [{ name, label, type, required, max, ... } | { type: 'section', label }]
 */
export function buildForm(fields, record = {}) {
  fieldCounter += 1;
  const formId = `form-${fieldCounter}`;
  const form = el('form', { id: formId, novalidate: true });
  const controls = new Map();
  let grid = el('div', { class: 'form-grid' });
  let section = el('div', { class: 'form-section' }, [grid]);
  form.appendChild(section);

  for (const def of fields) {
    if (def.type === 'section') {
      grid = el('div', { class: 'form-grid' });
      section = el('div', { class: 'form-section' }, [el('h3', { class: 'form-section__title', text: def.label }), grid]);
      if (def.hint) section.insertBefore(el('p', { class: 'field__hint', style: { marginBottom: 'var(--space-4)' }, text: def.hint }), grid);
      form.appendChild(section);
      continue;
    }
    const id = `${formId}-${def.name}`;
    const value = record && def.name in record ? record[def.name] : def.default;
    let ctrl;
    switch (def.type) {
      case 'textarea': ctrl = textareaInput(def, id, value); break;
      case 'markdown': ctrl = markdownInput({ ...def, full: true }, id, value); break;
      case 'select': ctrl = selectInput(def, id, value); break;
      case 'icon': ctrl = iconInput(def, id, value); break;
      case 'checkbox': ctrl = checkboxInput(def, id, value); break;
      case 'tags': ctrl = listInput(def, id, value, ','); break;
      case 'lines': ctrl = listInput(def, id, value, '\n'); break;
      case 'pairs': ctrl = pairsInput(def, id, value); break;
      case 'image':
      case 'favicon':
      case 'video':
      case 'media':
      case 'file': ctrl = uploadInput({ ...def, full: def.full !== false }, id, value); break;
      case 'relation': ctrl = relationInput({ ...def, full: true }, id, value); break;
      case 'elements': ctrl = elementsInput({ ...def, full: true }, id, value); break;
      default: ctrl = basicInput(def, id, value); break;
    }
    controls.set(def.name, { def, ...ctrl });
    grid.appendChild(ctrl.wrapper);
  }

  // Auto-generate slugs from their source field until the slug is edited manually.
  for (const { def, input } of controls.values()) {
    if (def.type !== 'slug' || !def.from) continue;
    const source = controls.get(def.from);
    if (!source) continue;
    let touched = Boolean(input.value);
    input.addEventListener('input', () => { touched = input.value.trim() !== ''; });
    source.input.addEventListener('input', () => { if (!touched) input.value = slugify(source.input.value); });
  }

  let initialSnapshot = null;
  const snapshot = () => {
    const out = {};
    for (const [name, c] of controls) out[name] = c.get();
    return JSON.stringify(out);
  };
  queueMicrotask(() => { initialSnapshot = snapshot(); });

  return {
    form,
    controls,
    /** Validate all fields. Returns { ok, values }. Shows inline errors and focuses the first invalid field. */
    validate() {
      const values = {};
      for (const [name, c] of controls) values[name] = c.get();
      let first = null;
      for (const [name, c] of controls) {
        const message = validateValue(c.def, values[name], values);
        c.error.textContent = message || '';
        if (c.input && c.input.setAttribute) {
          if (message) c.input.setAttribute('aria-invalid', 'true');
          else c.input.removeAttribute('aria-invalid');
        }
        if (message && !first) first = c;
      }
      if (first) {
        first.focus();
        return { ok: false, values };
      }
      // Remove virtual fields (e.g. relations) from the database payload.
      const payload = {};
      for (const [name, c] of controls) if (!c.def.virtual) payload[name] = values[name];
      return { ok: true, values, payload };
    },
    isDirty() {
      return initialSnapshot !== null && snapshot() !== initialSnapshot;
    },
    async afterSave() {
      for (const c of controls.values()) if (c.afterSave) await c.afterSave();
    },
    async discard() {
      for (const c of controls.values()) if (c.discard) await c.discard();
    },
  };
}
