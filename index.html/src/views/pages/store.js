'use strict';
/** Customer-facing pages. */
const { html, raw, jsonScript } = require('../html');
const { icon } = require('../components/icons');
const { Layout, PriceNotice, abs } = require('../components/layout');
const { ProductGrid } = require('../components/products');
const S = require('../components/sections');
const site = require('../../config/site');
const { pkr, formatPhone, formatDate, formatTime12, todayPK } = require('../../lib/validate');
const { waLink, orderMessage } = require('../../lib/whatsapp');
const { categories, categoryName } = require('../../lib/catalog');
const { statusLabel, paymentStatusLabel, paymentMethod } = require('../../lib/orders');

const CATEGORY_ART = {
  cakes: '/images/products/fresh-vanilla-cake.svg',
  signature: '/images/products/three-milk-pistachio-cake.svg',
  'dry-cakes': '/images/products/tutty-fruity-dry-cake.svg',
  brownies: '/images/products/triple-chocolate-brownie.svg',
  donuts: '/images/products/donuts.svg',
};
// "Cakes" in the menu covers every cake (cream, signature and dry cakes).
const nearLandmark = (l) => (/^near\b/i.test(l) ? l : `Near ${l}`);
const inFilter = (p, cat) => !cat || (cat === 'cakes' ? p.type === 'cake' : p.category === cat);

// ---------------------------------------------------------------- Home
function homePage({ products, reviews }) {
  const best = products.filter((p) => p.featured).slice(0, 6);
  const fav = products.filter((p) => p.favorite).slice(0, 6);
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: S.FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const body = html`
${S.Hero()}
${S.Highlights()}
<section class="section categories" aria-labelledby="cat-title">
  <div class="container">
    ${S.SectionHead('Our menu', 'Something sweet for everyone', 'Fresh cream cakes, signature creations, tea-time cakes, brownies and donuts.', 'cat-title')}
    <div class="category-grid">
      ${categories.map((c) => html`<a class="category-tile reveal" href="/menu?category=${c.id}"><img src="${CATEGORY_ART[c.id]}" alt="" width="800" height="600" loading="lazy"><span class="ct-body"><strong>${c.name}</strong><span>${c.blurb}</span></span></a>`)}
    </div>
  </div>
</section>
${best.length ? html`
<section class="section bestsellers" aria-labelledby="best-title">
  <div class="container">
    ${S.SectionHead('Best sellers', 'Our Best Sellers', 'A few of our most-loved bakes — the perfect place to start.', 'best-title')}
    ${ProductGrid(best, { compact: true })}
    <div class="center"><a class="btn btn-outline" href="/menu">See the full menu ${icon('arrowRight', { size: 18 })}</a></div>
  </div>
</section>` : ''}
${S.FreshlyMade()}
${fav.length ? html`
<section class="section favorites" aria-labelledby="fav-title">
  <div class="container">
    ${S.SectionHead('Customer favourites', 'Customer Favorites', 'Treats our customers keep coming back for.', 'fav-title')}
    ${ProductGrid(fav, { compact: true })}
  </div>
</section>` : ''}
${S.Occasions()}
${S.Reviews(reviews)}
${S.About()}
${S.FAQ()}
${S.Contact()}`;
  return Layout({ path: '/', active: 'home', body, jsonLd: [faqLd], bodyClass: 'page-home' });
}

