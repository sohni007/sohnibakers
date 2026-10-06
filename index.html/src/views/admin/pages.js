'use strict';
/** Admin dashboard views (server-rendered, work without JavaScript). */
const { html, raw } = require('../html');
const { icon } = require('../components/icons');
const { ASSET_V } = require('../components/layout');
const { pkr, formatPhone, formatDate, formatTime12, formatDateTime } = require('../../lib/validate');
const { ORDER_STATUSES, PAYMENT_STATUSES, statusLabel, paymentStatusLabel, paymentMethod } = require('../../lib/orders');
const { categories, categoryName } = require('../../lib/catalog');
const site = require('../../config/site');
const { waLink } = require('../../lib/whatsapp');

const csrfField = (t) => html`<input type="hidden" name="_csrf" value="${t}">`;
const sel = (a, b) => (String(a) === String(b) ? raw('selected') : '');
const chk = (v) => (v ? raw('checked') : '');

function AdminLayout({ title, admin, active, body, flash }) {
  const nav = [
    ['orders', '/admin', 'list', 'Orders'],
    ['products', '/admin/products', 'box', 'Products'],
    ['settings', '/admin/settings', 'settings', 'Delivery & Settings'],
  ];
  return '<!doctype html>' + html`
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Sohni Bakers Admin</title><meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/styles.css?v=${ASSET_V}"><link rel="stylesheet" href="/css/admin.css?v=${ASSET_V}"></head>
<body class="admin">
${admin ? html`
<header class="admin-header">
  <a class="logo" href="/admin"><span class="logo-mark" aria-hidden="true">${icon('cake', { size: 20 })}</span><span class="logo-text">Sohni <em>Bakers</em> <small>Admin</small></span></a>
  <nav aria-label="Admin">${nav.map(([k, href, ic, label]) => html`<a href="${href}" ${active === k ? raw('aria-current="page"') : ''}>${icon(ic, { size: 18 })}<span>${label}</span></a>`)}</nav>
  <div class="admin-user"><a href="/" target="_blank" rel="noopener">${icon('external', { size: 16 })} View site</a>
    <form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${admin.csrf}"><button class="link-btn" type="submit">${icon('logout', { size: 16 })} Log out</button></form></div>
</header>` : ''}
<main class="admin-main" id="main">
${flash ? html`<div class="alert ${flash.type === 'error' ? 'alert-error' : 'alert-success'}" role="status">${flash.message}</div>` : ''}
${body}
</main>
<script src="/js/admin.js?v=${ASSET_V}" defer></script>
</body></html>`;
}

function loginPage({ error, email }) {
  return AdminLayout({
    title: 'Log in',
    body: html`
<div class="login-card card">
  <a class="logo" href="/"><span class="logo-mark" aria-hidden="true">${icon('cake', { size: 22 })}</span><span class="logo-text">Sohni <em>Bakers</em></span></a>
  <h1>Admin Login</h1>
  ${error ? html`<div class="alert alert-error" role="alert">${error}</div>` : ''}
  <form method="post" action="/admin/login" class="stack">
    <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required value="${email || ''}"></div>
    <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn btn-primary btn-block" type="submit">Log in</button>
  </form>
</div>`,
  });
}

function noAdminPage() {
  return AdminLayout({
    title: 'Set up admin',
    body: html`<div class="login-card card"><h1>Create your admin account</h1>
<p>No admin account exists yet. On the server, run:</p><pre><code>npm run admin:create</code></pre>
<p class="muted small">Or set <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> in your <code>.env</code> file and restart. Credentials are never stored in the website code.</p></div>`,
  });
}

function statusPill(id) {
  return html`<span class="pill pill-${id}">${statusLabel(id)}</span>`;
}
function payPill(id) {
  return html`<span class="pill pill-pay-${id}">${paymentStatusLabel(id)}</span>`;
}

