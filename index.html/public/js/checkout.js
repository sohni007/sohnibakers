/* Sohni Bakers — checkout (validation, delivery & payment steps, proof upload, order submit). */
(function () {
  'use strict';
  var SB = window.SB;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var form = $('[data-checkout-form]');
  if (!form || !SB) return;
  var cfg = JSON.parse($('#checkout-data').textContent);
  var banner = $('[data-checkout-error]');
  var lines = [], subtotal = 0, cartOk = true;

  var pakMobile = function (v) {
    var d = String(v || '').replace(/[\s\-().]/g, '');
    if (d.charAt(0) === '+') d = d.slice(1);
    if (d.indexOf('0092') === 0) d = d.slice(4); else if (d.indexOf('92') === 0) d = d.slice(2); else if (d.charAt(0) === '0') d = d.slice(1);
    return /^3\d{9}$/.test(d) ? '0' + d : null;
  };
  var val = function (n) { var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; };
  var radio = function (n) { var el = $('input[name=' + n + ']:checked', form); return el ? el.value : ''; };

  // ------------------------------------------------------------ errors
  var FIELD_FOR = { name: 'name', phone: 'phone', whatsapp: 'whatsapp', email: 'email', areaId: 'areaId', address: 'address', city: 'city', date: 'date', time: 'time', transactionId: 'transactionId', screenshot: 'screenshot', confirmPaid: 'confirmPaid' };
  function setError(key, msg) {
    var p = document.getElementById('e-' + key);
    if (p) { p.textContent = msg || ''; p.hidden = !msg; }
    var inputName = FIELD_FOR[key];
    var input = inputName ? form.elements[inputName] : null;
    if (input && input.classList) { input.classList.toggle('is-invalid', !!msg); input.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
    if (key === 'screenshot') $('[data-upload-box]').classList.toggle('is-invalid', !!msg);
    if (key === 'fulfillment') $$('.choice-grid', form)[0].classList.toggle('is-invalid', !!msg);
    if (key === 'paymentMethod') $('.choice-grid.three', form).classList.toggle('is-invalid', !!msg);
  }
  function clearErrors() { $$('.field-error', form).forEach(function (p) { p.hidden = true; p.textContent = ''; }); $$('.is-invalid', form).forEach(function (el) { el.classList.remove('is-invalid'); }); }
  function showBanner(msg) { banner.textContent = msg; banner.hidden = !msg; if (msg) { banner.focus({ preventScroll: true }); banner.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  function focusFirstError() {
    var p = $$('.field-error', document).filter(function (x) { return !x.hidden; })[0];
    if (!p) return;
    var field = p.closest('.field, fieldset, .summary-card') || p;
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var input = $('input:not([type=hidden]),select,textarea', field);
    if (input) setTimeout(function () { input.focus({ preventScroll: true }); }, 350);
  }

  // ------------------------------------------------------------ totals
  function deliveryCharge() {
    if (radio('fulfillment') !== 'delivery') return 0;
    var id = Number(val('areaId'));
    var area = cfg.delivery.areas.filter(function (a) { return a.active && a.id === id; })[0];
    return area ? area.charge : null;
  }
  function renderTotals() {
    var dc = deliveryCharge();
    $('[data-sum-subtotal]').textContent = SB.money(subtotal);
    $('[data-sum-delivery]').textContent = dc === null ? 'Select area' : radio('fulfillment') === 'pickup' ? 'Pickup — PKR 0' : SB.money(dc);
    var total = subtotal + (dc || 0);
    $('[data-sum-total]').textContent = SB.money(total);
    $$('[data-pay-amount]').forEach(function (el) { el.textContent = dc === null ? SB.money(total) + ' + delivery' : SB.money(total); });
  }

  function renderSummary() {
    var items = SB.cart.items();
    if (!items.length) { form.hidden = true; $('[data-checkout-empty]').hidden = false; return; }
    SB.getCatalog().then(function (data) {
      lines = SB.resolveLines(data);
      cartOk = lines.every(function (l) { return !l.missing && !l.unavailable; });
      subtotal = lines.reduce(function (s, l) { return s + (l.total && !l.unavailable ? l.total : 0); }, 0);
      $('[data-summary-items]').innerHTML = lines.map(function (l) {
        if (l.missing) return '<li><span></span><div><strong>Item no longer available</strong><span>Please remove it from your cart</span></div><b>—</b></li>';
        return '<li><img src="' + SB.esc(l.product.image) + '" alt="" width="52" height="39"><div><strong>' + SB.esc(l.product.name) + '</strong><span>' +
          (l.product.type === 'cake' ? 'Cake Weight: ' : '') + SB.esc(l.variant.label) + ' × ' + l.q + (l.unavailable ? ' — <em>currently unavailable</em>' : '') + '</span></div><b>' + SB.money(l.total) + '</b></li>';
      }).join('');
      setError('cart', cartOk ? '' : 'Some items in your cart are currently unavailable. Please remove them from your cart to continue.');
      form.hidden = false;
      renderTotals();
    }).catch(function () {
      showBanner('We could not load your cart because of a network problem. Please check your internet connection and reload the page.');
    });
  }

  // ------------------------------------------------------------ fulfillment
  function syncFulfillment() {
    var f = radio('fulfillment');
    var isPickup = f === 'pickup';
    $('[data-delivery-fields]').hidden = isPickup;
    $('[data-pickup-fields]').hidden = !isPickup;
    $('[data-date-label]').textContent = isPickup ? 'Pickup Date' : 'Delivery Date';
    $('[data-time-label]').textContent = isPickup ? 'Pickup' : 'Delivery';
    if (f) setError('fulfillment', '');
    renderTotals();
  }
  $$('input[name=fulfillment]', form).forEach(function (r) { r.addEventListener('change', syncFulfillment); });
  form.elements.areaId.addEventListener('change', function () { if (val('areaId')) setError('areaId', ''); renderTotals(); });

  // ------------------------------------------------------------ payment
  function syncPayment() {
    var m = radio('paymentMethod');
    $$('[data-payment-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-payment-panel') !== m; });
    $('[data-proof-fields]').hidden = !m;
    if (m) setError('paymentMethod', '');
    renderTotals();
  }
  $$('input[name=paymentMethod]', form).forEach(function (r) { r.addEventListener('change', syncPayment); });

  // ------------------------------------------------------------ upload preview
  var fileInput = form.elements.screenshot, preview = $('[data-upload-preview]'), emptyBox = $('.upload-empty');
  var OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  function checkFile() {
    var f = fileInput.files && fileInput.files[0];
    if (!f) return '';
    if (OK_TYPES.indexOf(f.type) === -1 && !/\.(jpe?g|png|webp|pdf)$/i.test(f.name)) return 'Please upload your payment screenshot as a JPG, PNG or WEBP image (or PDF).';
    if (f.size > cfg.maxProofBytes) return 'Your payment screenshot is too large. Please upload a file under ' + Math.round(cfg.maxProofBytes / 1048576) + ' MB.';
    return '';
  }
  fileInput.addEventListener('change', function () {
    var f = fileInput.files && fileInput.files[0];
    var err = checkFile();
    setError('screenshot', err);
    if (!f || err) { preview.hidden = true; emptyBox.hidden = false; return; }
    preview.innerHTML = '';
    if (f.type.indexOf('image/') === 0) {
      var img = document.createElement('img'); img.alt = 'Payment screenshot preview'; img.src = URL.createObjectURL(f); preview.appendChild(img);
    }
    var info = document.createElement('div');
    info.innerHTML = '<div class="file-name"></div><div class="file-change">Tap to change file</div>';
    info.firstChild.textContent = f.name + ' (' + Math.max(1, Math.round(f.size / 1024)) + ' KB)';
    preview.appendChild(info);
    preview.hidden = false; emptyBox.hidden = true;
  });

  // ------------------------------------------------------------ live clearing of errors
  function maybeHideBanner() { if (!banner.hidden && !$$('.field-error', document).some(function (x) { return !x.hidden; })) banner.hidden = true; }
  form.addEventListener('input', function (e) { var n = e.target.name; if (n && document.getElementById('e-' + n)) setError(n, ''); maybeHideBanner(); });
  form.addEventListener('change', function () { setTimeout(maybeHideBanner, 0); });
  form.elements.confirmPaid.addEventListener('change', function () { if (form.elements.confirmPaid.checked) setError('confirmPaid', ''); });

  // ------------------------------------------------------------ validation (mirrors server rules)
  function validate() {
    var e = {};
    if (val('name').length < 2) e.name = 'Please enter your full name.';
    if (!val('phone')) e.phone = 'Please enter your mobile number.';
    else if (!pakMobile(val('phone'))) e.phone = 'Please enter a valid Pakistani mobile number, e.g. 0300 1234567.';
    if (val('whatsapp') && !pakMobile(val('whatsapp'))) e.whatsapp = 'Please enter a valid WhatsApp number, e.g. 0300 1234567.';
    if (val('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email'))) e.email = 'Please enter a valid email address (or leave it empty).';
    var f = radio('fulfillment');
    if (!f) e.fulfillment = 'Please choose Home Delivery or Pickup.';
    if (f === 'delivery') {
      if (!val('areaId')) e.areaId = 'Please select your delivery area.';
      if (val('address').length < 8) e.address = 'Please enter your complete delivery address (house no, street, block).';
      if (val('city').length < 2) e.city = 'Please enter your city.';
    }
    if (!val('date')) e.date = f === 'pickup' ? 'Please choose a pickup date.' : 'Please choose a delivery date.';
    else if (val('date') < cfg.today) e.date = 'Please choose a valid date (today or later).';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(val('time'))) e.time = 'Please choose your preferred time.';
    var m = cfg.payments.filter(function (p) { return p.id === radio('paymentMethod'); })[0];
    if (!m) e.paymentMethod = 'Please select a payment method.';
    else {
      if (m.requireTransactionId && val('transactionId').length < 4) e.transactionId = 'Please enter the Transaction ID / Reference Number from your payment.';
      else if (val('transactionId') && !/^[A-Za-z0-9\-_/ #.]+$/.test(val('transactionId'))) e.transactionId = 'Transaction ID can only contain letters, numbers and dashes.';
      var fe = checkFile();
      if (m.requireScreenshot && !(fileInput.files && fileInput.files[0])) e.screenshot = 'Please upload your payment screenshot.';
      else if (fe) e.screenshot = fe;
      if (!form.elements.confirmPaid.checked) e.confirmPaid = 'Please confirm that you have sent the payment.';
    }
    if (!SB.cart.items().length) e.cart = 'Your cart is empty. Please add something delicious first!';
    else if (!cartOk) e.cart = 'Some items in your cart are currently unavailable. Please remove them from your cart to continue.';
    return e;
  }

  // ------------------------------------------------------------ submit
  var submitBtn = $('[data-place-order]'), submitting = false;
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (submitting) return;
    clearErrors(); showBanner('');
    var errs = validate();
    var keys = Object.keys(errs);
    if (keys.length) {
      keys.forEach(function (k) { setError(k, errs[k]); });
      showBanner('Please check the highlighted fields and try again.');
      setTimeout(focusFirstError, 400);
      return;
    }
    var f = radio('fulfillment');
    var payload = {
      items: SB.cart.items().map(function (i) { return { variantId: i.v, quantity: i.q }; }),
      customer: { name: val('name'), phone: val('phone'), whatsapp: val('whatsapp'), email: val('email') },
      fulfillment: f,
      delivery: f === 'delivery' ? { areaId: Number(val('areaId')), address: val('address'), area: val('area'), city: val('city'), landmark: val('landmark') } : {},
      date: val('date'), time: val('time'), notes: form.elements.notes.value.trim(),
      payment: { method: radio('paymentMethod'), transactionId: val('transactionId') },
      confirmPaid: form.elements.confirmPaid.checked,
    };
    var fd = new FormData();
    fd.append('order', JSON.stringify(payload));
    if (fileInput.files && fileInput.files[0]) fd.append('screenshot', fileInput.files[0]);

    submitting = true;
    submitBtn.disabled = true; submitBtn.classList.add('is-loading');
    var original = submitBtn.innerHTML;
    submitBtn.textContent = 'Placing your order…';
    var done = function () { submitting = false; submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); submitBtn.innerHTML = original; };

    fetch('/api/orders', { method: 'POST', body: fd, headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; }); })
      .then(function (res) {
        if (res.status === 201 && res.body.url) {
          SB.cart.clear();
          window.location.href = res.body.url;
          return;
        }
        done();
        if (res.status === 422 && res.body.fields) {
          Object.keys(res.body.fields).forEach(function (k) { setError(k, res.body.fields[k]); });
          showBanner(res.body.error || 'Please check the highlighted fields and try again.');
          if (res.body.fields.cart) renderSummary();
          setTimeout(focusFirstError, 400);
          return;
        }
        if (res.status === 413) { setError('screenshot', res.body.error || 'Your payment screenshot is too large.'); showBanner('Payment screenshot upload failed: the file is too large.'); return; }
        showBanner((res.body && res.body.error) || 'Sorry, your order could not be submitted. Please try again, or send your order to us on WhatsApp.');
      })
      .catch(function () {
        done();
        showBanner('Network error — we could not reach Sohni Bakers. Please check your internet connection and try again. Your order has NOT been placed yet.');
      });
  });

  document.addEventListener('cart:change', renderSummary);
  syncFulfillment(); syncPayment(); renderSummary();
})();