// ---------------------------------------------------------------- Menu
function menuPage({ products, category, q }) {
  const cat = categories.some((c) => c.id === category) ? category : '';
  const sections = categories
    .map((c) => ({ c, items: products.filter((p) => p.category === c.id && (!cat || inFilter(p, cat))) }))
    .filter((s) => s.items.length);
  const title = cat ? categoryName(cat) : 'Our Menu';
  const chips = [['', 'All'], ...categories.map((c) => [c.id, c.name])];
  const body = html`
<section class="page-hero">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Menu</span></nav>
    <h1>${cat ? html`${title}` : html`Our <em>Menu</em>`}</h1>
    <p class="section-sub">All ${products.length} of our homemade treats. Cakes are sold by weight in pounds (lb).</p>
  </div>
</section>
<section class="section menu-section" id="catalog">
  <div class="container">
    ${PriceNotice()}
    <div class="menu-toolbar" role="search">
      <label class="search-field">
        <span class="sr-only">Search products by name</span>
        ${icon('search', { size: 18 })}
        <input type="search" name="q" value="${q || ''}" placeholder="Search cakes, brownies, donuts…" autocomplete="off" data-menu-search>
      </label>
      <div class="chips" role="group" aria-label="Filter by category" data-menu-chips>
        ${chips.map(([id, name]) => html`<a class="chip" href="/menu${id ? '?category=' + id : ''}#catalog" data-chip="${id}" aria-pressed="${cat === id ? 'true' : 'false'}">${name}</a>`)}
      </div>
    </div>
    <p class="result-count muted" data-menu-count aria-live="polite"></p>
    ${categories.map((c) => {
      const items = products.filter((p) => p.category === c.id);
      const visible = !cat || items.some((p) => inFilter(p, cat));
      return html`
    <div class="menu-group" data-group="${c.id}" ${visible ? '' : raw('hidden')}>
      <div class="menu-group-head"><h2>${c.name}</h2><p>${c.blurb}</p></div>
      ${ProductGrid(items, { eager: c.id === (sections[0] && sections[0].c.id) })}
    </div>`;
    })}
    <div class="empty-state" data-menu-empty hidden>
      <span class="highlight-icon">${icon('search', { size: 24 })}</span>
      <h2>No treats found</h2>
      <p>We couldn't find anything matching your search. Try another name, or ask us on WhatsApp — we love custom orders!</p>
      <button class="btn btn-ghost" type="button" data-menu-reset>Show all products</button>
    </div>
  </div>
</section>`;
  return Layout({
    title: cat ? `${title} — Homemade ${title} in Punjab` : 'Menu — Cakes, Brownies & Donuts',
    description: cat ? `Order fresh homemade ${title.toLowerCase()} from Sohni Bakers in Punjab, Pakistan.` : undefined,
    path: cat ? `/menu?category=${cat}` : '/menu',
    active: cat || 'menu',
    body,
  });
}

