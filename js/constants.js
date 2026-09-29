/**
 * App-wide constants shared by the public site and the dashboard.
 * Keep validation limits here in sync with the CHECK constraints in setup.sql.
 */

export const STORAGE_BUCKET = 'portfolio';

/** Upload rules, enforced client-side before upload and by the bucket server-side. */
export const UPLOAD_RULES = {
  image: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxBytes: 5 * 1024 * 1024,
    label: 'JPG, PNG, WebP or GIF up to 5 MB',
  },
  icon: {
    mimeTypes: ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon'],
    extensions: ['png', 'ico'],
    maxBytes: 512 * 1024,
    label: 'PNG or ICO up to 512 KB',
  },
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['pdf'],
    maxBytes: 10 * 1024 * 1024,
    label: 'PDF up to 10 MB',
  },
};

export const TIMELINE_KINDS = [
  { value: 'experience', label: 'Experience' },
  { value: 'education', label: 'Education' },
  { value: 'certification', label: 'Certification' },
];

/** Minimum seconds between two contact form submissions from the same browser. */
export const CONTACT_COOLDOWN_SECONDS = 60;

export const THEME_STORAGE_KEY = 'portfolio-theme';
