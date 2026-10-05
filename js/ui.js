/**
 * Shared UI helpers: toasts, modal dialogs, confirmation prompts,
 * busy buttons, skeletons and empty/error states.
 */
import { h, clear } from './dom.js';

/* --------------------------------- Toasts --------------------------------- */

function toastRegion() {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = h('div', { class: 'toast-region', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    document.body.append(region);
  }
  return region;
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type]
 */
export function toast(message, type = 'success', duration = 4500) {
  const icons = { success: '✓', error: '!', info: 'i' };
  const item = h('div', { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status' },
    h('span', { class: 'toast__icon', 'aria-hidden': 'true', text: icons[type] || 'i' }),
    h('p', { class: 'toast__message', text: message }),
  );
  const close = h('button', { type: 'button', class: 'toast__close', 'aria-label': 'Dismiss notification', text: '×' });
  item.append(close);

  const remove = () => {
    item.classList.add('is-leaving');
    setTimeout(() => item.remove(), 250);
  };
  close.addEventListener('click', remove);
  toastRegion().append(item);
  if (duration) setTimeout(remove, type === 'error' ? duration * 1.6 : duration);
}

/* --------------------------------- Modals --------------------------------- */

/**
 * Open a modal <dialog>.
 * @returns {{ dialog: HTMLDialogElement, body: HTMLElement, footer: HTMLElement, close: Function }}
 */
export function openModal({ title, content, size = 'md', onClose, className = '' }) {
  const opener = document.activeElement;
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;
  const body = h('div', { class: 'modal__body' });
  const footer = h('div', { class: 'modal__footer' });
  const closeBtn = h('button', { type: 'button', class: 'icon-btn modal__close', 'aria-label': 'Close dialog', text: '×' });

  const dialog = h('dialog', { class: `modal modal--${size} ${className}`, 'aria-labelledby': titleId },
    h('div', { class: 'modal__header' }, h('h2', { class: 'modal__title', id: titleId, text: title }), closeBtn),
    body,
    footer,
  );
  if (content) body.append(content);

  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    dialog.close();
    dialog.remove();
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
    onClose?.(result);
  };

  closeBtn.addEventListener('click', () => close());
  // ESC fires "cancel": route it through close() so cleanup always happens.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  // Click on the backdrop closes the dialog.
  dialog.addEventListener('mousedown', (event) => {
    if (event.target === dialog) close();
  });

  document.body.append(dialog);
  dialog.showModal();
  return { dialog, body, footer, close };
}

/**
 * Ask for confirmation. Resolves true when confirmed.
 */
export function confirmDialog({
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  danger = true,
} = {}) {
  return new Promise((resolve) => {
    const modal = openModal({
      title,
      size: 'sm',
      content: h('p', { class: 'confirm__message', text: message }),
      onClose: (result) => resolve(result === true),
    });
    const cancel = h('button', { type: 'button', class: 'btn btn--ghost', text: 'Cancel' });
    const confirm = h('button', { type: 'button', class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, text: confirmLabel });
    cancel.addEventListener('click', () => modal.close(false));
    confirm.addEventListener('click', () => modal.close(true));
    modal.footer.append(cancel, confirm);
    cancel.focus();
  });
}

/* --------------------------------- Buttons -------------------------------- */

/** Put a button into a busy state (disabled + spinner). */
export function setBusy(button, busy, busyLabel) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    clear(button, h('span', { class: 'spinner', 'aria-hidden': 'true' }), busyLabel || button.dataset.label);
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.label !== undefined) button.textContent = button.dataset.label;
  }
}

/* ------------------------- Skeletons / empty / error ----------------------- */

/** A block of shimmering placeholder lines. */
export function skeleton({ lines = 3, avatar = false, className = '' } = {}) {
  return h('div', { class: `skeleton-block ${className}`, 'aria-hidden': 'true' },
    avatar && h('div', { class: 'skeleton skeleton--avatar' }),
    Array.from({ length: lines }, (_, i) =>
      h('div', { class: `skeleton skeleton--line${i === lines - 1 ? ' skeleton--short' : ''}` })),
  );
}

/** A list of skeleton rows (for admin lists). */
export function skeletonList(rows = 4) {
  return h('div', { class: 'skeleton-list', role: 'status', 'aria-label': 'Loading' },
    Array.from({ length: rows }, () => skeleton({ lines: 2, avatar: true, className: 'skeleton-row' })),
  );
}

export function emptyState({ icon = '✦', title = 'Nothing here yet', message = '', action } = {}) {
  return h('div', { class: 'state state--empty' },
    h('div', { class: 'state__icon', 'aria-hidden': 'true', text: icon }),
    h('h3', { class: 'state__title', text: title }),
    message && h('p', { class: 'state__message', text: message }),
    action,
  );
}

export function errorState({ message = 'Something went wrong while loading.', onRetry } = {}) {
  const retry = onRetry && h('button', { type: 'button', class: 'btn btn--ghost', text: 'Try again', on: { click: onRetry } });
  return h('div', { class: 'state state--error', role: 'alert' },
    h('div', { class: 'state__icon', 'aria-hidden': 'true', text: '!' }),
    h('h3', { class: 'state__title', text: 'Could not load content' }),
    h('p', { class: 'state__message', text: message }),
    retry,
  );
}