// ---------------------------------------------------------------- Product
function productPage({ product: p, related }) {
  const isCake = p.type === 'cake';
  const live = p.variants.filter((v) => v.available);
  const prices = live.map((v) => v.price);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: abs(p.image),
    brand: { '@type': 'Brand', name: 'Sohni Bakers' },
    category: categoryName(p.category),
    url: abs(`/products/${p.slug}`),
    ...(prices.length ? { offers: { '@type': 'AggregateOffer', priceCurrency: 'PKR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability: p.orderable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } } : {}),
  };
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['Home', '/'], ['Menu', '/menu'], [p.name, `/products/${p.slug}`]].map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: abs(u) })) };
  const pageData = { id: p.id, slug: p.slug, name: p.name, type: p.type, image: p.image, variants: live.map((v) => ({ id: v.id, label: v.label, price: v.price, weightLbs: v.weight_lbs })) };
  const body = html`
<section class="section product-detail">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/menu">Menu</a><span aria-hidden="true">/</span><a href="/menu?category=${p.category}">${categoryName(p.category)}</a><span aria-hidden="true">/</span><span aria-current="page">${p.name}</span></nav>
    <div class="pd-grid">
      <div class="pd-media">
        <img src="${p.image}" alt="${p.image_alt}" width="800" height="600" fetchpriority="high">
        ${p.featured ? html`<span class="badge">Best Seller</span>` : ''}
      </div>
      <div class="pd-info">
        <p class="eyebrow">${categoryName(p.category)}</p>
        <h1>${p.name}</h1>
        <p class="pd-short">${p.short_description}</p>
        <p class="pd-price" aria-live="polite"><span data-pd-price>${p.fromPrice !== null ? html`<small>From</small> ${pkr(p.fromPrice)}` : 'Price on request'}</span></p>
        ${PriceNotice()}
        ${p.orderable ? html`
        <form class="pd-form" data-product-form novalidate>
          <script type="application/json" id="product-data">${jsonScript(pageData)}</script>
          <fieldset class="option-set">
            <legend>${isCake ? 'Select Cake Weight' : 'Select Box Size'}</legend>
            <div class="option-grid">
              ${live.map((v) => html`<label class="option-card"><input type="radio" name="variant" value="${v.id}" data-price="${v.price}" data-label="${v.label}"><span class="oc-label">${v.label}</span><span class="oc-price">${pkr(v.price)}</span></label>`)}
            </div>
            <p class="field-error" data-variant-error hidden>${isCake ? 'Please select a cake weight.' : 'Please select a box size.'}</p>
          </fieldset>
          <div class="qty-row">
            <span class="qty-label" id="qty-label">Quantity</span>
            <div class="stepper" role="group" aria-labelledby="qty-label">
              <button type="button" class="step-btn" data-step="-1" aria-label="Decrease quantity">${icon('minus', { size: 18 })}</button>
              <input type="number" name="qty" value="1" min="1" max="${site.orders.maxQuantityPerItem}" inputmode="numeric" aria-label="Quantity" data-qty>
              <button type="button" class="step-btn" data-step="1" aria-label="Increase quantity">${icon('plus', { size: 18 })}</button>
            </div>
            <p class="pd-line-total muted" data-line-total></p>
          </div>
          <p class="field-error" data-qty-error hidden></p>
          <div class="pd-actions">
            <button class="btn btn-primary btn-lg" type="submit" data-action="add">${icon('bag', { size: 18 })} Add to Cart</button>
            <button class="btn btn-caramel btn-lg" type="submit" data-action="buy">Buy Now</button>
          </div>
          <a class="btn btn-whatsapp btn-block btn-lg" data-pd-whatsapp href="${waLink(`Hello Sohni Bakers, I would like to order: ${p.name}`)}" target="_blank" rel="noopener">${icon('whatsapp')} Order on WhatsApp</a>
        </form>` : html`
        <div class="unavailable-box" role="status">
          <strong>Currently unavailable</strong>
          <p>This item can't be ordered online right now. Message us on WhatsApp and we'll let you know when it's back.</p>
          <a class="btn btn-whatsapp" href="${waLink(`Hello Sohni Bakers, is ${p.name} available?`)}" target="_blank" rel="noopener">${icon('whatsapp')} Ask on WhatsApp</a>
        </div>`}
        <div class="pd-details">
          <h2>About this ${isCake ? 'cake' : p.type}</h2>
          <p>${p.description}</p>
          <h3>Good to know</h3>
          <ul class="info-list">
            <li><strong>Ingredients:</strong> ${p.ingredients ? p.ingredients : 'Ingredient details are available on request — just ask us on WhatsApp.'}</li>
            <li><strong>${isCake ? 'Weights' : 'Box sizes'}:</strong> ${live.map((v) => v.label).join(', ') || '—'}${isCake ? ' (weight in pounds)' : ''}</li>
            ${isCake ? html`<li><strong>Personal message:</strong> Add a message like "Happy Birthday Ali" in the order notes at checkout.</li>` : ''}
            <li><strong>Allergies:</strong> Please tell us about any allergies in your order notes before ordering.</li>
            <li><strong>Freshness:</strong> Prepared fresh for your order.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>
${related.length ? html`
<section class="section related" aria-labelledby="related-title">
  <div class="container">
    <div class="section-head"><p class="eyebrow">You may also like</p><h2 id="related-title">More from ${categoryName(p.category)}</h2></div>
    ${ProductGrid(related, { headingLevel: 3 })}
  </div>
</section>` : ''}`;
  return Layout({
    title: `${p.name} — Order Online`,
    description: `${p.short_description} Order ${p.name} from Sohni Bakers, homemade bakery in Punjab, Pakistan.`,
    path: `/products/${p.slug}`,
    active: 'menu',
    ogImage: p.image.endsWith('.svg') ? undefined : p.image,
    jsonLd: [ld, crumbs],
    body,
  });
}

