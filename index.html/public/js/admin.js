/* Sohni Bakers admin — tiny enhancements (works without it too). */
(function () {
  'use strict';
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-confirm]');
    if (b && !window.confirm(b.getAttribute('data-confirm'))) e.preventDefault();
  });
  // Prevent double submits
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.dataset.submitted) { e.preventDefault(); return; }
    f.dataset.submitted = '1';
    setTimeout(function () { delete f.dataset.submitted; }, 4000);
  });
  // Clean ?msg= from the URL after showing the message
  if (/[?&]msg=/.test(location.search)) {
    var u = new URL(location.href); u.searchParams.delete('msg');
    history.replaceState(null, '', u.pathname + (u.search || ''));
  }
})();