function dashboardPage({ admin, stats, result, filters, page, pageSize, flash }) {
  const pages = Math.max(1, Math.ceil(result.total / pageSize));
  const qs = (p) => '?' + new URLSearchParams({ ...filters, page: p }).toString();
  return AdminLayout({
    title: 'Orders', admin, active: 'orders', flash,
    body: html`
<div class="admin-head"><h1>Orders</h1></div>
<div class="stat-grid">
  <a class="stat card" href="/admin?payment=pending_verification"><span>Payments to verify</span><strong>${stats.pendingPayments}</strong></a>
  <a class="stat card" href="/admin?status=preparing"><span>Active orders</span><strong>${stats.active}</strong></a>
  <div class="stat card"><span>Due today</span><strong>${stats.dueToday}</strong></div>
  <div class="stat card"><span>All orders</span><strong>${stats.total}</strong></div>
</div>
<form class="card filter-bar" method="get" action="/admin">
  <div class="field grow"><label for="q">Search</label><input id="q" name="q" value="${filters.q}" placeholder="Order no, name, phone or transaction ID"></div>
  <div class="field"><label for="status">Order status</label><select id="status" name="status" class="select"><option value="">All</option>${ORDER_STATUSES.map((s) => html`<option value="${s.id}" ${sel(s.id, filters.status)}>${s.label}</option>`)}</select></div>
  <div class="field"><label for="payment">Payment</label><select id="payment" name="payment" class="select"><option value="">All</option>${PAYMENT_STATUSES.map((s) => html`<option value="${s.id}" ${sel(s.id, filters.payment)}>${s.label}</option>`)}</select></div>
  <div class="field"><label for="from">Delivery from</label><input id="from" name="from" type="date" value="${filters.from}"></div>
  <div class="field"><label for="to">to</label><input id="to" name="to" type="date" value="${filters.to}"></div>
  <div class="filter-actions"><button class="btn btn-primary btn-sm" type="submit">${icon('search', { size: 16 })} Filter</button><a class="btn btn-ghost btn-sm" href="/admin">Reset</a></div>
</form>
<div class="card table-card">
${result.rows.length === 0 ? html`<p class="pad center muted">No orders found.</p>` : html`
<table class="data-table">
  <thead><tr><th>Order</th><th>Customer</th><th>Delivery</th><th>Total</th><th>Payment</th><th>Status</th><th><span class="sr-only">Open</span></th></tr></thead>
  <tbody>
  ${result.rows.map((o) => html`<tr>
    <td data-label="Order"><a href="/admin/orders/${o.id}"><strong>${o.order_number}</strong></a><br><small class="muted">${formatDateTime(o.created_at)}</small></td>
    <td data-label="Customer">${o.customer_name}<br><small class="muted">${formatPhone(o.phone)}</small></td>
    <td data-label="Delivery">${formatDate(o.delivery_date)} · ${formatTime12(o.delivery_time)}<br><small class="muted">${o.fulfillment === 'pickup' ? 'Pickup' : o.delivery_area_name}</small></td>
    <td data-label="Total"><strong>${pkr(o.grand_total)}</strong><br><small class="muted">${o.item_count} item(s)</small></td>
    <td data-label="Payment">${(paymentMethod(o.payment_method) || {}).name || o.payment_method}<br>${payPill(o.payment_status)}</td>
    <td data-label="Status">${statusPill(o.order_status)}</td>
    <td><a class="btn btn-ghost btn-sm" href="/admin/orders/${o.id}">Open</a></td>
  </tr>`)}
  </tbody>
</table>`}
</div>
${pages > 1 ? html`<nav class="pager" aria-label="Pages">${page > 1 ? html`<a class="btn btn-ghost btn-sm" href="${qs(page - 1)}">← Previous</a>` : ''}<span>Page ${page} of ${pages}</span>${page < pages ? html`<a class="btn btn-ghost btn-sm" href="${qs(page + 1)}">Next →</a>` : ''}</nav>` : ''}`,
  });
}