// ---------------------------------------------------------------- Cart
function cartPage() {
  const body = html`
<section class="page-hero slim"><div class="container"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Cart</span></nav><h1>Your <em>Cart</em></h1></div></section>
<section class="section cart-page">
  <div class="container cart-layout">
    <div class="cart-list card" data-cartpage-items aria-live="polite"><p class="muted center pad">Loading your cart…</p></div>
    <aside class="card summary-card" data-cartpage-summary hidden>
      <h2>Order Summary</h2>
      <dl class="totals">
        <div><dt>Subtotal</dt><dd data-cartpage-subtotal>—</dd></div>
        <div><dt>Delivery Charges</dt><dd data-cartpage-delivery>—</dd></div>
        <div class="grand"><dt>Grand Total</dt><dd data-cartpage-total>—</dd></div>
      </dl>
      <p class="tiny muted" data-cartpage-delivery-note></p>
      ${PriceNotice()}
      <a class="btn btn-primary btn-block btn-lg" href="/checkout">Proceed to Checkout ${icon('arrowRight', { size: 18 })}</a>
      <a class="btn btn-ghost btn-block" href="/menu">Continue shopping</a>
    </aside>
  </div>
</section>`;
  return Layout({ title: 'Your Cart', path: '/cart', body, noindex: true });
}

// ---------------------------------------------------------------- Checkout
function paymentDetails(m) {
  return html`
<dl class="account-details">
  <div><dt>Account Title</dt><dd>${m.accountTitle}</dd></div>
  ${m.bankName ? html`<div><dt>Bank Name</dt><dd>${m.bankName}</dd></div>` : ''}
  <div><dt>Account Number</dt><dd><span class="acct-no">${m.accountNumber}</span>
    <button type="button" class="copy-btn" data-copy="${m.accountNumber.replace(/\s/g, '')}" aria-label="Copy ${m.name} account number">${icon('copy', { size: 15 })}<span>Copy</span></button></dd></div>
</dl>`;
}

