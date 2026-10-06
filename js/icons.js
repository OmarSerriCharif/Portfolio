// Inline SVG icon set (stroke icons, 24×24). Icons are built with createElementNS — no innerHTML.
// The admin picks icons by key; unknown keys fall back to a neutral dot.

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  'share': [['circle', { cx: 18, cy: 5, r: 3 }], ['circle', { cx: 6, cy: 12, r: 3 }], ['circle', { cx: 18, cy: 19, r: 3 }], ['line', { x1: 8.59, y1: 13.51, x2: 15.42, y2: 17.49 }], ['line', { x1: 15.41, y1: 6.51, x2: 8.59, y2: 10.49 }]],
  'image': [['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }], ['circle', { cx: 8.5, cy: 8.5, r: 1.5 }], ['polyline', { points: '21 15 16 10 5 21' }]],
  'pen': [['path', { d: 'M12 20h9' }], ['path', { d: 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' }]],
  'user': [['path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }], ['circle', { cx: 12, cy: 7, r: 4 }]],
  'users': [['path', { d: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' }], ['circle', { cx: 9, cy: 7, r: 4 }], ['path', { d: 'M23 21v-2a4 4 0 0 0-3-3.87' }], ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]],
  'target': [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 6 }], ['circle', { cx: 12, cy: 12, r: 2 }]],
  'bar-chart': [['line', { x1: 18, y1: 20, x2: 18, y2: 10 }], ['line', { x1: 12, y1: 20, x2: 12, y2: 4 }], ['line', { x1: 6, y1: 20, x2: 6, y2: 14 }]],
  'trending-up': [['polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }], ['polyline', { points: '17 6 23 6 23 12' }]],
  'calendar': [['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }], ['line', { x1: 16, y1: 2, x2: 16, y2: 6 }], ['line', { x1: 8, y1: 2, x2: 8, y2: 6 }], ['line', { x1: 3, y1: 10, x2: 21, y2: 10 }]],
  'globe': [['circle', { cx: 12, cy: 12, r: 10 }], ['line', { x1: 2, y1: 12, x2: 22, y2: 12 }], ['path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }]],
  'monitor': [['rect', { x: 2, y: 3, width: 20, height: 14, rx: 2 }], ['line', { x1: 8, y1: 21, x2: 16, y2: 21 }], ['line', { x1: 12, y1: 17, x2: 12, y2: 21 }]],
  'video': [['polygon', { points: '23 7 16 12 23 17 23 7' }], ['rect', { x: 1, y: 5, width: 15, height: 14, rx: 2 }]],
  'camera': [['path', { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' }], ['circle', { cx: 12, cy: 13, r: 4 }]],
  'message': [['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }]],
  'megaphone': [['path', { d: 'M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z' }], ['path', { d: 'M16 8a5 5 0 0 1 0 8' }], ['path', { d: 'M19 5a9 9 0 0 1 0 14' }]],
  'heart': [['path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }]],
  'star': [['polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }]],
  'check': [['polyline', { points: '20 6 9 17 4 12' }]],
  'x': [['line', { x1: 18, y1: 6, x2: 6, y2: 18 }], ['line', { x1: 6, y1: 6, x2: 18, y2: 18 }]],
  'shield': [['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }]],
  'award': [['circle', { cx: 12, cy: 8, r: 7 }], ['polyline', { points: '8.21 13.89 7 23 12 20 17 23 15.79 13.88' }]],
  'briefcase': [['rect', { x: 2, y: 7, width: 20, height: 14, rx: 2 }], ['path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }]],
  'home': [['path', { d: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }], ['polyline', { points: '9 22 9 12 15 12 15 22' }]],
  'activity': [['polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' }]],
  'mic': [['path', { d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' }], ['path', { d: 'M19 10v2a7 7 0 0 1-14 0v-2' }], ['line', { x1: 12, y1: 19, x2: 12, y2: 23 }], ['line', { x1: 8, y1: 23, x2: 16, y2: 23 }]],
  'type': [['polyline', { points: '4 7 4 4 20 4 20 7' }], ['line', { x1: 9, y1: 20, x2: 15, y2: 20 }], ['line', { x1: 12, y1: 4, x2: 12, y2: 20 }]],
  'layers': [['polygon', { points: '12 2 2 7 12 12 22 7 12 2' }], ['polyline', { points: '2 17 12 22 22 17' }], ['polyline', { points: '2 12 12 17 22 12' }]],
  'clock': [['circle', { cx: 12, cy: 12, r: 10 }], ['polyline', { points: '12 6 12 12 16 14' }]],
  'mail': [['path', { d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' }], ['polyline', { points: '22,6 12,13 2,6' }]],
  'phone': [['path', { d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' }]],
  'map-pin': [['path', { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }], ['circle', { cx: 12, cy: 10, r: 3 }]],
  'sun': [['circle', { cx: 12, cy: 12, r: 5 }], ['line', { x1: 12, y1: 1, x2: 12, y2: 3 }], ['line', { x1: 12, y1: 21, x2: 12, y2: 23 }], ['line', { x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 }], ['line', { x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 }], ['line', { x1: 1, y1: 12, x2: 3, y2: 12 }], ['line', { x1: 21, y1: 12, x2: 23, y2: 12 }], ['line', { x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 }], ['line', { x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 }]],
  'moon': [['path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }]],
  'menu': [['line', { x1: 3, y1: 12, x2: 21, y2: 12 }], ['line', { x1: 3, y1: 6, x2: 21, y2: 6 }], ['line', { x1: 3, y1: 18, x2: 21, y2: 18 }]],
  'arrow-right': [['line', { x1: 5, y1: 12, x2: 19, y2: 12 }], ['polyline', { points: '12 5 19 12 12 19' }]],
  'arrow-left': [['line', { x1: 19, y1: 12, x2: 5, y2: 12 }], ['polyline', { points: '12 19 5 12 12 5' }]],
  'external': [['path', { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' }], ['polyline', { points: '15 3 21 3 21 9' }], ['line', { x1: 10, y1: 14, x2: 21, y2: 3 }]],
  'plus': [['line', { x1: 12, y1: 5, x2: 12, y2: 19 }], ['line', { x1: 5, y1: 12, x2: 19, y2: 12 }]],
  'chevron-down': [['polyline', { points: '6 9 12 15 18 9' }]],
  'chevron-up': [['polyline', { points: '18 15 12 9 6 15' }]],
  'grip': [['circle', { cx: 9, cy: 5, r: 1 }], ['circle', { cx: 9, cy: 12, r: 1 }], ['circle', { cx: 9, cy: 19, r: 1 }], ['circle', { cx: 15, cy: 5, r: 1 }], ['circle', { cx: 15, cy: 12, r: 1 }], ['circle', { cx: 15, cy: 19, r: 1 }]],
  'trash': [['polyline', { points: '3 6 5 6 21 6' }], ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }]],
  'eye': [['path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
  'eye-off': [['path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }], ['line', { x1: 1, y1: 1, x2: 23, y2: 23 }]],
  'log-out': [['path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }], ['polyline', { points: '16 17 21 12 16 7' }], ['line', { x1: 21, y1: 12, x2: 9, y2: 12 }]],
  'inbox': [['polyline', { points: '22 12 16 12 14 15 10 15 8 12 2 12' }], ['path', { d: 'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' }]],
  'sliders': [['line', { x1: 4, y1: 21, x2: 4, y2: 14 }], ['line', { x1: 4, y1: 10, x2: 4, y2: 3 }], ['line', { x1: 12, y1: 21, x2: 12, y2: 12 }], ['line', { x1: 12, y1: 8, x2: 12, y2: 3 }], ['line', { x1: 20, y1: 21, x2: 20, y2: 16 }], ['line', { x1: 20, y1: 12, x2: 20, y2: 3 }], ['line', { x1: 1, y1: 14, x2: 7, y2: 14 }], ['line', { x1: 9, y1: 8, x2: 15, y2: 8 }], ['line', { x1: 17, y1: 16, x2: 23, y2: 16 }]],
  'tag': [['path', { d: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z' }], ['line', { x1: 7, y1: 7, x2: 7.01, y2: 7 }]],
  'help': [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }], ['line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }]],
  'file': [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['polyline', { points: '14 2 14 8 20 8' }]],
  'grid': [['rect', { x: 3, y: 3, width: 7, height: 7 }], ['rect', { x: 14, y: 3, width: 7, height: 7 }], ['rect', { x: 14, y: 14, width: 7, height: 7 }], ['rect', { x: 3, y: 14, width: 7, height: 7 }]],
  'link': [['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }], ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }]],
  'lock': [['rect', { x: 3, y: 11, width: 18, height: 11, rx: 2 }], ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]],
  'refresh': [['polyline', { points: '23 4 23 10 17 10' }], ['path', { d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' }]],
  'zap': [['polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }]],
  'list': [['line', { x1: 8, y1: 6, x2: 21, y2: 6 }], ['line', { x1: 8, y1: 12, x2: 21, y2: 12 }], ['line', { x1: 8, y1: 18, x2: 21, y2: 18 }], ['line', { x1: 3, y1: 6, x2: 3.01, y2: 6 }], ['line', { x1: 3, y1: 12, x2: 3.01, y2: 12 }], ['line', { x1: 3, y1: 18, x2: 3.01, y2: 18 }]],
  'download': [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '7 10 12 15 17 10' }], ['line', { x1: 12, y1: 15, x2: 12, y2: 3 }]],
  'upload': [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['polyline', { points: '17 8 12 3 7 8' }], ['line', { x1: 12, y1: 3, x2: 12, y2: 15 }]],
  'compass': [['circle', { cx: 12, cy: 12, r: 10 }], ['polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' }]],
  // Social platforms
  'instagram': [['rect', { x: 2, y: 2, width: 20, height: 20, rx: 5 }], ['path', { d: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' }], ['line', { x1: 17.5, y1: 6.5, x2: 17.51, y2: 6.5 }]],
  'facebook': [['path', { d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' }]],
  'linkedin': [['path', { d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z' }], ['rect', { x: 2, y: 9, width: 4, height: 12 }], ['circle', { cx: 4, cy: 4, r: 2 }]],
  'x-social': [['path', { d: 'M4 4l16 16' }], ['path', { d: 'M20 4L4 20' }]],
  'youtube': [['path', { d: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z' }], ['polygon', { points: '9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02' }]],
  'tiktok': [['path', { d: 'M9 12a4 4 0 1 0 4 4V2a5 5 0 0 0 5 5' }]],
};

const SOCIAL_ICON = {
  instagram: 'instagram', facebook: 'facebook', linkedin: 'linkedin', x: 'x-social', youtube: 'youtube',
  tiktok: 'tiktok', whatsapp: 'message', snapchat: 'message', threads: 'message', behance: 'globe', website: 'globe', other: 'link',
};

export const ICON_NAMES = Object.keys(ICONS).filter((k) => !['x-social', 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok'].includes(k)).sort();

export function icon(name, { size = 20, label = null, className = 'icon' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', className);
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }
  const shapes = ICONS[name] || [['circle', { cx: 12, cy: 12, r: 3 }]];
  for (const [tag, attrs] of shapes) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) shape.setAttribute(k, String(v));
    svg.appendChild(shape);
  }
  return svg;
}

export function socialIcon(platform, opts) {
  return icon(SOCIAL_ICON[platform] || 'link', opts);
}

export function hasIcon(name) {
  return Boolean(name && ICONS[name]);
}
