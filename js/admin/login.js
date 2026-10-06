// Admin login (Supabase Auth, email + password). Public sign-ups are disabled in Supabase.
import { supabase, isConfigured } from '../api.js';
import { signIn, getSession, isAdmin, redirectToDashboard, sendPasswordReset } from '../auth.js';
import { el } from '../utils.js';
import { EMAIL_RE } from '../utils.js';
import { validatePassword } from './users.js';

const form = document.getElementById('login-form');
const resetForm = document.getElementById('reset-form');
const recoveryForm = document.getElementById('recovery-form');
const statusBox = document.getElementById('login-status');

const REASONS = {
  expired: 'Your session has expired. Please sign in again.',
  forbidden: 'This account does not have admin access.',
  config: 'Supabase is not configured yet. Add your project URL and anon key to js/config.js.',
};

function showStatus(message, type = 'error') {
  statusBox.replaceChildren(message ? el('div', { class: `alert alert--${type}`, role: type === 'error' ? 'alert' : 'status', text: message }) : '');
}

function setFieldError(input, message) {
  const error = document.getElementById(`${input.id}-error`);
  if (error) error.textContent = message || '';
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.replaceChildren(busy ? el('span', { class: 'spinner', 'aria-hidden': 'true' }) : '', busy ? 'Please wait…' : label);
}

function showForm(which) {
  form.hidden = which !== 'login';
  resetForm.hidden = which !== 'reset';
  recoveryForm.hidden = which !== 'recovery';
  showStatus('');
  const target = { login: form, reset: resetForm, recovery: recoveryForm }[which];
  target.querySelector('input')?.focus();
}

async function init() {
  const reason = new URLSearchParams(location.search).get('reason');
  if (reason && REASONS[reason]) showStatus(REASONS[reason], reason === 'config' ? 'error' : 'error');
  if (!isConfigured) {
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  // Password-recovery links from Supabase land here with a recovery session.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') showForm('recovery');
  });
  if (/type=recovery/.test(location.hash)) {
    showForm('recovery');
    return;
  }

  const session = await getSession();
  if (session && (await isAdmin())) redirectToDashboard();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;
  setFieldError(form.email, EMAIL_RE.test(email) ? '' : 'Enter a valid email address.');
  setFieldError(form.password, password ? '' : 'Enter your password.');
  if (!EMAIL_RE.test(email)) { form.email.focus(); return; }
  if (!password) { form.password.focus(); return; }

  const button = form.querySelector('button[type="submit"]');
  setBusy(button, true, 'Sign in');
  showStatus('');
  try {
    await signIn(email, password);
    redirectToDashboard();
  } catch (error) {
    showStatus(error.message);
    form.password.value = '';
    form.password.focus();
    setBusy(button, false, 'Sign in');
  }
});

resetForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = resetForm.reset_email.value.trim();
  if (!EMAIL_RE.test(email)) {
    setFieldError(resetForm.reset_email, 'Enter a valid email address.');
    resetForm.reset_email.focus();
    return;
  }
  setFieldError(resetForm.reset_email, '');
  const button = resetForm.querySelector('button[type="submit"]');
  setBusy(button, true, 'Send reset link');
  try {
    await sendPasswordReset(email);
  } catch {
    /* Do not reveal whether the account exists. */
  }
  showStatus('If an admin account exists for that email, a reset link has been sent.', 'success');
  setBusy(button, false, 'Send reset link');
});

recoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const pw = recoveryForm.new_password.value;
  const confirm = recoveryForm.confirm_password.value;
  const problem = validatePassword(pw) || (pw !== confirm ? 'Passwords do not match.' : null);
  setFieldError(recoveryForm.new_password, problem);
  if (problem) { recoveryForm.new_password.focus(); return; }
  const button = recoveryForm.querySelector('button[type="submit"]');
  setBusy(button, true, 'Set new password');
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) {
    showStatus(error.message);
    setBusy(button, false, 'Set new password');
    return;
  }
  history.replaceState(null, '', location.pathname);
  if (await isAdmin()) redirectToDashboard();
  else {
    await supabase.auth.signOut();
    showForm('login');
    showStatus('Password updated. This account does not have admin access.');
  }
});

document.getElementById('show-reset').addEventListener('click', () => showForm('reset'));
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => showForm('login')));
document.getElementById('toggle-password').addEventListener('click', (event) => {
  const input = form.password;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  event.currentTarget.setAttribute('aria-pressed', String(show));
  event.currentTarget.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
});

init();
