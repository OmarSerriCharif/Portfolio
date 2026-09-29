/**
 * Tiny Markdown renderer with a strict allowlist.
 *
 * Instead of producing an HTML string (which would then need sanitizing),
 * this parser builds DOM nodes directly. Only the tags and attributes listed
 * in ALLOWED below can ever be created, text is always inserted with text
 * nodes, and URLs pass through a protocol allowlist. Raw HTML in the source is
 * rendered as literal text.
 *
 * Supported syntax:
 *   # / ## / ### / ####  headings (rendered as h2–h5; the page owns h1)
 *   paragraphs, blank-line separated
 *   - * +  unordered lists,  1.  ordered lists
 *   > blockquotes
 *   ``` fenced code blocks ```,  `inline code`
 *   **bold**  __bold__  *italic*  _italic_  ~~strikethrough~~
 *   [link text](https://example.com)   ![alt text](https://example.com/image.jpg)
 *   --- horizontal rule
 *   \* backslash escapes
 */

const ALLOWED = {
  p: [], h2: [], h3: [], h4: [], h5: [], strong: [], em: [], del: [], code: [], pre: [],
  ul: [], ol: [], li: [], blockquote: [], hr: [], br: [],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'loading', 'decoding'],
};

const LINK_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/** Create an allowlisted element; anything else is a programming error. */
function make(tag, attrs = {}) {
  if (!Object.hasOwn(ALLOWED, tag)) throw new Error(`Markdown: tag <${tag}> is not allowed`);
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (!ALLOWED[tag].includes(name)) throw new Error(`Markdown: attribute ${name} is not allowed on <${tag}>`);
    el.setAttribute(name, value);
  }
  return el;
}

