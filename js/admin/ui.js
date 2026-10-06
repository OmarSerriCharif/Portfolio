// Admin UI primitives: toasts, dialogs, confirmations and shared states.

import { el, clear } from '../utils.js';
import { icon } from '../icons.js';

/* ---------- Toasts ---------- */

function toastRegion() {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = el('div', { id: 'toast-region', class: 'toast-region', role: 'region', 'aria-label': 'Notifications' });
    document.body.appendChild(region);
  }
  return region;
}

export function toast(message, type = 'success', timeout = 4500) {
  const region = toastRegion();
  const iconName = { success: 'check', error: 'x', warning: 'help', info: 'help' }[type] || 'help';
  const node = el('div', { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status' }, [
    icon(iconName, { size: 18 }),
    el('span', { class: 'toast__msg', text: message }),
    el('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': 'Dismiss notification' }, [icon('x', { size: 14 })]),
  ]);
  const remove = () => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 220);
  };
  node.querySelector('button').addEventListener('click', remove);
  region.appendChild(node);
  if (timeout) setTimeout(remove, type === 'error' ? timeout * 1.6 : timeout);
}

/* ---------- Dialogs ---------- */

let dialogCounter = 0;

/**
 * Open an accessible modal dialog built on <dialog>.showModal() (native focus trapping + Esc).
 * Returns { dialog, body, footer, close, setBusy }.
 */
export function openDialog({ title, size = '', onClose = null, closeLabel = 'Close dialog' } = {}) {
  dialogCounter += 1;
  const titleId = `dialog-title-${dialogCounter}`;
  const previouslyFocused = document.activeElement;
  const body = el('div', { class: 'dialog__body' });
  const footer = el('div', { class: 'dialog__footer' });
  const closeBtn = el('button', { type: 'button', class: 'icon-btn', 'aria-label': closeLabel }, [icon('x')]);
  const dialog = el('dialog', { class: `dialog${size ? ` dialog--${size}` : ''}`, 'aria-labelledby': titleId }, [
    el('div', { class: 'dialog__header' }, [el('h2', { class: 'dialog__title', id: titleId, text: title }), closeBtn]),
    body,
    footer,
  ]);
  let busy = false;
  let beforeClose = null;

  const close = async (force = false) => {
    if (busy && !force) return;
    if (!force && beforeClose && !(await beforeClose())) return;
    dialog.close();
  };

  closeBtn.addEventListener('click', () => close());
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    if (onClose) onClose();
    if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
  });

  document.body.appendChild(dialog);
  dialog.showModal();
  return {
    dialog,
    body,
    footer,
    close,
    setBusy(value) { busy = value; closeBtn.disabled = value; },
    setBeforeClose(fn) { beforeClose = fn; },
  };
}

export function confirmDialog({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    let result = false;
    const d = openDialog({ title, onClose: () => resolve(result) });
    d.dialog.setAttribute('role', 'alertdialog');
    if (message) d.body.appendChild(el('p', { text: message }));
    const cancel = el('button', { type: 'button', class: 'btn btn--ghost' }, ['Cancel']);
    const ok = el('button', { type: 'button', class: `btn ${danger ? 'btn--danger' : ''}` }, [confirmLabel]);
    cancel.addEventListener('click', () => d.close());
    ok.addEventListener('click', () => { result = true; d.close(); });
    d.footer.append(cancel, ok);
    cancel.focus();
  });
}

/* ---------- States ---------- */

export function loadingState(label = 'Loading…') {
  return el('div', { class: 'state', role: 'status' }, [el('span', { class: 'spinner', 'aria-hidden': 'true' }), el('p', { text: label })]);
}

export function emptyState(title, message = '', action = null) {
  return el('div', { class: 'state' }, [
    el('span', { class: 'state__icon' }, [icon('layers', { size: 24 })]),
    el('p', { class: 'state__title', text: title }),
    message ? el('p', { text: message }) : null,
    action,
  ]);
}

export function errorState(message, onRetry) {
  return el('div', { class: 'state state--error', role: 'alert' }, [
    el('span', { class: 'state__icon' }, [icon('x', { size: 24 })]),
    el('p', { class: 'state__title', text: 'Something went wrong' }),
    el('p', { text: message }),
    onRetry ? el('button', { type: 'button', class: 'btn btn--outline btn--sm', on: { click: onRetry } }, [icon('refresh', { size: 16 }), 'Retry']) : null,
  ]);
}

export function viewHeader(title, description = '', actions = []) {
  return el('div', { class: 'view-header' }, [
    el('div', {}, [el('h2', { text: title }), description ? el('p', { text: description }) : null]),
    actions.length ? el('div', { class: 'toolbar' }, actions) : null,
  ]);
}

/** Put a button into a loading state while an async task runs. */
export async function withBusy(button, task, busyLabel = 'Saving…') {
  const original = [...button.childNodes];
  button.disabled = true;
  clear(button);
  button.append(el('span', { class: 'spinner', 'aria-hidden': 'true' }), busyLabel);
  try {
    return await task();
  } finally {
    button.disabled = false;
    clear(button);
    button.append(...original);
  }
}
