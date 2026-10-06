'use strict';
/**
 * Order service. Prices and totals are ALWAYS calculated here on the server
 * from the database — prices sent by the browser are never trusted.
 */
const crypto = require('node:crypto');
const { db, transaction } = require('./db');
const v = require('./validate');
const site = require('../config/site');
const { getDelivery } = require('./catalog');
const { HttpError } = require('./http');

const ORDER_STATUSES = [
  { id: 'new', label: 'New Order' },
  { id: 'payment_pending', label: 'Payment Verification Pending' },
  { id: 'payment_verified', label: 'Payment Verified' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'out_for_delivery', label: 'Out for Delivery' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];
const PAYMENT_STATUSES = [
  { id: 'pending_verification', label: 'Pending Verification' },
  { id: 'verified', label: 'Verified' },
  { id: 'rejected', label: 'Rejected' },
];
const statusLabel = (id) => (ORDER_STATUSES.find((s) => s.id === id) || {}).label || id;
const paymentStatusLabel = (id) => (PAYMENT_STATUSES.find((s) => s.id === id) || {}).label || id;
const paymentMethod = (id) => site.payments.find((p) => p.id === id) || null;

class ValidationError extends HttpError {
  constructor(fields) {
    super(422, 'Please check the highlighted fields and try again.', fields);
  }
}

function nextOrderNumber() {
  const year = v.todayPK().slice(0, 4);
  const key = `order-${year}`;
  db.prepare('INSERT INTO counters (key, value) VALUES (?, 0) ON CONFLICT(key) DO NOTHING').run(key);
  db.prepare('UPDATE counters SET value = value + 1 WHERE key = ?').run(key);
  const { value } = db.prepare('SELECT value FROM counters WHERE key = ?').get(key);
  return `${site.orders.numberPrefix}-${year}-${String(value).padStart(4, '0')}`;
}

/** Validate + price the cart. Returns { lines, subtotal } or throws. */
function priceItems(rawItems, errors) {
  const max = site.orders.maxQuantityPerItem;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    errors.cart = 'Your cart is empty. Please add something delicious first!';
    return { lines: [], subtotal: 0 };
  }
  if (rawItems.length > site.orders.maxItemsPerOrder) {
    errors.cart = 'Too many different items in one order. Please contact us on WhatsApp for large orders.';
    return { lines: [], subtotal: 0 };
  }
  const merged = new Map();
  for (const it of rawItems) {
    const id = v.int(it && it.variantId, 1, 1e9);
    const qty = v.int(it && it.quantity, 1, max);
    if (!id || !qty) {
      errors.cart = `Invalid quantity. You can order between 1 and ${max} of each item.`;
      return { lines: [], subtotal: 0 };
    }
    merged.set(id, Math.min(max, (merged.get(id) || 0) + qty));
  }
  const q = db.prepare(`SELECT v.id AS variant_id, v.label, v.weight_lbs, v.price, v.available AS v_available,
      p.id AS product_id, p.name, p.slug, p.image, p.available AS p_available
    FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?`);
  const lines = [];
  const unavailable = [];
  for (const [variantId, quantity] of merged) {
    const row = q.get(variantId);
    if (!row) {
      errors.cart = 'One of the items in your cart is no longer on our menu. Please remove it and try again.';
      continue;
    }
    if (!row.p_available || !row.v_available) {
      unavailable.push(`${row.name} (${row.label})`);
      continue;
    }
    lines.push({ ...row, quantity, line_total: row.price * quantity });
  }
  if (unavailable.length) errors.cart = `Sorry, currently unavailable: ${unavailable.join(', ')}. Please remove it from your cart.`;
  return { lines, subtotal: lines.reduce((s, l) => s + l.line_total, 0) };
}

/**
 * Create an order from checkout input + uploaded payment proof (already-validated file saved by caller).
 * `saveProof` is a function that stores the file and returns { name, mime }; it's only called
 * after every other check passes, so rejected orders never leave files behind.
 */
