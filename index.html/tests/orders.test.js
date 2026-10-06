'use strict';
// Run: npm test   (uses a temporary database — your real data is not touched)
const { test } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sohni-test-'));
process.env.DATA_DIR = tmp;
process.env.STORAGE_DIR = tmp;

const { seedIfEmpty, db } = require('../src/lib/db');
seedIfEmpty();
const v = require('../src/lib/validate');
const orders = require('../src/lib/orders');
const { products } = require('../src/config/products');

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c40000000049454e44ae426082', 'hex');
const variantFor = (slug, idx = 0) => db.prepare('SELECT v.* FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.slug=? ORDER BY v.sort_order LIMIT 1 OFFSET ?').get(slug, idx);
const area = () => db.prepare('SELECT * FROM delivery_areas ORDER BY id LIMIT 1').get();
const tomorrow = () => { const d = new Date(v.todayPK() + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
const storage = require('../src/lib/storage');
const base = (over = {}) => ({
  items: [{ variantId: variantFor('fudge-cake', 1).id, quantity: 2 }],
  customer: { name: 'Test Customer', phone: '0300-1234567' },
  fulfillment: 'delivery',
  delivery: { areaId: area().id, address: 'House 1, Street 2, Block A', city: 'Lahore' },
  date: tomorrow(), time: '17:00',
  payment: { method: 'easypaisa', transactionId: 'ABC12345' },
  confirmPaid: true, ...over,
});
const place = (input) => orders.createOrder(input, { hasScreenshot: true, saveProof: () => storage.savePaymentProof({ data: PNG }, 5e6) });

test('catalog has all 27 products, cakes priced in pounds', () => {
  assert.equal(products.length, 27);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM products').get().n, 27);
  const cakes = db.prepare("SELECT COUNT(*) n FROM product_variants v JOIN products p ON p.id=v.product_id WHERE p.type='cake' AND v.weight_lbs IS NULL").get().n;
  assert.equal(cakes, 0);
});

test('Pakistani mobile validation', () => {
  assert.equal(v.pakMobile('0300 1234567'), '03001234567');
  assert.equal(v.pakMobile('+92 316 2443843'), '03162443843');
  assert.equal(v.pakMobile('923162443843'), '03162443843');
  assert.equal(v.pakMobile('12345'), null);
  assert.equal(v.pakMobile('0421234567'), null);
});

test('server calculates totals from database prices (ignores client prices)', () => {
  const input = base();
  input.items[0].price = 1; // tampered — must be ignored
  const r = place(input);
  const o = orders.getOrderForCustomer(r.orderNumber, r.token);
  const vv = variantFor('fudge-cake', 1);
  assert.equal(o.subtotal, vv.price * 2);
  assert.equal(o.delivery_charge, area().charge);
  assert.equal(o.grand_total, vv.price * 2 + area().charge);
  assert.equal(o.order_status, 'payment_pending');
  assert.equal(o.payment.status, 'pending_verification');
  assert.match(o.order_number, /^SB-\d{4}-\d{4}$/);
});

test('order numbers are unique and sequential', () => {
  const a = place(base()), b = place(base());
  const n = (x) => Number(x.orderNumber.split('-').pop());
  assert.equal(n(b), n(a) + 1);
});

test('pickup has no delivery charge', () => {
  const r = place(base({ fulfillment: 'pickup', delivery: {} }));
  assert.equal(orders.getOrderForCustomer(r.orderNumber, r.token).delivery_charge, 0);
});

test('validation errors are friendly and specific', () => {
  try {
    orders.createOrder({ items: [], customer: {}, payment: {} }, { hasScreenshot: false, saveProof: () => null });
    assert.fail('should throw');
  } catch (e) {
    assert.ok(e instanceof orders.ValidationError);
    assert.equal(e.details.phone, 'Please enter your mobile number.');
    assert.equal(e.details.paymentMethod, 'Please select a payment method.');
    assert.match(e.details.cart, /cart is empty/);
  }
  assert.throws(() => orders.createOrder(base(), { hasScreenshot: false, saveProof: () => null }), (e) => e.details.screenshot === 'Please upload your payment screenshot.');
  assert.throws(() => place(base({ items: [{ variantId: variantFor('donuts').id, quantity: 999 }] })), (e) => /quantity/i.test(e.details.cart));
});

test('unavailable products cannot be ordered', () => {
  db.prepare("UPDATE products SET available = 0 WHERE slug = 'fudge-cake'").run();
  assert.throws(() => place(base()), (e) => /unavailable/.test(e.details.cart));
  db.prepare("UPDATE products SET available = 1 WHERE slug = 'fudge-cake'").run();
});

test('wrong access token cannot view an order', () => {
  const r = place(base());
  assert.equal(orders.getOrderForCustomer(r.orderNumber, 'nope'), null);
});

test('verifying payment moves order to Payment Verified', () => {
  const r = place(base());
  orders.setPaymentStatus(r.orderId, 'verified', '', 'admin@test');
  const o = orders.getOrderById(r.orderId);
  assert.equal(o.payment.status, 'verified');
  assert.equal(o.order_status, 'payment_verified');
});

test('payment proof rejects non-image files', () => {
  assert.throws(() => storage.savePaymentProof({ data: Buffer.from('<script>alert(1)</script> not an image') }, 5e6), /JPG, PNG/);
});