function orderDetailPage({ admin, order, flash }) {
  const p = order.payment || {};
  const m = paymentMethod(p.method) || { name: p.method };
  const isPickup = order.fulfillment === 'pickup';
  const proofUrl = p.screenshot_file ? `/admin/proofs/${p.screenshot_file}` : '';
  const custWa = waLink('').replace(site.contact.whatsappNumber, '92' + (order.whatsapp || order.phone).slice(1));
  return AdminLayout({
    title: order.order_number, admin, active: 'orders', flash,
    body: html`
<div class="admin-head"><div><a class="back-link" href="/admin">${icon('arrowLeft', { size: 16 })} All orders</a><h1>${order.order_number}</h1><p class="muted">Placed ${formatDateTime(order.created_at)}</p></div>
<div class="status-row">${statusPill(order.order_status)} ${payPill(p.status)}</div></div>
<div class="admin-cols">
  <div class="stack">
    <section class="card pad-card">
      <h2>Payment verification</h2>
      <dl class="detail-list">
        <div><dt>Method</dt><dd>${m.name}</dd></div>
        <div><dt>Amount due</dt><dd><strong>${pkr(order.grand_total)}</strong></dd></div>
        <div><dt>Transaction ID</dt><dd>${p.transaction_id || '—'}</dd></div>
        <div><dt>Status</dt><dd>${payPill(p.status)}${p.verified_at ? html` <small class="muted">by ${p.verified_by} · ${formatDateTime(p.verified_at)}</small>` : ''}</dd></div>
        ${p.admin_note ? html`<div><dt>Note</dt><dd>${p.admin_note}</dd></div>` : ''}
      </dl>
      ${proofUrl ? (p.screenshot_mime === 'application/pdf'
        ? html`<p><a class="btn btn-ghost" href="${proofUrl}" target="_blank" rel="noopener">${icon('external', { size: 16 })} Open payment receipt (PDF)</a></p>`
        : html`<a class="proof" href="${proofUrl}" target="_blank" rel="noopener"><img src="${proofUrl}" alt="Payment screenshot uploaded by customer"></a>`) : html`<p class="muted">No payment screenshot uploaded.</p>`}
      <form method="post" action="/admin/orders/${order.id}/payment" class="stack">
        ${csrfField(admin.csrf)}
        <div class="field"><label for="pnote">Note (optional)</label><input id="pnote" name="note" maxlength="300" placeholder="e.g. Amount received in JazzCash"></div>
        <div class="btn-row">
          <button class="btn btn-primary" name="status" value="verified" type="submit">${icon('check', { size: 16 })} Mark Payment Verified</button>
          <button class="btn btn-danger-ghost" name="status" value="rejected" type="submit" data-confirm="Mark this payment as rejected?">Reject Payment</button>
          ${p.status !== 'pending_verification' ? html`<button class="btn btn-ghost" name="status" value="pending_verification" type="submit">Reset to Pending</button>` : ''}
        </div>
      </form>
    </section>

    <section class="card pad-card">
      <h2>Items</h2>
      <ul class="order-items">${order.items.map((i) => html`<li><img src="${i.product_image}" alt="" width="64" height="48"><div><strong>${i.product_name}</strong><span>${i.variant_label} · ${i.quantity} × ${pkr(i.unit_price)}</span></div><b>${pkr(i.line_total)}</b></li>`)}</ul>
      <dl class="totals"><div><dt>Subtotal</dt><dd>${pkr(order.subtotal)}</dd></div><div><dt>Delivery (${order.delivery_area_name || '—'})</dt><dd>${pkr(order.delivery_charge)}</dd></div><div class="grand"><dt>Grand Total</dt><dd>${pkr(order.grand_total)}</dd></div></dl>
      ${order.notes ? html`<div class="notes-box"><strong>Order notes</strong><p class="pre">${order.notes}</p></div>` : ''}
    </section>
  </div>

  <div class="stack">
    <section class="card pad-card">
      <h2>Order status</h2>
      <form method="post" action="/admin/orders/${order.id}/status" class="stack">
        ${csrfField(admin.csrf)}
        <div class="field"><label for="ostatus">Status</label><select id="ostatus" name="status" class="select">${ORDER_STATUSES.map((s) => html`<option value="${s.id}" ${sel(s.id, order.order_status)}>${s.label}</option>`)}</select></div>
        <div class="field"><label for="onote">Note (optional)</label><input id="onote" name="note" maxlength="300"></div>
        <button class="btn btn-primary" type="submit">Update status</button>
      </form>
      <h3>History</h3>
      <ol class="history">${order.history.map((h) => html`<li><strong>${statusLabel(h.status)}</strong>${h.note ? html` — ${h.note}` : ''}<br><small class="muted">${formatDateTime(h.created_at)} · ${h.changed_by}</small></li>`)}</ol>
    </section>
    <section class="card pad-card">
      <h2>Customer</h2>
      <dl class="detail-list">
        <div><dt>Name</dt><dd>${order.customer_name}</dd></div>
        <div><dt>Mobile</dt><dd><a href="tel:+92${order.phone.slice(1)}">${formatPhone(order.phone)}</a></dd></div>
        <div><dt>WhatsApp</dt><dd><a href="${custWa}" target="_blank" rel="noopener">${formatPhone(order.whatsapp || order.phone)}</a></dd></div>
        ${order.email ? html`<div><dt>Email</dt><dd><a href="mailto:${order.email}">${order.email}</a></dd></div>` : ''}
      </dl>
      <h2>${isPickup ? 'Pickup' : 'Delivery'}</h2>
      <dl class="detail-list">
        <div><dt>Type</dt><dd>${isPickup ? 'Pickup' : 'Home Delivery'}</dd></div>
        ${isPickup ? '' : html`<div><dt>Address</dt><dd>${[order.address, order.area, order.city, order.province].filter(Boolean).join(', ')}</dd></div>
        ${order.landmark ? html`<div><dt>Landmark</dt><dd>${order.landmark}</dd></div>` : ''}
        <div><dt>Area</dt><dd>${order.delivery_area_name}</dd></div>`}
        <div><dt>Date</dt><dd>${formatDate(order.delivery_date)}</dd></div>
        <div><dt>Time</dt><dd>${formatTime12(order.delivery_time)}</dd></div>
      </dl>
    </section>
  </div>
</div>`,
  });
}