function createOrder(input, { hasScreenshot, saveProof }) {
  const errors = {};
  const c = input.customer || {};
  const name = v.str(c.name, 80);
  if (name.length < 2) errors.name = 'Please enter your full name.';
  const phone = v.pakMobile(c.phone || '');
  if (!c.phone) errors.phone = 'Please enter your mobile number.';
  else if (!phone) errors.phone = 'Please enter a valid Pakistani mobile number, e.g. 0300 1234567.';
  let whatsapp = phone;
  if (c.whatsapp) {
    whatsapp = v.pakMobile(c.whatsapp);
    if (!whatsapp) errors.whatsapp = 'Please enter a valid WhatsApp number, e.g. 0300 1234567.';
  }
  const email = v.email(c.email);
  if (email === null) errors.email = 'Please enter a valid email address (or leave it empty).';

  const delivery = getDelivery();
  const fulfillment = input.fulfillment === 'pickup' ? 'pickup' : input.fulfillment === 'delivery' ? 'delivery' : null;
  let area = null;
  const d = input.delivery || {};
  if (!fulfillment) errors.fulfillment = 'Please choose Home Delivery or Pickup.';
  else if (fulfillment === 'pickup' && !delivery.pickupEnabled) errors.fulfillment = 'Pickup is not available right now. Please choose Home Delivery.';
  else if (fulfillment === 'delivery') {
    if (!delivery.homeDeliveryEnabled) errors.fulfillment = 'Home delivery is not available right now. Please choose Pickup.';
    area = delivery.areas.find((a) => a.active && a.id === Number(d.areaId)) || null;
    if (!area) errors.areaId = 'Please select your delivery area.';
    if (v.str(d.address, 300).length < 8) errors.address = 'Please enter your complete delivery address (house no, street, block).';
    if (v.str(d.city, 60).length < 2) errors.city = 'Please enter your city.';
  }

  const date = v.dateInRange(input.date);
  if (!input.date) errors.date = fulfillment === 'pickup' ? 'Please choose a pickup date.' : 'Please choose a delivery date.';
  else if (!date) errors.date = 'Please choose a valid date (today or later).';
  const time = v.time(input.time);
  if (!time) errors.time = 'Please choose your preferred time.';

  const pay = input.payment || {};
  const method = paymentMethod(pay.method);
  const txn = v.str(pay.transactionId, 60);
  if (!method) errors.paymentMethod = 'Please select a payment method.';
  else {
    if (method.requireTransactionId && txn.length < 4) errors.transactionId = 'Please enter the Transaction ID / Reference Number from your payment.';
    if (method.requireScreenshot && !hasScreenshot) errors.screenshot = 'Please upload your payment screenshot.';
  }
  if (txn && !/^[A-Za-z0-9\-_/ #.]+$/.test(txn)) errors.transactionId = 'Transaction ID can only contain letters, numbers and dashes.';
  if (input.confirmPaid !== true) errors.confirmPaid = 'Please confirm that you have sent the payment.';

  const { lines, subtotal } = priceItems(input.items, errors);
  if (Object.keys(errors).length) throw new ValidationError(errors);

  const deliveryCharge = fulfillment === 'delivery' ? area.charge : 0;
  const grandTotal = subtotal + deliveryCharge;
  const proof = hasScreenshot ? saveProof() : null;

  try {
    return insertOrder();
  } catch (err) {
    if (proof) require('./storage').removeFile(require('./storage').PROOF_DIR, proof.name);
    throw err;
  }

  function insertOrder() {
  return transaction(() => {
    const orderNumber = nextOrderNumber();
    const token = crypto.randomBytes(18).toString('base64url');

    db.prepare(`INSERT INTO customers (name, phone, whatsapp, email) VALUES (?,?,?,?)
      ON CONFLICT(phone) DO UPDATE SET name=excluded.name, whatsapp=excluded.whatsapp,
      email=COALESCE(NULLIF(excluded.email,''), customers.email), updated_at=datetime('now')`).run(name, phone, whatsapp, email || '');
    const customer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);

    const r = db.prepare(`INSERT INTO orders (order_number, access_token, customer_id, customer_name, phone, whatsapp, email,
        fulfillment, address, area, city, province, landmark, delivery_area_id, delivery_area_name, delivery_date, delivery_time,
        notes, subtotal, delivery_charge, grand_total, order_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      orderNumber, token, customer.id, name, phone, whatsapp, email || '', fulfillment,
      fulfillment === 'delivery' ? v.str(d.address, 300) : '',
      fulfillment === 'delivery' ? v.str(d.area, 80) : '',
      fulfillment === 'delivery' ? v.str(d.city, 60) : '',
      site.brand.province,
      fulfillment === 'delivery' ? v.str(d.landmark, 120) : '',
      area ? area.id : null, area ? area.name : 'Pickup',
      date, time, v.text(input.notes, 500), subtotal, deliveryCharge, grandTotal, 'payment_pending',
    );
    const orderId = Number(r.lastInsertRowid);

    const insItem = db.prepare(`INSERT INTO order_items (order_id, product_id, product_name, product_slug, product_image,
      variant_id, variant_label, weight_lbs, unit_price, quantity, line_total) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    for (const l of lines) {
      insItem.run(orderId, l.product_id, l.name, l.slug, l.image, l.variant_id, l.label, l.weight_lbs, l.price, l.quantity, l.line_total);
    }

    db.prepare(`INSERT INTO payments (order_id, method, amount, transaction_id, screenshot_file, screenshot_mime, status)
      VALUES (?,?,?,?,?,?,'pending_verification')`).run(orderId, method.id, grandTotal, txn, proof ? proof.name : null, proof ? proof.mime : null);

    const hist = db.prepare('INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?,?,?,?)');
    hist.run(orderId, 'new', 'Order placed on website', 'customer');
    hist.run(orderId, 'payment_pending', `Payment proof submitted via ${method.name}`, 'customer');

    return { orderNumber, token, orderId };
  });
  }
}

function loadOrder(where, ...params) {
  const order = db.prepare(`SELECT * FROM orders WHERE ${where}`).get(...params);
  if (!order) return null;
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
  order.payment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(order.id) || null;
  order.history = db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY id').all(order.id);
  return order;
}

/** Customer access: needs the private token from their confirmation link. */
function getOrderForCustomer(orderNumber, token) {
  const order = loadOrder('order_number = ?', String(orderNumber || ''));
  if (!order || !token) return null;
  const a = Buffer.from(order.access_token);
  const b = Buffer.from(String(token));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return order;
}

const getOrderById = (id) => loadOrder('id = ?', Number(id));

function searchOrders({ q = '', status = '', payment = '', from = '', to = '', limit = 50, offset = 0 } = {}) {
  const where = [];
  const params = [];
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    const digits = q.replace(/\D/g, '');
    where.push(`(o.order_number LIKE ? OR o.customer_name LIKE ? OR p.transaction_id LIKE ?${digits.length >= 4 ? ' OR o.phone LIKE ? OR o.whatsapp LIKE ?' : ''})`);
    params.push(like, like, like);
    if (digits.length >= 4) params.push(`%${digits.slice(-10)}%`, `%${digits.slice(-10)}%`);
  }
  if (status) { where.push('o.order_status = ?'); params.push(status); }
  if (payment) { where.push('p.status = ?'); params.push(payment); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) { where.push('o.delivery_date >= ?'); params.push(from); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { where.push('o.delivery_date <= ?'); params.push(to); }
  const sqlWhere = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const base = `FROM orders o LEFT JOIN payments p ON p.order_id = o.id ${sqlWhere}`;
  const total = db.prepare(`SELECT COUNT(*) AS n ${base}`).get(...params).n;
  const rows = db.prepare(`SELECT o.*, p.method AS payment_method, p.status AS payment_status,
      (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
    ${base} ORDER BY o.id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { total, rows };
}

function orderStats() {
  const row = (sql, ...p) => db.prepare(sql).get(...p).n;
  const today = v.todayPK();
  return {
    pendingPayments: row("SELECT COUNT(*) AS n FROM payments WHERE status = 'pending_verification'"),
    active: row("SELECT COUNT(*) AS n FROM orders WHERE order_status IN ('payment_verified','preparing','ready','out_for_delivery')"),
    dueToday: row("SELECT COUNT(*) AS n FROM orders WHERE delivery_date = ? AND order_status NOT IN ('delivered','cancelled')", today),
    total: row('SELECT COUNT(*) AS n FROM orders'),
  };
}

function updateOrderStatus(orderId, status, note, by) {
  if (!ORDER_STATUSES.some((s) => s.id === status)) throw new HttpError(400, 'Unknown order status.');
  transaction(() => {
    db.prepare("UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?").run(status, orderId);
    db.prepare('INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?,?,?,?)').run(orderId, status, v.text(note, 300), by);
  });
}

function setPaymentStatus(orderId, status, note, by) {
  if (!PAYMENT_STATUSES.some((s) => s.id === status)) throw new HttpError(400, 'Unknown payment status.');
  transaction(() => {
    db.prepare(`UPDATE payments SET status = ?, admin_note = ?, verified_at = CASE WHEN ? = 'verified' THEN datetime('now') ELSE NULL END,
      verified_by = CASE WHEN ? = 'verified' THEN ? ELSE NULL END WHERE order_id = ?`).run(status, v.text(note, 300), status, status, by, orderId);
    const order = db.prepare('SELECT order_status FROM orders WHERE id = ?').get(orderId);
    let next = null;
    if (status === 'verified' && ['new', 'payment_pending'].includes(order.order_status)) next = 'payment_verified';
    if (status === 'pending_verification' && order.order_status === 'payment_verified') next = 'payment_pending';
    const label = paymentStatusLabel(status);
    if (next) db.prepare("UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?").run(next, orderId);
    db.prepare('INSERT INTO order_status_history (order_id, status, note, changed_by) VALUES (?,?,?,?)')
      .run(orderId, next || order.order_status, `Payment ${label.toLowerCase()}${note ? ' — ' + v.text(note, 300) : ''}`, by);
  });
}

module.exports = {
  ORDER_STATUSES, PAYMENT_STATUSES, statusLabel, paymentStatusLabel, paymentMethod,
  createOrder, getOrderForCustomer, getOrderById, searchOrders, orderStats, updateOrderStatus, setPaymentStatus, ValidationError,
};
