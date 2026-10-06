'use strict';
/**
 * Database layer — uses Node's built-in SQLite (node:sqlite), so no
 * external database server or npm package is needed.
 * The database file lives at DATA_DIR/sohni-bakers.db (default ./data).
 */
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { products: catalog } = require('../config/products');
const site = require('../config/site');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'sohni-bakers.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL DEFAULT 'Admin',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cake','brownie','donut')),
  category TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL,
  image_alt TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  favorite INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  weight_lbs REAL,
  pieces INTEGER,
  price INTEGER NOT NULL CHECK (price >= 0),
  available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  home_delivery_enabled INTEGER NOT NULL DEFAULT 1,
  pickup_enabled INTEGER NOT NULL DEFAULT 1,
  pickup_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_areas (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  charge INTEGER NOT NULL CHECK (charge >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('delivery','pickup')),
  address TEXT,
  area TEXT,
  city TEXT,
  province TEXT,
  landmark TEXT,
  delivery_area_id INTEGER,
  delivery_area_name TEXT,
  delivery_date TEXT NOT NULL,
  delivery_time TEXT NOT NULL,
  notes TEXT,
  subtotal INTEGER NOT NULL,
  delivery_charge INTEGER NOT NULL,
  grand_total INTEGER NOT NULL,
  order_status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  product_slug TEXT,
  product_image TEXT,
  variant_id INTEGER,
  variant_label TEXT NOT NULL,
  weight_lbs REAL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount INTEGER NOT NULL,
  transaction_id TEXT,
  screenshot_file TEXT,
  screenshot_mime TEXT,
  status TEXT NOT NULL,
  admin_note TEXT,
  verified_at TEXT,
  verified_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
`;

db.exec(SCHEMA);

/** Run fn inside a transaction (BEGIN IMMEDIATE so concurrent writers queue safely). */
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function variantsFromCatalog(p) {
  if (p.weightPrices) {
    return Object.entries(p.weightPrices).map(([lb, price], i) => ({
      label: `${lb} ${Number(lb) === 1 ? 'Pound' : 'Pounds'}`,
      weight_lbs: Number(lb),
      pieces: null,
      price: Number(price),
      sort_order: i,
    }));
  }
  return (p.options || []).map((o, i) => ({
    label: o.label,
    weight_lbs: null,
    pieces: o.pieces ?? null,
    price: Number(o.price),
    sort_order: i,
  }));
}

/** Insert or update every product from src/config/products.js (matched by slug). */
function syncCatalog({ overwrite = true } = {}) {
  const findBySlug = db.prepare('SELECT id FROM products WHERE slug = ?');
  const insert = db.prepare(`INSERT INTO products
    (slug, name, type, category, short_description, description, ingredients, image, image_alt, available, featured, favorite, sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const update = db.prepare(`UPDATE products SET name=?, type=?, category=?, short_description=?, description=?, ingredients=?,
    image=?, image_alt=?, available=?, featured=?, favorite=?, sort_order=?, updated_at=datetime('now') WHERE id=?`);
  const delVariants = db.prepare('DELETE FROM product_variants WHERE product_id = ?');
  const insVariant = db.prepare(`INSERT INTO product_variants (product_id, label, weight_lbs, pieces, price, sort_order)
    VALUES (?,?,?,?,?,?)`);

  let created = 0;
  let updated = 0;
  transaction(() => {
    for (const p of catalog) {
      const fields = [p.name, p.type, p.category, p.short, p.description, p.ingredients || '', p.image, p.imageAlt,
        p.available ? 1 : 0, p.featured ? 1 : 0, p.favorite ? 1 : 0, p.sortOrder];
      const existing = findBySlug.get(p.slug);
      let id;
      if (existing) {
        if (!overwrite) continue;
        update.run(...fields, existing.id);
        id = existing.id;
        updated++;
      } else {
        id = Number(insert.run(p.slug, ...fields).lastInsertRowid);
        created++;
      }
      delVariants.run(id);
      for (const v of variantsFromCatalog(p)) insVariant.run(id, v.label, v.weight_lbs, v.pieces, v.price, v.sort_order);
    }
  });
  return { created, updated };
}

/** First-run seeding: catalog + delivery settings. Safe to call on every start. */
function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM products').get();
  if (n === 0) syncCatalog();

  const ds = db.prepare('SELECT id FROM delivery_settings WHERE id = 1').get();
  if (!ds) {
    const d = site.deliveryDefaults;
    transaction(() => {
      db.prepare('INSERT INTO delivery_settings (id, home_delivery_enabled, pickup_enabled, pickup_note) VALUES (1,?,?,?)')
        .run(d.homeDeliveryEnabled ? 1 : 0, d.pickupEnabled ? 1 : 0, d.pickupNote);
      const ins = db.prepare('INSERT INTO delivery_areas (name, charge, active, sort_order) VALUES (?,?,1,?)');
      d.areas.forEach((a, i) => ins.run(a.name, a.charge, i));
    });
  }
}

module.exports = { db, transaction, syncCatalog, seedIfEmpty, DATA_DIR, ROOT };