function productsPage({ admin, products, flash }) {
  return AdminLayout({
    title: 'Products', admin, active: 'products', flash,
    body: html`
<div class="admin-head"><div><h1>Products</h1><p class="muted">${products.length} products. Click a product to change its name, prices, weights, image or description.</p></div></div>
<div class="card table-card">
<table class="data-table">
  <thead><tr><th>Product</th><th>Category</th><th>Prices</th><th>Available</th><th>Best Seller</th><th>Favourite</th><th><span class="sr-only">Edit</span></th></tr></thead>
  <tbody>
  ${products.map((p) => html`<tr class="${p.available ? '' : 'row-muted'}">
    <td data-label="Product"><a class="prod-cell" href="/admin/products/${p.id}"><img src="${p.image}" alt="" width="56" height="42" loading="lazy"><strong>${p.name}</strong></a></td>
    <td data-label="Category">${categoryName(p.category)}</td>
    <td data-label="Prices"><small>${p.variants.map((v) => `${v.label}: ${pkr(v.price)}`).join(' · ')}</small></td>
    ${['available', 'featured', 'favorite'].map((f) => html`<td data-label="${f}"><form method="post" action="/admin/products/${p.id}/toggle">${csrfField(admin.csrf)}<input type="hidden" name="field" value="${f}"><button class="toggle ${p[f] ? 'on' : ''}" type="submit" aria-pressed="${p[f] ? 'true' : 'false'}" aria-label="Toggle ${f} for ${p.name}"><span></span></button></form></td>`)}
    <td><a class="btn btn-ghost btn-sm" href="/admin/products/${p.id}">Edit</a></td>
  </tr>`)}
  </tbody>
</table></div>`,
  });
}

