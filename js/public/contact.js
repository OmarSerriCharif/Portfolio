// Contact section and lead form. Submissions are inserted into contact_messages (insert-only for visitors).

import { submitContactMessage, listPublic } from '../api.js';
import { el, EMAIL_RE, PHONE_RE, assetUrl, link } from '../utils.js';
import { icon } from '../icons.js';
import { loadInto, socialLinksList, skeletonText } from '../main.js';

const LIMITS = { name: [2, 120], email: [3, 254], phone: [0, 30], company: [0, 150], service: [0, 150], budget: [0, 100], message: [10, 5000] };
const MIN_FILL_MS = 2500;

let pendingInterest = null;

// Any CTA with data-interest pre-selects the matching service in the form.
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-interest]');
  if (!trigger) return;
  pendingInterest = trigger.dataset.interest;
  applyInterest(pendingInterest);
});

function applyInterest(value) {
  const select = document.getElementById('contact-service');
  if (!select || !value) return;
  let option = [...select.options].find((o) => o.value === value);
  if (!option) {
    option = el('option', { value, text: value });
    select.insertBefore(option, select.options[1] || null);
  }
  select.value = value;
}

function field({ id, label, type = 'text', required = false, autocomplete = null, hint = null, max = null, control = null, rows = null }) {
  const hintId = hint ? `${id}-hint` : null;
  const errorId = `${id}-error`;
  const input = control || (type === 'textarea'
    ? el('textarea', { id, name: id.replace('contact-', ''), class: 'textarea', rows: rows || 5, maxlength: max, required })
    : el('input', { id, name: id.replace('contact-', ''), type, class: 'input', autocomplete, maxlength: max, required }));
  input.setAttribute('aria-describedby', [hintId, errorId].filter(Boolean).join(' '));
  return el('div', { class: 'field' }, [
    el('label', { for: id }, [label, required ? el('span', { class: 'req', 'aria-hidden': 'true', text: '*' }) : null]),
    input,
    hint ? el('span', { class: 'field__hint', id: hintId, text: hint }) : null,
    el('span', { class: 'field__error', id: errorId, 'aria-live': 'polite' }),
  ]);
}

function setError(form, name, message) {
  const input = form.elements[name];
  const error = form.querySelector(`#contact-${name}-error`);
  if (!input || !error) return;
  error.textContent = message || '';
  if (message) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function validate(form) {
  const values = {};
  const errors = {};
  for (const key of Object.keys(LIMITS)) {
    const raw = form.elements[key]?.value ?? '';
    values[key] = raw.trim();
  }
  const [nMin, nMax] = LIMITS.name;
  if (values.name.length < nMin) errors.name = 'Please enter your name.';
  else if (values.name.length > nMax) errors.name = `Name must be under ${nMax} characters.`;
  if (!values.email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(values.email) || values.email.length > LIMITS.email[1]) errors.email = 'Please enter a valid email address.';
  if (values.phone && !PHONE_RE.test(values.phone)) errors.phone = 'Use digits, spaces and + ( ) - only (6–30 characters).';
  for (const key of ['company', 'service', 'budget']) {
    if (values[key].length > LIMITS[key][1]) errors[key] = `Must be under ${LIMITS[key][1]} characters.`;
  }
  if (values.message.length < LIMITS.message[0]) errors.message = `Please write at least ${LIMITS.message[0]} characters.`;
  else if (values.message.length > LIMITS.message[1]) errors.message = `Message must be under ${LIMITS.message[1]} characters.`;
  return { values, errors };
}

function buildForm(serviceNames, interest) {
  const startedAt = Date.now();
  const serviceSelect = el('select', { id: 'contact-service', name: 'service', class: 'select' }, [
    el('option', { value: '', text: 'Select a service (optional)' }),
    ...serviceNames.map((name) => el('option', { value: name, text: name })),
    el('option', { value: 'Other', text: 'Other' }),
  ]);

  const status = el('div', { class: 'form-status', role: 'status', 'aria-live': 'polite' });
  const submit = el('button', { type: 'submit', class: 'btn btn--block' }, ['Send message', icon('arrow-right', { size: 16 })]);

  const form = el('form', { class: 'form', novalidate: true, 'aria-labelledby': 'contact-form-title' }, [
    el('div', { class: 'form-row' }, [
      field({ id: 'contact-name', label: 'Name', required: true, autocomplete: 'name', max: LIMITS.name[1] }),
      field({ id: 'contact-email', label: 'Email', type: 'email', required: true, autocomplete: 'email', max: LIMITS.email[1] }),
    ]),
    el('div', { class: 'form-row' }, [
      field({ id: 'contact-phone', label: 'Phone', type: 'tel', autocomplete: 'tel', max: LIMITS.phone[1] }),
      field({ id: 'contact-company', label: 'Company', autocomplete: 'organization', max: LIMITS.company[1] }),
    ]),
    el('div', { class: 'form-row' }, [
      field({ id: 'contact-service', label: 'Service interested in', control: serviceSelect }),
      field({ id: 'contact-budget', label: 'Budget', max: LIMITS.budget[1], hint: 'Optional' }),
    ]),
    field({ id: 'contact-message', label: 'Message', type: 'textarea', required: true, max: LIMITS.message[1], rows: 5 }),
    // Honeypot: hidden from people, often filled by bots.
    el('div', { class: 'honeypot', 'aria-hidden': 'true' }, [
      el('label', { for: 'contact-website', text: 'Leave this field empty' }),
      el('input', { id: 'contact-website', name: 'website', type: 'text', tabindex: '-1', autocomplete: 'off' }),
    ]),
    status,
    submit,
  ]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.replaceChildren();
    const { values, errors } = validate(form);
    for (const key of Object.keys(LIMITS)) setError(form, key, errors[key]);
    const firstError = Object.keys(LIMITS).find((k) => errors[k]);
    if (firstError) {
      form.elements[firstError].focus();
      return;
    }
    // Silently drop obvious bots.
    if (form.elements.website.value || Date.now() - startedAt < MIN_FILL_MS) {
      showSuccess(form);
      return;
    }

    submit.disabled = true;
    submit.replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }), 'Sending…');
    try {
      await submitContactMessage({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        company: values.company || null,
        service: values.service || null,
        budget: values.budget || null,
        message: values.message,
        source_page: location.pathname.slice(0, 200),
      });
      showSuccess(form);
    } catch (error) {
      status.replaceChildren(el('div', { class: 'alert alert--error', role: 'alert' }, [
        icon('x', { size: 18 }),
        el('span', { text: error.message || 'Your message could not be sent. Please try again.' }),
      ]));
      submit.disabled = false;
      submit.replaceChildren('Send message', icon('arrow-right', { size: 16 }));
    }
  });

  if (interest) queueMicrotask(() => applyInterest(interest));
  return form;
}

