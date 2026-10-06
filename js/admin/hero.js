import { createSingletonForm } from './crud.js';

const ELEMENT_LABELS = {
  badge: 'Badge', headline: 'Headline', subheadline: 'Subheadline', description: 'Description',
  ctas: 'CTA buttons', stat: 'Statistic', trust: 'Trust statement',
};
const DEFAULT_ELEMENTS = Object.keys(ELEMENT_LABELS).map((key) => ({ key, visible: true }));

export function render(view) {
  createSingletonForm({
    table: 'hero',
    title: 'Hero section',
    description: 'The first thing visitors see. Reorder or hide individual elements below.',
    defaults: { media_type: 'image', elements: DEFAULT_ELEMENTS },
    beforeSave: (payload) => {
      // Make sure every element key is present exactly once.
      const keys = new Set(payload.elements.map((e) => e.key));
      const elements = [...payload.elements, ...DEFAULT_ELEMENTS.filter((e) => !keys.has(e.key))];
      return { ...payload, elements };
    },
    fields: [
      { type: 'section', label: 'Text' },
      { name: 'badge', label: 'Badge', max: 80 },
      { name: 'headline', label: 'Headline', required: true, max: 200, full: true },
      { name: 'subheadline', label: 'Subheadline', type: 'textarea', max: 300, rows: 2, full: true },
      { name: 'description', label: 'Short description', type: 'textarea', max: 1000, rows: 3, full: true },
      { type: 'section', label: 'Calls to action' },
      { name: 'primary_cta_label', label: 'Primary CTA label', max: 40 },
      { name: 'primary_cta_url', label: 'Primary CTA URL', type: 'url', hint: '#contact, pricing.html or https://…' },
      { name: 'secondary_cta_label', label: 'Secondary CTA label', max: 40 },
      { name: 'secondary_cta_url', label: 'Secondary CTA URL', type: 'url' },
      { type: 'section', label: 'Statistic & trust' },
      { name: 'stat_value', label: 'Statistic value', max: 30, placeholder: 'e.g. 20+' },
      { name: 'stat_label', label: 'Statistic label', max: 80 },
      { name: 'trust_statement', label: 'Trust statement', max: 200, full: true },
      { type: 'section', label: 'Media' },
      { name: 'media_type', label: 'Media type', type: 'select', required: true, options: [
        { value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }, { value: 'none', label: 'None' },
      ] },
      { name: 'media_alt', label: 'Media description (alt text)', max: 200 },
      { name: 'media_url', label: 'Hero image or video', type: 'media', upload: { kind: 'media', folder: 'hero' }, hint: 'Upload an image (media type Image) or an MP4/WebM video (media type Video).',
        validate: (v, all) => {
          if (!v) return null;
          const isVideo = /\.(mp4|webm)(\?|$)/i.test(v);
          if (all.media_type === 'video' && !isVideo) return 'Media type is Video: upload an MP4 or WebM file.';
          if (all.media_type === 'image' && isVideo) return 'Media type is Image: upload an image, or switch the media type to Video.';
          return null;
        } },
      { name: 'media_poster_url', label: 'Video poster image', type: 'image', upload: { kind: 'image', folder: 'hero' }, hint: 'Shown before the video loads.' },
      { type: 'section', label: 'Element order & visibility', hint: 'Drag or use the arrows to reorder; untick to hide.' },
      { name: 'elements', label: 'Hero elements', type: 'elements', elementLabels: ELEMENT_LABELS, default: DEFAULT_ELEMENTS },
    ],
  }).mount(view);

}