/** Returns a safe URL or null. Images must be absolute https. */
function cleanUrl(raw, { imageOnly = false } = {}) {
  const url = raw.trim();
  if (!imageOnly && (url.startsWith('#') || url.startsWith('/'))) return url;
  try {
    const parsed = new URL(url, window.location.href);
    if (imageOnly) return parsed.protocol === 'https:' ? parsed.href : null;
    return LINK_PROTOCOLS.includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

/* ------------------------------ Inline parsing ----------------------------- */

const INLINE_RULES = [
  { type: 'escape', re: /\\([\\`*_{}[\]()#+\-.!~>|])/g },
  { type: 'code', re: /`([^`\n]+)`/g },
  { type: 'image', re: /!\[([^\]\n]*)\]\(([^)\s]+)\)/g },
  { type: 'link', re: /\[([^\]\n]+)\]\(([^)\s]+)\)/g },
  { type: 'strong', re: /\*\*(?=\S)([\s\S]+?)\*\*|__(?=\S)([\s\S]+?)__/g },
  { type: 'del', re: /~~(?=\S)([\s\S]+?)~~/g },
  { type: 'em', re: /\*(?=\S)([^*]+?)\*|(?<![A-Za-z0-9])_(?=\S)([^_]+?)_(?![A-Za-z0-9])/g },
];

/** Parse inline Markdown into `parent`. */
function parseInline(text, parent) {
  let pos = 0;
  while (pos < text.length) {
    // Find the earliest match among all rules (ties go to the earlier rule).
    let best = null;
    for (const rule of INLINE_RULES) {
      rule.re.lastIndex = pos;
      const match = rule.re.exec(text);
      if (match && (!best || match.index < best.match.index)) best = { rule, match };
    }
    if (!best) {
      parent.append(document.createTextNode(text.slice(pos)));
      break;
    }
    const { rule, match } = best;
    if (match.index > pos) parent.append(document.createTextNode(text.slice(pos, match.index)));
    renderInline(rule.type, match, parent);
    pos = match.index + match[0].length;
  }
}

function renderInline(type, match, parent) {
  switch (type) {
    case 'escape':
      parent.append(document.createTextNode(match[1]));
      break;
    case 'code': {
      const code = make('code');
      code.textContent = match[1];
      parent.append(code);
      break;
    }
    case 'image': {
      const src = cleanUrl(match[2], { imageOnly: true });
      if (src) parent.append(make('img', { src, alt: match[1], loading: 'lazy', decoding: 'async' }));
      else parent.append(document.createTextNode(match[1]));
      break;
    }
    case 'link': {
      const href = cleanUrl(match[2]);
      if (!href) {
        parseInline(match[1], parent);
        break;
      }
      const external = /^https?:/i.test(href);
      const a = make('a', external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href });
      parseInline(match[1], a);
      parent.append(a);
      break;
    }
    case 'strong':
    case 'del':
    case 'em': {
      const el = make(type);
      parseInline(match[1] ?? match[2], el);
      parent.append(el);
      break;
    }
    default:
      parent.append(document.createTextNode(match[0]));
  }
}

/* ------------------------------ Block parsing ------------------------------ */

const RE = {
  fence: /^\s*```/,
  heading: /^(#{1,4})\s+(.+?)\s*#*\s*$/,
  hr: /^\s*([-*_])(\s*\1){2,}\s*$/,
  quote: /^\s*>\s?(.*)$/,
  ul: /^\s*[-*+]\s+(.*)$/,
  ol: /^\s*\d{1,9}[.)]\s+(.*)$/,
  blank: /^\s*$/,
};

function isBlockStart(line) {
  return RE.fence.test(line) || RE.heading.test(line) || RE.hr.test(line) ||
    RE.quote.test(line) || RE.ul.test(line) || RE.ol.test(line);
}

function parseBlocks(lines, parent) {
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (RE.blank.test(line)) { i += 1; continue; }

    // Fenced code block
    if (RE.fence.test(line)) {
      const body = [];
      i += 1;
      while (i < lines.length && !RE.fence.test(lines[i])) body.push(lines[i++]);
      i += 1; // closing fence (or end of input)
      const pre = make('pre');
      const code = make('code');
      code.textContent = body.join('\n');
      pre.append(code);
      parent.append(pre);
      continue;
    }

    // Heading: # → h2 … #### → h5
    const heading = line.match(RE.heading);
    if (heading) {
      const el = make(`h${heading[1].length + 1}`);
      parseInline(heading[2], el);
      parent.append(el);
      i += 1;
      continue;
    }

    if (RE.hr.test(line)) {
      parent.append(make('hr'));
      i += 1;
      continue;
    }

    // Blockquote (recursive)
    if (RE.quote.test(line)) {
      const inner = [];
      while (i < lines.length && RE.quote.test(lines[i])) inner.push(lines[i++].match(RE.quote)[1]);
      const bq = make('blockquote');
      parseBlocks(inner, bq);
      parent.append(bq);
      continue;
    }

    // Lists (flat; indented continuation lines join the previous item)
    const listType = RE.ul.test(line) ? 'ul' : RE.ol.test(line) ? 'ol' : null;
    if (listType) {
      const itemRe = RE[listType];
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        const item = l.match(itemRe);
        if (item) {
          items.push([item[1]]);
        } else if (items.length && /^\s{2,}\S/.test(l) && !isBlockStart(l)) {
          items[items.length - 1].push(l.trim());
        } else {
          break;
        }
        i += 1;
      }
      const list = make(listType);
      for (const parts of items) {
        const li = make('li');
        parseInline(parts.join(' '), li);
        list.append(li);
      }
      parent.append(list);
      continue;
    }

    // Paragraph: consecutive lines until a blank line or another block
    const paragraph = [];
    while (i < lines.length && !RE.blank.test(lines[i]) && !(paragraph.length && isBlockStart(lines[i]))) {
      paragraph.push(lines[i]);
      i += 1;
    }
    const p = make('p');
    paragraph.forEach((text, index) => {
      // A trailing double space or backslash forces a line break.
      const hardBreak = /( {2,}|\\)$/.test(text);
      parseInline(text.replace(/( {2,}|\\)$/, '').trim(), p);
      if (index < paragraph.length - 1) p.append(hardBreak ? make('br') : document.createTextNode(' '));
    });
    parent.append(p);
  }
}

/**
 * Render Markdown source into a DocumentFragment of allowlisted nodes.
 * @param {string} source
 * @returns {DocumentFragment}
 */
export function renderMarkdown(source) {
  const fragment = document.createDocumentFragment();
  if (typeof source !== 'string' || !source.trim()) return fragment;
  parseBlocks(source.replace(/\r\n?/g, '\n').split('\n'), fragment);
  return fragment;
}

/** Strip Markdown to plain text (for excerpts and meta descriptions). */
export function markdownToText(source = '') {
  const container = document.createElement('div');
  container.append(renderMarkdown(source));
  return container.textContent.replace(/\s+/g, ' ').trim();
}
