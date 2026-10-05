/** Admin login page. */
import { signIn, redirectIfSignedIn } from '../auth.js';
import { isConfigured } from '../supabase-client.js';
import { validateStaticForm } from '../forms.js';
import { setBusy } from '../ui.js';
import { initThemeToggles } from '../theme.js';

const form = document.getElementById('login-form');
const alertBox = document.getElementById('login-alert');
const submit = form.querySelector('button[type="submit"]');
const togglePassword = document.getElementById('toggle-password');
const password = form.elements.password;

const RULES = {
  email: { label: 'Username', type: 'email', required: true, maxLength: 254 },
  password: { label: 'Password', type: 'password', required: true, maxLength: 72 },
};

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.hidden = !message;
}

initThemeToggles();

togglePassword.addEventListener('click', () => {
  const show = password.type === 'password';
  password.type = show ? 'text' : 'password';
  togglePassword.textContent = show ? 'Hide' : 'Show';
  togglePassword.setAttribute('aria-pressed', String(show));
});

if (!isConfigured) {
  showAlert('Supabase is not configured yet. Add your project URL and anon key to js/config.js (see README).');
  submit.disabled = true;
} else {
  redirectIfSignedIn();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showAlert('');
  const values = validateStaticForm(form, RULES);
  if (!values) return;

  setBusy(submit, true, 'Signing in…');
  try {
    await signIn(values.email, form.elements.password.value);
    window.location.replace('index.html');
  } catch (error) {
    showAlert(error.message);
    password.value = '';
    password.focus();
    setBusy(submit, false);
  }
});
