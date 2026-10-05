/**
 * Contact form: validates input, applies a per-browser cooldown and a
 * honeypot against bots, then saves the message to the database.
 * Constraints mirror the CHECKs on public.messages.
 */
import { h } from '../dom.js';
import { validateStaticForm } from '../forms.js';
import { sendContactMessage } from '../api.js';
import { setBusy, toast } from '../ui.js';
import { CONTACT_COOLDOWN_SECONDS } from '../constants.js';

const COOLDOWN_KEY = 'portfolio-contact-sent-at';

const RULES = {
  name: { label: 'Name', required: true, minLength: 2, maxLength: 100 },
  email: { label: 'Email', type: 'email', required: true, maxLength: 254 },
  subject: { label: 'Subject', maxLength: 150 },
  body: { label: 'Message', required: true, minLength: 10, maxLength: 5000 },
};

function field({ name, label, type = 'text', autocomplete, textarea = false, required = true }) {
  const id = `contact-${name}`;
  const rule = RULES[name];
  const attrs = {
    id, name, class: textarea ? 'input textarea' : 'input', maxlength: rule.maxLength,
    autocomplete, 'aria-describedby': `${id}-error`, required: required || null,
  };
  const control = textarea ? h('textarea', { ...attrs, rows: 6 }) : h('input', { ...attrs, type });
  return h('div', { class: 'field' },
    h('label', { class: 'field__label', for: id }, label,
      required ? h('span', { class: 'field__req', 'aria-hidden': 'true', text: ' *' }) : h('span', { class: 'muted', text: ' (optional)' })),
    control,
    h('p', { class: 'field__error', id: `${id}-error`, hidden: true }));
}

function secondsSinceLastSend() {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY));
    return last ? (Date.now() - last) / 1000 : Infinity;
  } catch {
    return Infinity;
  }
}

/** Build the form element and wire up its behaviour. */
export function initContactForm() {
  const status = h('p', { class: 'form-status', role: 'status', 'aria-live': 'polite', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn btn--primary btn--lg', text: 'Send message' });

  const form = h('form', { class: 'contact__form form-grid reveal', novalidate: true, 'aria-label': 'Contact form' },
    field({ name: 'name', label: 'Name', autocomplete: 'name' }),
    field({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email' }),
    field({ name: 'subject', label: 'Subject', required: false }),
    field({ name: 'body', label: 'Message', textarea: true }),
    // Honeypot: hidden from people and assistive tech; bots tend to fill it in.
    h('div', { class: 'hp', 'aria-hidden': 'true' },
      h('label', { for: 'contact-website', text: 'Website' }),
      h('input', { id: 'contact-website', name: 'website', type: 'text', tabindex: '-1', autocomplete: 'off' })),
    h('div', { class: 'form-actions' }, submit),
    status);

  const showStatus = (message, tone) => {
    status.textContent = message;
    status.className = `form-status form-status--${tone}`;
    status.hidden = false;
  };

  form.addEventListener('input', (event) => {
    const wrapper = event.target.closest('.field');
    if (!wrapper?.classList.contains('has-error')) return;
    wrapper.classList.remove('has-error');
    event.target.removeAttribute('aria-invalid');
    const error = wrapper.querySelector('.field__error');
    if (error) error.hidden = true;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.hidden = true;
    const values = validateStaticForm(form, RULES);
    if (!values) return;

    // Silently accept honeypot submissions without saving them.
    if (form.elements.website.value) {
      form.reset();
      showStatus('Thanks! Your message has been sent.', 'success');
      return;
    }

    const wait = CONTACT_COOLDOWN_SECONDS - secondsSinceLastSend();
    if (wait > 0) {
      showStatus(`Please wait ${Math.ceil(wait)} seconds before sending another message.`, 'error');
      return;
    }

    setBusy(submit, true, 'Sending…');
    try {
      await sendContactMessage(values);
      try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* storage unavailable */ }
      form.reset();
      showStatus('Thanks! Your message has been sent. I will get back to you soon.', 'success');
      toast('Message sent.');
    } catch (error) {
      console.error(error);
      showStatus('Sorry, your message could not be sent. Please try again or use the email address instead.', 'error');
    } finally {
      setBusy(submit, false);
    }
  });

  return form;
}
