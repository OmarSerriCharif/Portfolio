/*
 * Runs synchronously in <head> (classic script, not a module) so the saved
 * theme is applied before the first paint and there is no light/dark flash.
 */
(function () {
  var theme = null;
  try {
    // Keep this key in sync with THEME_STORAGE_KEY in js/constants.js.
    theme = window.localStorage.getItem('portfolio-theme');
  } catch (e) {
    theme = null;
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