function productEditPage({ admin, product: p, flash }) {
  const isCake = p.type === 'cake';
  return AdminLayout({
    title: p.name, admin, active: 'products', flash,
    body: html`
<div class="admin-head"><div><a class="back-link" href="/admin/products">${icon('arrowLeft', { size: 16 })} All products</a><h1>${p.name}</h1><p class="muted"><a href="/products/${p.slug}" target="_blank" rel="noopener">/products/${p.slug} ${icon('external', { size: 14 })}</a></p></div></div>
<div class="admin-cols">
  <form class="card pad-card stack" method="post" action="/admin/products/${p.id}">
    ${csrfField(admin.csrf)}
    <h2>Details</h2>
    <div class="field"><label for="name">Product name</label><input id="name" name="name" value="${p.name}" required maxlength="80"></div>
    <div class="field"><label for="category">Category</label><select id="category" name="category" class="select">${categories.map((c) => html`<option value="${c.id}" ${sel(c.id, p.category)}>${c.name}</option>`)}</select></div>
    <div class="field"><label for="short">Short description (product card)</label><input id="short" name="short_description" value="${p.short_description}" maxlength="140"></div>
    <div class="field"><label for="desc">Full description</label><textarea id="desc" name="description" rows="4" maxlength="1200">${p.description}</textarea></div>
    <div class="field"><label for="ing">Ingredients / general information</label><textarea id="ing" name="ingredients" rows="3" maxlength="800" placeholder="Leave empty to show &quot;Ingredient details are available on request&quot;">${p.ingredients}</textarea></div>
    <div class="field"><label for="alt">Image description (alt text)</label><input id="alt" name="image_alt" value="${p.image_alt}" maxlength="160"></div>
    <div class="check-row">
      <label class="check"><input type="checkbox" name="available" value="1" ${chk(p.available)}><span>Available to order</span></label>
      <label class="check"><input type="checkbox" name="featured" value="1" ${chk(p.featured)}><span>Show in Best Sellers</span></label>
      <label class="check"><input type="checkbox" name="favorite" value="1" ${chk(p.favorite)}><span>Show in Customer Favorites</span></label>
    </div>

    <h2>${isCake ? 'Cake weights & prices (PKR)' : 'Box sizes & prices (PKR)'}</h2>
    <div class="variant-table" data-variant-table>
      <div class="vt-head"><span>Label</span><span>${isCake ? 'Weight (lb)' : 'Pieces'}</span><span>Price (PKR)</span><span>On</span><span>Remove</span></div>
      ${p.variants.map((v) => html`<div class="vt-row">
        <input type="hidden" name="v_id" value="${v.id}">
        <input name="v_label" value="${v.label}" aria-label="Label" required maxlength="40">
        <input name="v_size" type="number" step="${isCake ? '0.5' : '1'}" min="0" value="${isCake ? v.weight_lbs : v.pieces}" aria-label="${isCake ? 'Weight in pounds' : 'Pieces'}">
        <input name="v_price" type="number" min="0" step="10" value="${v.price}" aria-label="Price in PKR" required>
        <select name="v_available" class="select select-sm" aria-label="Available"><option value="1" ${sel(1, v.available ? 1 : 0)}>Yes</option><option value="0" ${sel(0, v.available ? 1 : 0)}>No</option></select>
        <select name="v_delete" class="select select-sm" aria-label="Remove"><option value="0">Keep</option><option value="1">Remove</option></select>
      </div>`)}
      <div class="vt-row vt-new">
        <input type="hidden" name="v_id" value="new">
        <input name="v_label" placeholder="${isCake ? 'e.g. 6 Pounds' : 'e.g. Box of 24'}" aria-label="New option label" maxlength="40">
        <input name="v_size" type="number" step="${isCake ? '0.5' : '1'}" min="0" placeholder="${isCake ? '6' : '24'}" aria-label="New option size">
        <input name="v_price" type="number" min="0" step="10" placeholder="Price" aria-label="New option price">
        <select name="v_available" class="select select-sm" aria-label="Available"><option value="1">Yes</option><option value="0">No</option></select>
        <input type="hidden" name="v_delete" value="0"><span class="muted small">New</span>
      </div>
    </div>
    <p class="hint">To add another weight/size, fill the "New" row and save. Changing a price here does not change orders already placed.</p>
    <button class="btn btn-primary" type="submit">Save product</button>
  </form>

  <div class="stack">
    <form class="card pad-card stack" method="post" action="/admin/products/${p.id}/image" enctype="multipart/form-data">
      ${csrfField(admin.csrf)}
      <h2>Product image</h2>
      <img class="admin-prod-img" src="${p.image}" alt="${p.image_alt}" width="800" height="600">
      <div class="field"><label for="image">Upload a new photo</label><input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required>
      <p class="hint">JPG, PNG or WEBP, up to ${Math.round(site.uploads.maxProductImageBytes / 1048576)} MB. For best results use a landscape photo (4:3), at least 1200 × 900 px.</p></div>
      <button class="btn btn-primary" type="submit">${icon('upload', { size: 16 })} Upload image</button>
    </form>
  </div>
</div>`,
  });
}

