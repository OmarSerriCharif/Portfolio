/* Runs synchronously in <head> to apply the saved theme and cached brand colours before first paint. */
(function () {
  var root = document.documentElement;
  var stored = null;
  var fallback = 'system';
  var brand = null;
  try {
    stored = localStorage.getItem('theme');
    fallback = localStorage.getItem('site-default-theme') || 'system';
    brand = JSON.parse(localStorage.getItem('site-brand') || 'null');
  } catch (e) { /* storage unavailable */ }
  var theme = stored === 'light' || stored === 'dark' ? stored : fallback;
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  if (brand && typeof brand === 'object') {
    var re = /^#[0-9a-fA-F]{6}$/;
    if (re.test(brand.primary)) root.style.setProperty('--brand-primary', brand.primary);
    if (re.test(brand.secondary)) root.style.setProperty('--brand-secondary', brand.secondary);
    if (re.test(brand.accent)) root.style.setProperty('--brand-accent', brand.accent);
  }
  root.classList.add('js');
})();