function checkoutPage({ delivery }) {
  const anyFulfillment = delivery.homeDeliveryEnabled || delivery.pickupEnabled;
  const defaultFulfillment = delivery.homeDeliveryEnabled ? 'delivery' : 'pickup';
  const data = { delivery, payments: site.payments.map((p) => ({ id: p.id, name: p.name, requireTransactionId: p.requireTransactionId, requireScreenshot: p.requireScreenshot })), maxProofBytes: site.uploads.maxPaymentProofBytes, today: todayPK(), maxQty: site.orders.maxQuantityPerItem };
  const body = html`
<section class="page-hero slim"><div class="container"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/cart">Cart</a><span aria-hidden="true">/</span><span aria-current="page">Checkout</span></nav><h1><em>Checkout</em></h1>
<ol class="progress" aria-label="Checkout steps"><li class="is-active">Details</li><li class="is-active">Delivery</li><li class="is-active">Payment</li><li>Confirmation</li></ol></div></section>
<section class="section checkout-page">
  <div class="container">
    <noscript><div class="alert alert-error">Checkout needs JavaScript. Please enable it, or order directly on WhatsApp: ${site.contact.phoneDisplay}.</div></noscript>
    <div class="alert alert-error" data-checkout-error role="alert" tabindex="-1" hidden></div>
    <div class="empty-state card" data-checkout-empty hidden>
      <span class="highlight-icon">${icon('bag', { size: 24 })}</span>
      <h2>Your cart is empty</h2>
      <p>Add something delicious to your cart before checking out.</p>
      <a class="btn btn-primary" href="/menu">Browse the menu</a>
    </div>
    <form class="checkout-layout" data-checkout-form novalidate hidden>
      <script type="application/json" id="checkout-data">${jsonScript(data)}</script>
      <div class="checkout-main">

        <fieldset class="card form-card">
          <legend><span class="step-no">1</span> Customer Information</legend>
          <div class="form-grid">
            <div class="field span-2"><label for="f-name">Full Name <span class="req" aria-hidden="true">*</span></label>
              <input id="f-name" name="name" autocomplete="name" required maxlength="80" aria-describedby="e-name"><p class="field-error" id="e-name" hidden></p></div>
            <div class="field"><label for="f-phone">Mobile Number <span class="req" aria-hidden="true">*</span></label>
              <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="03XX XXXXXXX" required maxlength="16" aria-describedby="e-phone"><p class="field-error" id="e-phone" hidden></p></div>
            <div class="field"><label for="f-whatsapp">WhatsApp Number</label>
              <input id="f-whatsapp" name="whatsapp" type="tel" inputmode="tel" placeholder="Same as mobile" maxlength="16" aria-describedby="h-whatsapp e-whatsapp"><p class="hint" id="h-whatsapp">Leave empty if it's the same as your mobile number.</p><p class="field-error" id="e-whatsapp" hidden></p></div>
            <div class="field span-2"><label for="f-email">Email Address <span class="optional">(optional)</span></label>
              <input id="f-email" name="email" type="email" autocomplete="email" maxlength="200" aria-describedby="e-email"><p class="field-error" id="e-email" hidden></p></div>
          </div>
        </fieldset>

        <fieldset class="card form-card">
          <legend><span class="step-no">2</span> Delivery Information</legend>
          ${anyFulfillment ? '' : html`<div class="alert alert-error">Online orders are paused right now. Please contact us on WhatsApp.</div>`}
          <div class="choice-grid" role="radiogroup" aria-label="Delivery or pickup">
            ${delivery.homeDeliveryEnabled ? html`<label class="choice-card"><input type="radio" name="fulfillment" value="delivery" ${defaultFulfillment === 'delivery' ? raw('checked') : ''}><span class="cc-icon">${icon('truck', { size: 22 })}</span><span><strong>Home Delivery</strong><small>Delivered to your address</small></span></label>` : ''}
            ${delivery.pickupEnabled ? html`<label class="choice-card"><input type="radio" name="fulfillment" value="pickup" ${defaultFulfillment === 'pickup' ? raw('checked') : ''}><span class="cc-icon">${icon('bag', { size: 22 })}</span><span><strong>Pickup</strong><small>Collect your order yourself</small></span></label>` : ''}
          </div>
          <p class="field-error" id="e-fulfillment" hidden></p>
          <div class="form-grid" data-delivery-fields>
            <div class="field span-2"><label for="f-areaId">Delivery Area <span class="req" aria-hidden="true">*</span></label>
              <select id="f-areaId" name="areaId" class="select" aria-describedby="e-areaId">
                <option value="">Select your delivery area</option>
                ${delivery.areas.filter((a) => a.active).map((a) => html`<option value="${a.id}">${a.name} — ${pkr(a.charge)}</option>`)}
              </select><p class="field-error" id="e-areaId" hidden></p></div>
            <div class="field span-2"><label for="f-address">Complete Delivery Address <span class="req" aria-hidden="true">*</span></label>
              <textarea id="f-address" name="address" rows="2" autocomplete="street-address" placeholder="House no, street, block / phase, colony" maxlength="300" aria-describedby="e-address"></textarea><p class="field-error" id="e-address" hidden></p></div>
            <div class="field"><label for="f-area">Area / Mohalla / Sector</label>
              <input id="f-area" name="area" maxlength="80" placeholder="e.g. Model Town"></div>
            <div class="field"><label for="f-city">City <span class="req" aria-hidden="true">*</span></label>
              <input id="f-city" name="city" autocomplete="address-level2" maxlength="60" aria-describedby="e-city"><p class="field-error" id="e-city" hidden></p></div>
            <div class="field"><label for="f-province">Province</label>
              <input id="f-province" name="province" value="${site.brand.province}" readonly></div>
            <div class="field"><label for="f-landmark">Nearest Landmark</label>
              <input id="f-landmark" name="landmark" maxlength="120" placeholder="e.g. near Jamia Masjid"></div>
          </div>
          <div class="pickup-note" data-pickup-fields hidden>${icon('info', { size: 18 })}<p>${delivery.pickupNote}</p></div>
          <div class="form-grid">
            <div class="field"><label for="f-date"><span data-date-label>Delivery Date</span> <span class="req" aria-hidden="true">*</span></label>
              <input id="f-date" name="date" type="date" min="${todayPK()}" required aria-describedby="h-date e-date"><p class="hint" id="h-date">Subject to availability — we'll confirm on WhatsApp.</p><p class="field-error" id="e-date" hidden></p></div>
            <div class="field"><label for="f-time">Preferred <span data-time-label>Delivery</span> Time <span class="req" aria-hidden="true">*</span></label>
              <input id="f-time" name="time" type="time" required aria-describedby="e-time"><p class="field-error" id="e-time" hidden></p></div>
            <div class="field span-2"><label for="f-notes">Order Notes / Special Instructions</label>
              <textarea id="f-notes" name="notes" rows="3" maxlength="500" placeholder='e.g. "Write Happy Birthday Ali on cake", "Less cream", "Add candles", "Deliver after 6 PM"'></textarea></div>
          </div>
        </fieldset>

        <fieldset class="card form-card">
          <legend><span class="step-no">3</span> Payment</legend>
          <p class="muted small">All payments are made by manual transfer. Choose a method, send the amount, then upload your payment screenshot. Our team verifies every payment before confirming your order.</p>
          <div class="choice-grid three" role="radiogroup" aria-label="Payment method">
            ${site.payments.map((m) => html`<label class="choice-card pay-${m.id}"><input type="radio" name="paymentMethod" value="${m.id}"><span class="pay-logo">${m.name}</span><span><strong>${m.name}</strong><small>${m.id === 'bank' ? 'IBFT / bank app' : 'Mobile wallet'}</small></span></label>`)}
          </div>
          <p class="field-error" id="e-paymentMethod" hidden></p>
          ${site.payments.map((m) => html`
          <div class="payment-panel" data-payment-panel="${m.id}" hidden>
            <h3>Pay with ${m.name}</h3>
            <p class="pay-amount">Payment Amount: <strong data-pay-amount>—</strong></p>
            ${paymentDetails(m)}
            <ol class="pay-steps">${m.steps.map((s) => html`<li>${s}</li>`)}</ol>
          </div>`)}
          <div class="form-grid" data-proof-fields hidden>
            <div class="field span-2"><label for="f-transactionId">Transaction ID / Reference Number <span class="req" aria-hidden="true">*</span></label>
              <input id="f-transactionId" name="transactionId" maxlength="60" autocomplete="off" placeholder="e.g. 0123456789" aria-describedby="e-transactionId"><p class="field-error" id="e-transactionId" hidden></p></div>
            <div class="field span-2">
              <span class="label" id="l-screenshot">Upload Payment Screenshot <span class="req" aria-hidden="true">*</span></span>
              <label class="upload-box" for="f-screenshot" data-upload-box>
                <input id="f-screenshot" name="screenshot" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-describedby="l-screenshot h-screenshot e-screenshot">
                <span class="upload-empty">${icon('upload', { size: 26 })}<strong>Tap to upload screenshot</strong><small id="h-screenshot">JPG, PNG, WEBP or PDF — up to ${Math.round(site.uploads.maxPaymentProofBytes / 1048576)} MB</small></span>
                <span class="upload-preview" data-upload-preview hidden></span>
              </label>
              <p class="field-error" id="e-screenshot" hidden></p>
            </div>
            <div class="field span-2">
              <label class="check"><input type="checkbox" name="confirmPaid" aria-describedby="e-confirmPaid"><span>I confirm I have sent <strong data-pay-amount>the payment</strong> and my payment proof is attached.</span></label>
              <p class="field-error" id="e-confirmPaid" hidden></p>
            </div>
          </div>
        </fieldset>
      </div>

      <aside class="checkout-side">
        <div class="card summary-card">
          <h2>Order Summary</h2>
          <ul class="summary-items" data-summary-items></ul>
          <dl class="totals">
            <div><dt>Subtotal</dt><dd data-sum-subtotal>—</dd></div>
            <div><dt>Delivery Charges</dt><dd data-sum-delivery>—</dd></div>
            <div class="grand"><dt>Grand Total</dt><dd data-sum-total>—</dd></div>
          </dl>
          ${PriceNotice()}
          <p class="field-error" id="e-cart" hidden></p>
          <button class="btn btn-primary btn-block btn-lg" type="submit" data-place-order>${icon('check', { size: 18 })} Confirm Payment Submitted &amp; Place Order</button>
          <p class="tiny muted center">Your order will be marked <strong>Payment Verification Pending</strong> until our team verifies your payment.</p>
          <a class="btn btn-ghost btn-block" href="/cart">${icon('arrowLeft', { size: 16 })} Back to cart</a>
        </div>
      </aside>
    </form>
  </div>
</section>`;
  return Layout({ title: 'Checkout', path: '/checkout', body, noindex: true, bodyClass: 'page-checkout', scripts: ['/js/checkout.js'] });
}

