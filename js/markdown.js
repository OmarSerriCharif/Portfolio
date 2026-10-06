// Minimal, strict Markdown renderer.
// It never produces HTML strings: every node is created with the DOM API and every piece of
// text is inserted as a text node, so database content cannot inject markup or scripts.
// Supported: # headings (1-3), paragraphs, **bold**, *italic* / _italic_, [links](url),
// - unordered lists, 1. ordered lists, > blockquotes. Everything else renders as plain text.

import { safeUrl, assetUrl, isExternal } from './utils.js';

const INLINE_RE = /(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\1|(\*|_)(?=\S)([\s\S]+?)(?<=\S)\3|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function renderInline(text, parent, depth = 0) {
  if (depth > 4) {
    parent.appendChild(document.createTextNode(text));
    return parent;
  }
  let last = 0;
  INLINE_RE.lastIndex = 0;
  const matches = [...text.matchAll(INLINE_RE)];
  for (const match of matches) {
    if (match.index > last) parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    if (match[1]) {
      const strong = document.createElement('strong');
      renderInline(match[2], strong, depth + 1);
      parent.appendChild(strong);
    } else if (match[3]) {
      const em = document.createElement('em');
      renderInline(match[4], em, depth + 1);
      parent.appendChild(em);
    } else {
      const href = safeUrl(match[6]);
      if (href) {
        const a = document.createElement('a');
        const resolved = assetUrl(href) || href;
        a.href = resolved;
        if (isExternal(resolved)) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        renderInline(match[5], a, depth + 1);
        parent.appendChild(a);
      } else {
        parent.appendChild(document.createTextNode(match[5]));
      }
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  return parent;
}

/**
 * Render Markdown into a DocumentFragment.
 * @param {string} source
 * @param {{ headingStart?: number }} options  headingStart = HTML level used for "#" (default 2)
 */
export function renderMarkdown(source, { headingStart = 2 } = {}) {
  const fragment = document.createDocumentFragment();
  if (!source) return fragment;

  const lines = String(source).replace(/\r\n?/g, '\n').split('\n');
  let paragraph = [];
  let list = null;
  let listType = null;
  let quote = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const p = document.createElement('p');
    renderInline(paragraph.join(' '), p);
    fragment.appendChild(p);
    paragraph = [];
  };
  const flushList = () => {
    if (list) fragment.appendChild(list);
    list = null;
    listType = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    const bq = document.createElement('blockquote');
    const p = document.createElement('p');
    renderInline(quote.join(' '), p);
    bq.appendChild(p);
    fragment.appendChild(bq);
    quote = [];
  };
  const flushAll = () => { flushParagraph(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) { flushAll(); continue; }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushAll();
      const level = Math.min(6, headingStart + heading[1].length - 1);
      const h = document.createElement(`h${level}`);
      renderInline(heading[2].replace(/\s+#+\s*$/, ''), h);
      fragment.appendChild(h);
      continue;
    }

    const quoteLine = /^>\s?(.*)$/.exec(trimmed);
    if (quoteLine) {
      flushParagraph(); flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    const ul = /^[-*+]\s+(.+)$/.exec(trimmed);
    const ol = /^\d{1,3}[.)]\s+(.+)$/.exec(trimmed);
    if (ul || ol) {
      flushParagraph(); flushQuote();
      const type = ul ? 'ul' : 'ol';
      if (listType !== type) {
        flushList();
        list = document.createElement(type);
        listType = type;
      }
      const li = document.createElement('li');
      renderInline((ul || ol)[1], li);
      list.appendChild(li);
      continue;
    }

    if (list && /^\s{2,}\S/.test(line)) {
      const lastItem = list.lastElementChild;
      lastItem.appendChild(document.createTextNode(' '));
      renderInline(trimmed, lastItem);
      continue;
    }

    flushList(); flushQuote();
    paragraph.push(trimmed);
  }
  flushAll();
  return fragment;
}

/** Plain-text version (used for meta descriptions). */
export function markdownToText(source, max = 300) {
  const text = String(source || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#>`]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