function showSuccess(form) {
  const card = form.parentElement;
  const message = el('div', { class: 'alert alert--success', role: 'status', tabindex: '-1' }, [
    icon('check', { size: 18 }),
    el('div', {}, [
      el('strong', { text: 'Thank you! Your message has been sent.' }),
      el('p', { text: 'We’ll get back to you as soon as possible.' }),
    ]),
  ]);
  const again = el('button', { type: 'button', class: 'btn btn--outline btn--sm', style: { marginTop: 'var(--space-4)' } }, ['Send another message']);
  again.addEventListener('click', () => {
    message.remove();
    again.remove();
    form.reset();
    form.hidden = false;
    form.querySelector('input')?.focus();
  });
  form.hidden = true;
  card.append(message, again);
  message.focus();
}

function detailItem(iconName, label, value, href = null) {
  return el('li', { class: 'contact__item' }, [
    el('span', { class: 'card__icon' }, [icon(iconName, { size: 20 })]),
    el('div', {}, [
      el('span', { class: 'contact__label', text: label }),
      el('span', { class: 'contact__value' }, [href ? el('a', { href }, [value]) : value]),
    ]),
  ]);
}

export async function renderContactSection(body, section, ctx, { interest = null } = {}) {
  await loadInto(body, async () => {
    const settings = ctx.settings || {};
    const [services, socials] = await Promise.all([
      listPublic('services', { select: 'name, display_order' }).catch(() => []),
      ctx.socials ? Promise.resolve(ctx.socials) : listPublic('social_links').catch(() => []),
    ]);

    const details = el('ul', { class: 'contact__details', role: 'list' });
    if (settings.contact_email) details.appendChild(detailItem('mail', 'Email', settings.contact_email, `mailto:${settings.contact_email}`));
    if (settings.contact_phone) details.appendChild(detailItem('phone', 'Phone', settings.contact_phone, `tel:${settings.contact_phone.replace(/[^+0-9]/g, '')}`));
    if (settings.location) details.appendChild(detailItem('map-pin', 'Location', settings.location));
    if (settings.business_hours) details.appendChild(detailItem('clock', 'Business hours', settings.business_hours));

    const docs = (ctx.documents || []).filter((d) => assetUrl(d.file_url));
    const info = el('div', { class: 'reveal' }, [
      details.children.length ? details : null,
      socialLinksList(socials),
      docs.length ? el('div', { class: 'contact__docs' }, docs.map((d) => link(assetUrl(d.file_url), { class: 'btn btn--outline btn--sm', download: '' }, [
        icon('download', { size: 16 }), d.title,
      ]))) : null,
    ]);

    const formCard = el('div', { class: 'contact-form-card reveal' }, [
      el('h3', { id: 'contact-form-title', text: 'Send us a message' }),
      buildForm(services.map((s) => s.name), interest || pendingInterest),
    ]);

    return el('div', { class: 'contact' }, [info, formCard]);
  }, { skeleton: () => skeletonText(6) });
}
