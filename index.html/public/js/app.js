/* Sohni Bakers — storefront script (cart, drawer, menu filters, product page). No dependencies. */
(function () {
  'use strict';

  var KEY = 'sb_cart_v1';
  var MAX_AGE = 7 * 24 * 3600 * 1000; // cart kept for 7 days on this device
  var MAX_QTY = 20;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return 'PKR ' + Number(n || 0).toLocaleString('en-PK'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ------------------------------------------------------------ storage (safe)
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!d || !Array.isArray(d.items) || Date.now() - (d.t || 0) > MAX_AGE) return [];
      return d.items.filter(function (i) { return i && Number.isInteger(i.v) && Number.isInteger(i.q) && i.q > 0; });
    } catch (e) { return memory; }
  }
  var memory = [];
  function save(items) {
    memory = items;
    try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), items: items })); } catch (e) { /* private mode */ }
    updateBadge();
    document.dispatchEvent(new CustomEvent('cart:change'));
  }

  var cart = {
    items: load,
    count: function () { return load().reduce(function (s, i) { return s + i.q; }, 0); },
    add: function (variantId, qty) {
      var items = load(), v = Number(variantId), q = Math.max(1, Math.min(MAX_QTY, Number(qty) || 1));
      var found = items.find(function (i) { return i.v === v; });
      if (found) found.q = Math.min(MAX_QTY, found.q + q); else items.push({ v: v, q: q });
      save(items);
    },
    set: function (variantId, qty) {
      var items = load(), v = Number(variantId), q = Number(qty);
      items = items.map(function (i) { return i.v === v ? { v: v, q: Math.max(1, Math.min(MAX_QTY, q)) } : i; });
      save(items);
    },
    remove: function (variantId) { save(load().filter(function (i) { return i.v !== Number(variantId); })); },
    clear: function () { save([]); },
  };

  // ------------------------------------------------------------ catalog
  var catalogPromise = null;
  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch('/api/catalog', { headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); })
        .then(function (data) {
          var byVariant = {};
          data.products.forEach(function (p) { p.variants.forEach(function (v) { byVariant[v.id] = { product: p, variant: v }; }); });
          data.byVariant = byVariant;
          return data;
        })
        .catch(function (e) { catalogPromise = null; throw e; });
    }
    return catalogPromise;
  }

  /** Resolve cart lines against the live catalog (prices come from the server). */
  function resolveLines(data) {
    return load().map(function (i) {
      var hit = data.byVariant[i.v];
      if (!hit) return { missing: true, v: i.v, q: i.q };
      var ok = hit.product.orderable && hit.variant.available;
      return { v: i.v, q: i.q, product: hit.product, variant: hit.variant, unavailable: !ok, total: hit.variant.price * i.q };
    });
  }
  function deliveryEstimate(delivery) {
    if (delivery.homeDeliveryEnabled && delivery.areas.length) {
      var min = Math.min.apply(null, delivery.areas.map(function (a) { return a.charge; }));
      var name = delivery.areas.filter(function (a) { return a.charge === min; })[0].name;
      return { charge: min, note: 'Delivery shown for ' + name + '. Your exact delivery charge is calculated at checkout based on your area' + (delivery.pickupEnabled ? ' (pickup is free).' : '.') };
    }
    return { charge: 0, note: 'Pickup only — no delivery charge.' };
  }

  // ------------------------------------------------------------ UI: badge, toast
  function updateBadge() {
    var n = cart.count();
    $$('[data-cart-count]').forEach(function (el) {
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = n === 0;
      el.classList.remove('bump'); void el.offsetWidth; if (n) el.classList.add('bump');
    });
    var btn = $('[data-cart-open]');
    if (btn) btn.setAttribute('aria-label', 'Open cart, ' + n + ' item' + (n === 1 ? '' : 's'));
  }
  var toastTimer;
  function toast(html) {
    var t = $('[data-toast]');
    if (!t) return;
    t.innerHTML = html;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-visible'); setTimeout(function () { t.hidden = true; }, 300); }, 3800);
  }

  // ------------------------------------------------------------ cart line HTML
  function lineHtml(l) {
    if (l.missing) {
      return '<div class="cart-item"><div></div><div><div class="ci-top"><span class="ci-name">Item no longer on our menu</span>' +
        '<button class="ci-remove" type="button" data-remove="' + l.v + '" aria-label="Remove item">' + ICON_TRASH + '</button></div></div></div>';
    }
    var p = l.product, v = l.variant;
    return '<div class="cart-item">' +
      '<img src="' + esc(p.image) + '" alt="' + esc(p.imageAlt) + '" width="76" height="57" loading="lazy">' +
      '<div><div class="ci-top"><a class="ci-name" href="/products/' + esc(p.slug) + '">' + esc(p.name) + '</a>' +
      '<button class="ci-remove" type="button" data-remove="' + v.id + '" aria-label="Remove ' + esc(p.name) + ' from cart">' + ICON_TRASH + '</button></div>' +
      '<p class="ci-variant">' + (p.type === 'cake' ? 'Weight: ' : '') + esc(v.label) + '</p>' +
      (l.unavailable ? '<p class="ci-warning">Sorry, this is currently unavailable — please remove it.</p>' : '') +
      '<div class="ci-bottom"><div class="stepper sm" role="group" aria-label="Quantity for ' + esc(p.name) + '">' +
      '<button type="button" class="step-btn" data-qty-step="-1" data-variant="' + v.id + '" aria-label="Decrease quantity"' + (l.q <= 1 ? ' disabled' : '') + '>' + ICON_MINUS + '</button>' +
      '<input type="number" min="1" max="' + MAX_QTY + '" value="' + l.q + '" data-qty-input data-variant="' + v.id + '" aria-label="Quantity" inputmode="numeric">' +
      '<button type="button" class="step-btn" data-qty-step="1" data-variant="' + v.id + '" aria-label="Increase quantity"' + (l.q >= MAX_QTY ? ' disabled' : '') + '>' + ICON_PLUS + '</button></div>' +
      '<div class="ci-prices"><span class="ci-unit">' + money(v.price) + ' each</span><span class="ci-total">' + money(l.total) + '</span></div></div></div></div>';
  }
  var svg = function (d) { return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ICON_TRASH = svg('<path d="M4 7h16M9 7V4.8c0-.4.4-.8.8-.8h4.4c.4 0 .8.4.8.8V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>');
  var ICON_MINUS = svg('<path d="M5 12h14"/>');
  var ICON_PLUS = svg('<path d="M12 5v14M5 12h14"/>');
  var ICON_BAG = '<span class="highlight-icon">' + svg('<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>') + '</span>';

  function renderCartInto(listEl, ui) {
    if (!listEl) return;
    if (load().length === 0) {
      listEl.innerHTML = '<div class="cart-empty">' + ICON_BAG + '<h3>Your cart is empty</h3><p class="muted">Add some freshly baked treats to get started.</p><a class="btn btn-primary" href="/menu">Browse the menu</a></div>';
      if (ui.foot) ui.foot.hidden = true;
      return;
    }
    getCatalog().then(function (data) {
      var lines = resolveLines(data);
      listEl.innerHTML = lines.map(lineHtml).join('');
      var subtotal = lines.reduce(function (s, l) { return s + (l.total && !l.unavailable ? l.total : 0); }, 0);
      var est = deliveryEstimate(data.delivery);
      if (ui.subtotal) ui.subtotal.textContent = money(subtotal);
      if (ui.delivery) ui.delivery.textContent = est.charge ? money(est.charge) : 'PKR 0';
      if (ui.total) ui.total.textContent = money(subtotal + est.charge);
      if (ui.note) ui.note.textContent = est.note;
      if (ui.foot) ui.foot.hidden = false;
    }).catch(function () {
      listEl.innerHTML = '<div class="cart-empty"><h3>We couldn\'t load your cart</h3><p class="muted">Please check your internet connection and try again.</p><button class="btn btn-ghost" type="button" data-retry>Try again</button></div>';
    });
  }

  function renderDrawer() {
    renderCartInto($('[data-cart-items]'), { foot: $('[data-cart-foot]'), subtotal: $('[data-cart-subtotal]'), delivery: $('[data-cart-delivery]'), total: $('[data-cart-total]'), note: $('[data-cart-delivery-note]') });
  }
  function renderCartPage() {
    renderCartInto($('[data-cartpage-items]'), { foot: $('[data-cartpage-summary]'), subtotal: $('[data-cartpage-subtotal]'), delivery: $('[data-cartpage-delivery]'), total: $('[data-cartpage-total]'), note: $('[data-cartpage-delivery-note]') });
  }

  // cart line controls (drawer + cart page) — event delegation
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-remove],[data-qty-step],[data-retry]');
    if (!t) return;
    if (t.hasAttribute('data-retry')) { renderAll(); return; }
    if (t.hasAttribute('data-remove')) { cart.remove(t.getAttribute('data-remove')); return; }
    var id = Number(t.getAttribute('data-variant'));
    var item = load().find(function (i) { return i.v === id; });
    if (item) cart.set(id, item.q + Number(t.getAttribute('data-qty-step')));
  });
  document.addEventListener('change', function (e) {
    var t = e.target.closest('[data-qty-input]');
    if (!t) return;
    var q = Math.round(Number(t.value));
    if (!q || q < 1) q = 1;
    if (q > MAX_QTY) { q = MAX_QTY; toast('You can order up to ' + MAX_QTY + ' of each item online. For bigger orders, WhatsApp us!'); }
    cart.set(t.getAttribute('data-variant'), q);
  });

  function renderAll() {
    var drawer = $('[data-cart-drawer]');
    if (drawer && drawer.classList.contains('is-open')) renderDrawer();
    renderCartPage();
  }
  document.addEventListener('cart:change', renderAll);

  // ------------------------------------------------------------ drawer open/close
  var lastFocus = null;
  function openDrawer() {
    var d = $('[data-cart-drawer]'), b = $('[data-cart-backdrop]');
    if (!d) return;
    lastFocus = document.activeElement;
    renderDrawer();
    b.hidden = false; d.hidden = false;
    void d.offsetWidth;
    b.classList.add('is-open'); d.classList.add('is-open');
    document.body.classList.add('drawer-open');
    setTimeout(function () { d.focus(); }, 50);
  }
  function closeDrawer() {
    var d = $('[data-cart-drawer]'), b = $('[data-cart-backdrop]');
    if (!d || !d.classList.contains('is-open')) return;
    d.classList.remove('is-open'); b.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    setTimeout(function () { if (!d.classList.contains('is-open')) { b.hidden = true; d.hidden = true; } }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); openDrawer(); }
    else if (e.target.closest('[data-cart-close]') || e.target.closest('[data-cart-backdrop]')) closeDrawer();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); closeNav(); }
    if (e.key === 'Tab') {
      var d = $('[data-cart-drawer]');
      if (d && d.classList.contains('is-open')) {
        var f = $$('a[href],button:not([disabled]),input,select,textarea', d).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
  });

  // ------------------------------------------------------------ nav
  var navBtn = $('[data-nav-toggle]'), nav = $('#main-nav');
  function closeNav() {
    if (!navBtn || navBtn.getAttribute('aria-expanded') !== 'true') return;
    navBtn.setAttribute('aria-expanded', 'false'); navBtn.setAttribute('aria-label', 'Open menu');
    nav.classList.remove('is-open'); document.body.classList.remove('nav-open');
  }
  if (navBtn) {
    navBtn.addEventListener('click', function () {
      var open = navBtn.getAttribute('aria-expanded') !== 'true';
      navBtn.setAttribute('aria-expanded', String(open)); navBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      nav.classList.toggle('is-open', open); document.body.classList.toggle('nav-open', open);
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1000) closeNav(); });
  }
  var header = $('[data-header]');
  var onScroll = function () { if (header) header.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ------------------------------------------------------------ quick add (product cards)
  function addedToast(name, label) {
    toast('<span>Added <strong>' + esc(name) + '</strong> (' + esc(label) + ')</span><a href="/cart" data-cart-open>View cart</a>');
  }
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-quick-add]');
    if (!f) return;
    e.preventDefault();
    var sel = f.querySelector('select[name=variant]'), err = f.querySelector('[data-error]');
    var card = f.closest('[data-product]');
    if (!sel.value) {
      err.textContent = card && card.getAttribute('data-type') === 'cake' ? 'Please select a cake weight.' : 'Please select a box size.';
      err.hidden = false; sel.classList.add('is-invalid'); sel.focus();
      return;
    }
    err.hidden = true; sel.classList.remove('is-invalid');
    cart.add(sel.value, 1);
    var name = card ? card.querySelector('.pc-title a').textContent : 'Item';
    addedToast(name, sel.options[sel.selectedIndex].text.split(' — ')[0]);
    var btn = f.querySelector('button[type=submit]');
    btn.classList.add('is-added'); setTimeout(function () { btn.classList.remove('is-added'); }, 900);
  });
  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-quick-add] select');
    if (sel && sel.value) { sel.classList.remove('is-invalid'); var er = sel.form.querySelector('[data-error]'); if (er) er.hidden = true; }
  });

  // ------------------------------------------------------------ product page
  var pf = $('[data-product-form]');
  if (pf) {
    var pdata = JSON.parse($('#product-data').textContent);
    var priceEl = $('[data-pd-price]'), lineEl = $('[data-line-total]'), qtyEl = $('[data-qty]', pf), waEl = $('[data-pd-whatsapp]');
    var vErr = $('[data-variant-error]', pf), qErr = $('[data-qty-error]', pf), optSet = $('.option-set', pf);
    var selected = function () { var r = $('input[name=variant]:checked', pf); return r ? pdata.variants.find(function (v) { return String(v.id) === r.value; }) : null; };
    var qty = function () { return Math.max(1, Math.min(MAX_QTY, Math.round(Number(qtyEl.value)) || 1)); };
    var waNumber = (waEl.getAttribute('href').match(/wa\.me\/(\d+)/) || [])[1];
    var refresh = function () {
      var v = selected(), q = qty();
      if (v) {
        priceEl.textContent = money(v.price);
        lineEl.textContent = q > 1 ? q + ' × ' + money(v.price) + ' = ' + money(v.price * q) : '';
      }
      var msg = 'Hello Sohni Bakers,\n\nI would like to place an order.\n\nProduct: ' + pdata.name +
        (v ? '\n' + (pdata.type === 'cake' ? 'Cake Weight: ' : 'Size: ') + v.label : '') +
        '\nQuantity: ' + q + (v ? '\nTotal Amount: ' + money(v.price * q) : '') + '\n\nPlease confirm my order.';
      waEl.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(msg);
    };
    pf.addEventListener('change', function (e) {
      if (e.target.name === 'variant') { vErr.hidden = true; optSet.classList.remove('is-invalid'); }
      refresh();
    });
    qtyEl.addEventListener('input', function () { qErr.hidden = true; refresh(); });
    qtyEl.addEventListener('change', function () {
      var raw = Math.round(Number(qtyEl.value));
      if (!raw || raw < 1 || raw > MAX_QTY) { qErr.textContent = 'Please choose a quantity between 1 and ' + MAX_QTY + '.'; qErr.hidden = false; }
      qtyEl.value = qty(); refresh();
    });
    $$('[data-step]', pf).forEach(function (b) {
      b.addEventListener('click', function () { qtyEl.value = Math.max(1, Math.min(MAX_QTY, qty() + Number(b.getAttribute('data-step')))); qErr.hidden = true; refresh(); });
    });
    pf.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = selected();
      if (!v) { vErr.hidden = false; optSet.classList.add('is-invalid'); var first = $('input[name=variant]', pf); if (first) first.focus(); return; }
      cart.add(v.id, qty());
      if (e.submitter && e.submitter.getAttribute('data-action') === 'buy') { window.location.href = '/checkout'; return; }
      addedToast(pdata.name, v.label);
    });
    refresh();
  }

  // ------------------------------------------------------------ menu search & filter
  var search = $('[data-menu-search]');
  if (search) {
    var chips = $$('[data-chip]'), groups = $$('[data-group]'), countEl = $('[data-menu-count]'), empty = $('[data-menu-empty]');
    var activeCat = (chips.find(function (c) { return c.getAttribute('aria-pressed') === 'true'; }) || chips[0]).getAttribute('data-chip');
    var matchCat = function (card) {
      if (!activeCat) return true;
      if (activeCat === 'cakes') return card.getAttribute('data-type') === 'cake';
      return card.getAttribute('data-category') === activeCat;
    };
    var apply = function () {
      var q = search.value.trim().toLowerCase(), shown = 0;
      groups.forEach(function (g) {
        var any = 0;
        $$('[data-product]', g).forEach(function (card) {
          var ok = matchCat(card) && (!q || card.getAttribute('data-name').indexOf(q) !== -1);
          card.hidden = !ok; if (ok) any++;
        });
        g.hidden = any === 0; shown += any;
      });
      empty.hidden = shown !== 0;
      countEl.textContent = q || activeCat ? 'Showing ' + shown + ' product' + (shown === 1 ? '' : 's') + (q ? ' for "' + search.value.trim() + '"' : '') : '';
    };
    chips.forEach(function (c) {
      c.addEventListener('click', function (e) {
        e.preventDefault();
        activeCat = c.getAttribute('data-chip');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
        var url = new URL(window.location.href);
        if (activeCat) url.searchParams.set('category', activeCat); else url.searchParams.delete('category');
        history.replaceState(null, '', url.pathname + url.search + '#catalog');
        apply();
      });
    });
    var deb;
    search.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(apply, 120); });
    $('[data-menu-reset]').addEventListener('click', function () { search.value = ''; chips[0].click(); search.focus(); });
    apply();
  }

  // ------------------------------------------------------------ copy buttons
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (!b) return;
    var text = b.getAttribute('data-copy'), label = b.querySelector('span');
    var done = function () { b.classList.add('is-copied'); if (label) label.textContent = 'Copied'; setTimeout(function () { b.classList.remove('is-copied'); if (label) label.textContent = 'Copy'; }, 1800); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    else { fallbackCopy(text); done(); }
  });
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } document.body.removeChild(ta);
  }

  // ------------------------------------------------------------ reveal on scroll
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('reveal-pending'); io.observe(el); }
    });
  }

  updateBadge();
  renderCartPage();
  window.addEventListener('storage', function (e) { if (e.key === KEY) { updateBadge(); renderAll(); } });

  window.SB = { cart: cart, getCatalog: getCatalog, resolveLines: resolveLines, money: money, esc: esc, toast: toast };
})();