function settingsPage({ admin, delivery, flash }) {
  return AdminLayout({
    title: 'Delivery & Settings', admin, active: 'settings', flash,
    body: html`
<div class="admin-head"><h1>Delivery &amp; Settings</h1></div>
<div class="admin-cols">
  <form class="card pad-card stack" method="post" action="/admin/settings/delivery">
    ${csrfField(admin.csrf)}
    <h2>Delivery options</h2>
    <div class="check-row">
      <label class="check"><input type="checkbox" name="home_delivery_enabled" value="1" ${chk(delivery.homeDeliveryEnabled)}><span>Home Delivery enabled</span></label>
      <label class="check"><input type="checkbox" name="pickup_enabled" value="1" ${chk(delivery.pickupEnabled)}><span>Pickup enabled</span></label>
    </div>
    <div class="field"><label for="pickup_note">Pickup note shown at checkout</label><textarea id="pickup_note" name="pickup_note" rows="2" maxlength="300">${delivery.pickupNote}</textarea></div>
    <h2>Delivery areas &amp; charges (PKR)</h2>
    <div class="variant-table area-table">
      <div class="vt-head"><span>Area name</span><span>Charge (PKR)</span><span>Active</span><span>Remove</span></div>
      ${delivery.areas.map((a) => html`<div class="vt-row">
        <input type="hidden" name="a_id" value="${a.id}">
        <input name="a_name" value="${a.name}" required maxlength="60" aria-label="Area name">
        <input name="a_charge" type="number" min="0" step="10" value="${a.charge}" required aria-label="Delivery charge">
        <select name="a_active" class="select select-sm" aria-label="Active"><option value="1" ${sel(1, a.active ? 1 : 0)}>Yes</option><option value="0" ${sel(0, a.active ? 1 : 0)}>No</option></select>
        <select name="a_delete" class="select select-sm" aria-label="Remove"><option value="0">Keep</option><option value="1">Remove</option></select>
      </div>`)}
      <div class="vt-row vt-new">
        <input type="hidden" name="a_id" value="new">
        <input name="a_name" placeholder="e.g. Lahore — DHA" maxlength="60" aria-label="New area name">
        <input name="a_charge" type="number" min="0" step="10" placeholder="Charge" aria-label="New area charge">
        <select name="a_active" class="select select-sm" aria-label="Active"><option value="1">Yes</option><option value="0">No</option></select>
        <input type="hidden" name="a_delete" value="0"><span class="muted small">New</span>
      </div>
    </div>
    <p class="hint">Customers pick their area at checkout and the charge is added automatically. Changing a charge doesn't affect orders already placed.</p>
    <button class="btn btn-primary" type="submit">Save delivery settings</button>
  </form>

  <div class="stack">
    <form class="card pad-card stack" method="post" action="/admin/settings/password">
      ${csrfField(admin.csrf)}
      <h2>Change password</h2>
      <div class="field"><label for="cur">Current password</label><input id="cur" name="current" type="password" autocomplete="current-password" required></div>
      <div class="field"><label for="np">New password (min 10 characters)</label><input id="np" name="password" type="password" autocomplete="new-password" minlength="10" required></div>
      <button class="btn btn-primary" type="submit">Update password</button>
    </form>
    <div class="card pad-card">
      <h2>Payment accounts</h2>
      <p class="muted small">Shown to customers only at checkout and on their order confirmation. To change them, edit <code>src/config/site.js</code> and restart the website.</p>
      <ul class="plain-list">${site.payments.map((m) => html`<li><strong>${m.name}</strong> — ${m.accountTitle}, ${m.bankName ? m.bankName + ', ' : ''}${m.accountNumber}</li>`)}</ul>
    </div>
  </div>
</div>`,
  });
}

module.exports = { loginPage, noAdminPage, dashboardPage, orderDetailPage, productsPage, productEditPage, settingsPage };
