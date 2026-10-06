// Account page: current admin info, admin list (read-only) and password change.
import { adminList } from '../api.js';
import { el, formatDate } from '../utils.js';
import { icon } from '../icons.js';
import { changePassword } from '../auth.js';
import { viewHeader, toast, withBusy } from './ui.js';

const MIN_LENGTH = 10;

function passwordField(id, label, autocomplete, hint = null) {
  const input = el('input', { id, type: 'password', class: 'input', required: true, autocomplete, minlength: id === 'pw-current' ? null : MIN_LENGTH, maxlength: 72 });
  const toggle = el('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Show ${label.toLowerCase()}`, 'aria-pressed': 'false' }, [icon('eye', { size: 16 })]);
  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${label.toLowerCase()}`);
    toggle.replaceChildren(icon(show ? 'eye-off' : 'eye', { size: 16 }));
  });
  const error = el('span', { class: 'field__error', id: `${id}-error`, 'aria-live': 'polite' });
  input.setAttribute('aria-describedby', [hint ? `${id}-hint` : null, `${id}-error`].filter(Boolean).join(' '));
  return {
    input, error,
    wrapper: el('div', { class: 'field' }, [
      el('label', { for: id, text: label }),
      el('div', { class: 'password-field' }, [input, toggle]),
      hint ? el('span', { class: 'field__hint', id: `${id}-hint`, text: hint }) : null,
      error,
    ]),
  };
}

export function validatePassword(pw) {
  if (pw.length < MIN_LENGTH) return `Use at least ${MIN_LENGTH} characters.`;
  if (pw.length > 72) return 'Use at most 72 characters.';
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return 'Include upper-case and lower-case letters and a number.';
  return null;
}

export async function render(view, ctx) {
  view.appendChild(viewHeader('Account & password', 'Manage your admin account.'));

  const account = el('section', { class: 'panel', 'aria-labelledby': 'account-title' }, [
    el('div', { class: 'panel__header' }, [el('h3', { id: 'account-title', text: 'Signed in as' })]),
    el('div', { class: 'panel__body' }, [
      el('p', {}, [el('strong', { text: ctx.user.email })]),
      el('p', { class: 'muted', text: `Last sign-in: ${formatDate(ctx.user.last_sign_in_at, true) || '—'}` }),
    ]),
  ]);

  const current = passwordField('pw-current', 'Current password', 'current-password');
  const next = passwordField('pw-new', 'New password', 'new-password', `At least ${MIN_LENGTH} characters with upper-case, lower-case letters and a number.`);
  const confirm = passwordField('pw-confirm', 'Confirm new password', 'new-password');
  const submit = el('button', { type: 'submit', class: 'btn' }, [icon('lock', { size: 16 }), 'Change password']);
  const form = el('form', { class: 'form', novalidate: true, style: { maxWidth: '460px' } }, [current.wrapper, next.wrapper, confirm.wrapper, el('div', {}, [submit])]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errors = {
      current: current.input.value ? null : 'Enter your current password.',
      next: validatePassword(next.input.value),
      confirm: next.input.value === confirm.input.value ? null : 'Passwords do not match.',
    };
    if (!errors.next && next.input.value === current.input.value) errors.next = 'Choose a password different from the current one.';
    for (const [key, field] of Object.entries({ current, next, confirm })) {
      field.error.textContent = errors[key] || '';
      if (errors[key]) field.input.setAttribute('aria-invalid', 'true');
      else field.input.removeAttribute('aria-invalid');
    }
    const first = ['current', 'next', 'confirm'].find((k) => errors[k]);
    if (first) {
      ({ current, next, confirm })[first].input.focus();
      return;
    }
    try {
      await withBusy(submit, () => changePassword(current.input.value, next.input.value), 'Updating…');
      form.reset();
      toast('Password changed successfully.', 'success');
    } catch (error) {
      toast(error.message, 'error');
      if (/current password/i.test(error.message)) {
        current.error.textContent = error.message;
        current.input.focus();
      }
    }
  });

  const passwordPanel = el('section', { class: 'panel', 'aria-labelledby': 'pw-title' }, [
    el('div', { class: 'panel__header' }, [el('h3', { id: 'pw-title', text: 'Change password' })]),
    el('div', { class: 'panel__body' }, [form]),
  ]);

  const adminsBody = el('div', { class: 'panel__body' }, [el('p', { class: 'muted', text: 'Loading…' })]);
  const adminsPanel = el('section', { class: 'panel', 'aria-labelledby': 'admins-title' }, [
    el('div', { class: 'panel__header' }, [el('h3', { id: 'admins-title', text: 'Admin accounts' })]),
    adminsBody,
  ]);

  view.append(account, passwordPanel, adminsPanel);

  try {
    const admins = await adminList('admin_users', { select: 'user_id, created_at', order: 'created_at' });
    adminsBody.replaceChildren(
      el('p', { text: `${admins.length} admin account${admins.length === 1 ? '' : 's'} registered.` }),
      el('p', { class: 'field__hint', text: 'For security, admins can only be added or removed from the Supabase SQL editor (see README). Public sign-ups are disabled.' }),
    );
  } catch (error) {
    adminsBody.replaceChildren(el('p', { class: 'field__error', text: error.message }));
  }
}
