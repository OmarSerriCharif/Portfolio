/** Account: change password. */
import { h } from '../dom.js';
import { createForm } from '../forms.js';
import { changePassword } from '../auth.js';
import { toast, setBusy } from '../ui.js';
import { pageHeader } from './crud.js';

export const title = 'Account';

export function render(container, { session }) {
  const form = createForm({
    fields: [
      { name: 'email', label: 'Username (email)', type: 'text', default: session.user.email, autocomplete: 'username' },
      { name: 'current', label: 'Current password', type: 'password', required: true, autocomplete: 'current-password' },
      {
        name: 'next', label: 'New password', type: 'password', required: true, minLength: 10, maxLength: 72,
        autocomplete: 'new-password', help: 'At least 10 characters, including a letter and a number.',
        validate: (value, all) => {
          if (!/[a-z]/i.test(value) || !/\d/.test(value)) return 'Include at least one letter and one number.';
          if (value === all.current) return 'The new password must be different from the current one.';
          return '';
        },
      },
      {
        name: 'confirm', label: 'Confirm new password', type: 'password', required: true, autocomplete: 'new-password',
        validate: (value, all) => (value !== all.next ? 'Passwords do not match.' : ''),
      },
    ],
  });
  const emailInput = form.element.querySelector('input[name="email"]');
  emailInput.readOnly = true;

  const submit = h('button', { type: 'submit', class: 'btn btn--primary', text: 'Update password' });
  form.element.append(h('div', { class: 'form-actions' }, submit));
  form.element.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.validate()) return;
    const { current, next } = form.getValues();
    setBusy(submit, true, 'Updating…');
    try {
      await changePassword(current, next);
      form.element.reset();
      emailInput.value = session.user.email;
      toast('Password updated.');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(submit, false);
    }
  });

  container.append(
    pageHeader(title, 'Manage your admin credentials.'),
    h('section', { class: 'card card--narrow' },
      h('div', { class: 'card__header' }, h('h2', { class: 'card__title', text: 'Change password' })),
      form.element),
  );
}