// ---------------------------------------------------------------- Order confirmation
function orderPage({ order, justPlaced }) {
  const m = paymentMethod(order.payment && order.payment.method) || { name: order.payment ? order.payment.method : '—' };
  const isPickup = order.fulfillment === 'pickup';
  const address = isPickup ? 'Pickup — details will be shared on WhatsApp' : [order.address, order.area, order.city, order.province].filter(Boolean).join(', ');
  const pStatus = order.payment ? order.payment.status : 'pending_verification';
  const steps = [
    ['Order placed', true],
    ['Payment verification', pStatus === 'verified'],
    ['Preparing', ['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(order.order_status)],
    [isPickup ? 'Ready for pickup' : 'Out for delivery', ['ready', 'out_for_delivery', 'delivered'].includes(order.order_status) && (isPickup || order.order_status !== 'ready')],
    [isPickup ? 'Collected' : 'Delivered', order.order_status === 'delivered'],
  ];
  const body = html`
<section class="section order-confirm">
  <div class="container narrow">
    <div class="confirm-hero card">
      <span class="confirm-icon">${icon('check', { size: 34 })}</span>
      <h1>${justPlaced ? html`Thank You for Your Order! <span aria-hidden="true">🎂</span>` : 'Your Order'}</h1>
      <p>${justPlaced ? 'Your order has been successfully submitted to Sohni Bakers.' : 'Here are the latest details of your Sohni Bakers order.'}</p>
      <p class="order-no">Order Number <strong>${order.order_number}</strong></p>
      <div class="status-row">
        <span class="pill pill-${order.order_status}">${statusLabel(order.order_status)}</span>
        <span class="pill pill-pay-${pStatus}">Payment: ${paymentStatusLabel(pStatus)}</span>
      </div>
      ${order.order_status === 'cancelled' ? '' : html`<ol class="tracker">${steps.map(([label, done]) => html`<li class="${done ? 'done' : ''}"><span></span>${label}</li>`)}</ol>`}
      <p class="small muted">Please save this page — bookmark it or keep the link — to check your order later.</p>
      <div class="confirm-ctas">
        <a class="btn btn-whatsapp btn-lg" href="${waLink(orderMessage(order, m.name))}" target="_blank" rel="noopener">${icon('whatsapp')} Send order on WhatsApp</a>
        <a class="btn btn-outline btn-lg" href="tel:${site.contact.phoneHref}">${icon('phone', { size: 18 })} Call ${site.contact.phoneDisplay}</a>
      </div>
    </div>

    <div class="card detail-card">
      <h2>Order Details</h2>
      <dl class="detail-list">
        <div><dt>Customer Name</dt><dd>${order.customer_name}</dd></div>
        <div><dt>Mobile</dt><dd>${formatPhone(order.phone)}</dd></div>
        ${order.whatsapp && order.whatsapp !== order.phone ? html`<div><dt>WhatsApp</dt><dd>${formatPhone(order.whatsapp)}</dd></div>` : ''}
        <div><dt>${isPickup ? 'Pickup' : 'Delivery Address'}</dt><dd>${address}${!isPickup && order.landmark ? html`<br><small>${nearLandmark(order.landmark)}</small>` : ''}</dd></div>
        ${!isPickup ? html`<div><dt>Delivery Area</dt><dd>${order.delivery_area_name}</dd></div>` : ''}
        <div><dt>${isPickup ? 'Pickup' : 'Delivery'} Date</dt><dd>${formatDate(order.delivery_date)}</dd></div>
        <div><dt>${isPickup ? 'Pickup' : 'Delivery'} Time</dt><dd>${formatTime12(order.delivery_time)}</dd></div>
        ${order.notes ? html`<div><dt>Order Notes</dt><dd class="pre">${order.notes}</dd></div>` : ''}
      </dl>
      <h3>Order Items</h3>
      <ul class="order-items">
        ${order.items.map((i) => html`<li><img src="${i.product_image}" alt="" width="64" height="48" loading="lazy"><div><strong>${i.product_name}</strong><span>${i.weight_lbs ? 'Cake Weight: ' : ''}${i.variant_label} · ${i.quantity} × ${pkr(i.unit_price)}</span></div><b>${pkr(i.line_total)}</b></li>`)}
      </ul>
      <dl class="totals">
        <div><dt>Subtotal</dt><dd>${pkr(order.subtotal)}</dd></div>
        <div><dt>Delivery Charges</dt><dd>${isPickup ? 'Pickup — PKR 0' : pkr(order.delivery_charge)}</dd></div>
        <div class="grand"><dt>Total</dt><dd>${pkr(order.grand_total)}</dd></div>
      </dl>
    </div>

    <div class="card detail-card">
      <h2>Payment</h2>
      <dl class="detail-list">
        <div><dt>Payment Method</dt><dd>${m.name}</dd></div>
        <div><dt>Payment Status</dt><dd><span class="pill pill-pay-${pStatus}">${paymentStatusLabel(pStatus)}</span></dd></div>
        ${order.payment && order.payment.transaction_id ? html`<div><dt>Transaction ID</dt><dd>${order.payment.transaction_id}</dd></div>` : ''}
        <div><dt>Amount</dt><dd>${pkr(order.grand_total)}</dd></div>
      </dl>
      ${m.accountNumber ? html`<div class="paid-to"><h3>Paid to</h3>${paymentDetails(m)}</div>` : ''}
      <p class="small muted">${pStatus === 'verified' ? 'Thank you — your payment has been verified.' : pStatus === 'rejected' ? 'We could not verify your payment. Please contact us on WhatsApp so we can help.' : 'We will verify your payment manually and confirm your order on WhatsApp. Manual payments are not marked as paid until our team checks them.'}</p>
    </div>
    <div class="center"><a class="btn btn-ghost" href="/menu">${icon('arrowLeft', { size: 16 })} Back to the menu</a></div>
  </div>
</section>`;
  return Layout({ title: `Order ${order.order_number}`, body, noindex: true });
}

// ---------------------------------------------------------------- Errors
function errorPage(status, title, message) {
  const body = html`
<section class="section error-page"><div class="container narrow center">
  <p class="error-code">${status}</p>
  <h1>${title}</h1>
  <p class="section-sub">${message}</p>
  <div class="hero-ctas center-row"><a class="btn btn-primary" href="/menu">Browse the menu</a><a class="btn btn-whatsapp" href="${waLink('Hello Sohni Bakers, I need some help with the website.')}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp us</a></div>
</div></section>`;
  return Layout({ title, body, noindex: true });
}

module.exports = { homePage, menuPage, productPage, cartPage, checkoutPage, orderPage, errorPage, inFilter };
