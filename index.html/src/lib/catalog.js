'use strict';
/** Read access to products, variants and delivery settings. */
const { db } = require('./db');
const { categories } = require('../config/products');

function hydrate(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const variants = db
    .prepare(`SELECT * FROM product_variants WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order, id`)
    .all(...ids);
  const byProduct = new Map(ids.map((id) => [id, []]));
  for (const v of variants) byProduct.get(v.product_id).push({ ...v, available: !!v.available });
  return rows.map((r) => {
    const vs = byProduct.get(r.id);
    const live = vs.filter((v) => v.available);
    return {
      ...r,
      available: !!r.available,
      featured: !!r.featured,
      favorite: !!r.favorite,
      variants: vs,
      fromPrice: live.length ? Math.min(...live.map((v) => v.price)) : null,
      orderable: !!r.available && live.length > 0,
    };
  });
}

const listProducts = () => hydrate(db.prepare('SELECT * FROM products ORDER BY sort_order, id').all());
const getProductBySlug = (slug) => hydrate(db.prepare('SELECT * FROM products WHERE slug = ?').all(slug))[0] || null;
const getProductById = (id) => hydrate(db.prepare('SELECT * FROM products WHERE id = ?').all(id))[0] || null;
const categoryName = (id) => (categories.find((c) => c.id === id) || {}).name || id;

/** Public catalog for the cart (no internal fields). */
function publicCatalog() {
  return listProducts().map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    image: p.image,
    imageAlt: p.image_alt,
    orderable: p.orderable,
    variants: p.variants.map((v) => ({ id: v.id, label: v.label, weightLbs: v.weight_lbs, pieces: v.pieces, price: v.price, available: v.available })),
  }));
}

function getDelivery() {
  const s = db.prepare('SELECT * FROM delivery_settings WHERE id = 1').get() || {};
  const areas = db.prepare('SELECT * FROM delivery_areas ORDER BY sort_order, id').all();
  return {
    homeDeliveryEnabled: !!s.home_delivery_enabled,
    pickupEnabled: !!s.pickup_enabled,
    pickupNote: s.pickup_note || '',
    areas: areas.map((a) => ({ id: a.id, name: a.name, charge: a.charge, active: !!a.active })),
  };
}

function publicDelivery() {
  const d = getDelivery();
  return { ...d, areas: d.areas.filter((a) => a.active).map(({ id, name, charge }) => ({ id, name, charge })) };
}

module.exports = { listProducts, getProductBySlug, getProductById, categoryName, categories, publicCatalog, getDelivery, publicDelivery };
