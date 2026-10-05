/**
 * Project details page: project.html?slug=my-project
 * Only published projects can be loaded (enforced by RLS and the query).
 */
import { h, clear, lazyImg, safeUrl, isExternal, formatMonthYear } from '../dom.js';
import { isConfigured } from '../supabase-client.js';
import { getPublishedProject, getProjectPageChrome } from '../api.js';
import { renderMarkdown } from '../markdown.js';
import { errorState, emptyState, openModal } from '../ui.js';
import { initThemeToggles } from '../theme.js';
import { applySettings, renderHeader, renderFooter, initReveal } from './chrome.js';

const main = document.getElementById('main');
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function showState(node) {
  document.body.classList.remove('is-loading');
  clear(main, h('div', { class: 'container page-state' }, node,
    h('p', { class: 'page-state__back' }, h('a', { class: 'btn btn--ghost', href: 'index.html#projects', text: '← Back to projects' }))));
}

function externalLink(url, label) {
  const external = isExternal(url);
  return h('a', {
    class: 'btn btn--ghost', href: safeUrl(url),
    target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null, text: label,
  });
}

/** Simple lightbox for gallery images with previous/next navigation. */
function openLightbox(images, start, title) {
  let index = start;
  const img = h('img', { class: 'lightbox__img', alt: '' });
  const caption = h('p', { class: 'lightbox__caption' });
  const prev = h('button', { type: 'button', class: 'icon-btn lightbox__nav', 'aria-label': 'Previous image', text: '‹' });
  const next = h('button', { type: 'button', class: 'icon-btn lightbox__nav', 'aria-label': 'Next image', text: '›' });

  const show = () => {
    img.setAttribute('src', safeUrl(images[index]));
    img.setAttribute('alt', `${title} — image ${index + 1} of ${images.length}`);
    caption.textContent = `${index + 1} / ${images.length}`;
  };
  const step = (delta) => { index = (index + delta + images.length) % images.length; show(); };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  const modal = openModal({
    title,
    size: 'xl',
    className: 'lightbox',
    content: h('div', { class: 'lightbox__stage' }, images.length > 1 && prev, img, images.length > 1 && next),
  });
  modal.footer.append(caption);
  modal.dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  });
  show();
}

function renderProject(project) {
  const gallery = project.gallery || [];
  const article = h('article', { class: 'project-detail' },
    h('header', { class: 'project-detail__header container' },
      h('a', { class: 'link-arrow project-detail__back', href: 'index.html#projects', text: '← All projects' }),
      h('p', { class: 'project-detail__eyebrow' },
        project.category && h('span', { text: project.category }),
        h('time', { datetime: project.created_at.slice(0, 10), text: formatMonthYear(project.created_at.slice(0, 10)) })),
      h('h1', { class: 'project-detail__title', text: project.title }),
      h('p', { class: 'project-detail__summary', text: project.summary }),
      project.tech_stack?.length > 0 && h('ul', { class: 'tags', 'aria-label': 'Technologies' },
        project.tech_stack.map((t) => h('li', { class: 'tag', text: t }))),
      (project.live_url || project.github_url) && h('div', { class: 'project-detail__links' },
        project.live_url && externalLink(project.live_url, 'View live ↗'),
        project.github_url && externalLink(project.github_url, 'Source on GitHub ↗'))),

    project.cover_image_url && h('figure', { class: 'project-detail__cover container reveal' },
      lazyImg(project.cover_image_url, `Cover image for ${project.title}`)),

    project.content?.trim() && h('div', { class: 'project-detail__content container prose reveal' }, renderMarkdown(project.content)),

    gallery.length > 0 && h('section', { class: 'project-detail__gallery container', 'aria-labelledby': 'gallery-title' },
      h('h2', { id: 'gallery-title', class: 'project-detail__gallery-title', text: 'Gallery' }),
      h('ul', { class: 'gallery' }, gallery.map((url, i) => h('li', { class: 'gallery__item reveal' },
        h('button', {
          type: 'button', class: 'gallery__btn', dataset: { index: String(i) },
          'aria-label': `Open image ${i + 1} of ${gallery.length}`,
        }, lazyImg(url, `${project.title} — image ${i + 1}`)))))),
  );

  article.addEventListener('click', (event) => {
    const button = event.target.closest('.gallery__btn');
    if (button) openLightbox(gallery, Number(button.dataset.index), project.title);
  });
  return article;
}

async function load() {
  const slug = new URLSearchParams(window.location.search).get('slug') || '';
  document.body.classList.add('is-loading');

  let chrome = null;
  let project = null;
  try {
    [chrome, project] = await Promise.all([
      getProjectPageChrome(),
      SLUG_RE.test(slug) ? getPublishedProject(slug) : Promise.resolve(null),
    ]);
  } catch (error) {
    console.error(error);
    showState(errorState({ message: 'This project could not be loaded. Please try again.', onRetry: () => window.location.reload() }));
    return;
  }

  renderHeader({ settings: chrome.settings, sections: chrome.sections, base: 'index.html' });
  renderFooter({ settings: chrome.settings, socials: chrome.socials });

  if (!project) {
    applySettings(chrome.settings, { title: `Project not found · ${chrome.settings?.site_title || ''}` });
    showState(emptyState({ icon: '?', title: 'Project not found', message: 'This project does not exist or is no longer available.' }));
    return;
  }

  applySettings(chrome.settings, {
    title: `${project.title} · ${chrome.settings?.site_title || ''}`,
    description: project.summary,
    image: project.cover_image_url,
    type: 'article',
  });
  document.body.classList.remove('is-loading');
  clear(main, renderProject(project));
  initReveal(main);
}

initThemeToggles();
if (isConfigured) {
  load();
} else {
  showState(emptyState({ icon: '⚙', title: 'Almost there', message: 'Add your Supabase URL and anon key to js/config.js (see README).' }));
}
