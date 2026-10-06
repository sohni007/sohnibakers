'use strict';
/**
 * Sohni Bakers — web server.
 * Zero npm dependencies: Node.js 22+ (built-in http, sqlite, crypto, zlib).
 *
 *   npm start           → production
 *   npm run dev         → auto-restart on file changes
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');

if (fs.existsSync(path.join(__dirname, '.env')) && typeof process.loadEnvFile === 'function') process.loadEnvFile(path.join(__dirname, '.env'));

const { seedIfEmpty, db, transaction } = require('./src/lib/db');
const { HttpError, parseBody, html, json, redirect, clientIp } = require('./src/lib/http');
const auth = require('./src/lib/auth');
const catalog = require('./src/lib/catalog');
const orders = require('./src/lib/orders');
const storage = require('./src/lib/storage');
const { rateLimit } = require('./src/lib/ratelimit');
const v = require('./src/lib/validate');
const site = require('./src/config/site');
const store = require('./src/views/pages/store');
const admin = require('./src/views/admin/pages');
const { SITE_URL } = require('./src/views/components/layout');

seedIfEmpty();
auth.ensureAdminFromEnv();

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const PROD = process.env.NODE_ENV === 'production';

// ------------------------------------------------------------------ security headers
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.google.com https://maps.google.com',
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');
function securityHeaders(res) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// ------------------------------------------------------------------ compression
function send(req, res, status, body, type, extra = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const headers = { 'Content-Type': type, Vary: 'Accept-Encoding', ...extra };
  if (buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '') && /text|json|javascript|svg|xml/.test(type)) {
    const gz = zlib.gzipSync(buf, { level: 6 });
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip', 'Content-Length': gz.length });
    return res.end(req.method === 'HEAD' ? undefined : gz);
  }
  res.writeHead(status, { ...headers, 'Content-Length': buf.length });
  res.end(req.method === 'HEAD' ? undefined : buf);
}
const page = (req, res, status, body, extra = {}) => send(req, res, status, body, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });

// ------------------------------------------------------------------ static files
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8',
};
const staticCache = new Map();
function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return false;
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return false;
  }
  if (!stat.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etag = `"${stat.size.toString(36)}-${stat.mtimeMs.toString(36)}"`;
  const longCache = /\.(woff2?|png|jpe?g|webp|avif|svg)$/.test(ext) || /[?&]v=/.test(req.url);
  const headers = { ETag: etag, 'Cache-Control': longCache ? 'public, max-age=2592000' : 'public, max-age=300' };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    res.end();
    return true;
  }
  let body = staticCache.get(file);
  if (!body || body.etag !== etag) {
    body = { etag, data: fs.readFileSync(file) };
    if (stat.size < 2_000_000) staticCache.set(file, body);
  }
  send(req, res, 200, body.data, type, headers);
  return true;
}

function serveFile(req, res, found, cacheControl) {
  const data = fs.readFileSync(found.file);
  send(req, res, 200, data, found.mime, { 'Cache-Control': cacheControl });
}

// ------------------------------------------------------------------ helpers
function notFound(req, res) {
  page(req, res, 404, store.errorPage(404, 'Page not found', "Sorry, we couldn't find that page. It may have moved — but our cakes are still here!"));
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin form posts from older browsers may omit it; CSRF token still required for admin
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}
const FLASH = {
  saved: ['success', 'Changes saved.'],
  status: ['success', 'Order status updated.'],
  payment: ['success', 'Payment status updated.'],
  image: ['success', 'Product image updated.'],
  password: ['success', 'Password updated.'],
  badpassword: ['error', 'Your current password is incorrect, or the new password is shorter than 10 characters.'],
  invalid: ['error', 'Some values were not valid. Please check and try again.'],
  imageerr: ['error', 'That image could not be uploaded. Please use a JPG, PNG or WEBP file under 4 MB.'],
};
const flashFrom = (url) => {
  const f = FLASH[url.searchParams.get('msg')];
  return f ? { type: f[0], message: f[1] } : null;
};

// ------------------------------------------------------------------ routes: storefront
async function storefront(req, res, url) {
  const p = url.pathname;
  if (req.method === 'GET' || req.method === 'HEAD') {
    if (p === '/') {
      const reviews = db.prepare('SELECT * FROM reviews WHERE approved = 1 ORDER BY id DESC LIMIT 6').all();
      return page(req, res, 200, store.homePage({ products: catalog.listProducts(), reviews }));
    }
    if (p === '/menu') return page(req, res, 200, store.menuPage({ products: catalog.listProducts(), category: url.searchParams.get('category') || '', q: v.str(url.searchParams.get('q') || '', 60) }));
    let m;
    if ((m = /^\/products\/([a-z0-9-]{1,80})\/?$/.exec(p))) {
      const product = catalog.getProductBySlug(m[1]);
      if (!product) return notFound(req, res);
      const all = catalog.listProducts();
      const related = all.filter((x) => x.category === product.category && x.id !== product.id && x.orderable).slice(0, 4);
      return page(req, res, 200, store.productPage({ product, related }));
    }
    if (p === '/cart') return page(req, res, 200, store.cartPage());
    if (p === '/checkout') return page(req, res, 200, store.checkoutPage({ delivery: catalog.getDelivery() }));
    if ((m = /^\/order\/([A-Z]{1,5}-\d{4}-\d{4,})$/.exec(p))) {
      const order = orders.getOrderForCustomer(m[1], url.searchParams.get('t'));
      if (!order) return page(req, res, 404, store.errorPage(404, 'Order not found', 'Please use the link from your order confirmation, or contact us on WhatsApp with your order number.'));
      return page(req, res, 200, store.orderPage({ order, justPlaced: url.searchParams.get('placed') === '1' }), { 'Referrer-Policy': 'no-referrer' });
    }
    if (p === '/api/catalog') return send(req, res, 200, JSON.stringify({ products: catalog.publicCatalog(), delivery: catalog.publicDelivery() }), 'application/json; charset=utf-8', { 'Cache-Control': 'no-cache' });
    if ((m = /^\/media\/products\/([^/]+)$/.exec(p))) {
      const found = storage.resolve('product', m[1]);
      if (!found) return notFound(req, res);
      return serveFile(req, res, found, 'public, max-age=2592000, immutable');
    }
    if (p === '/robots.txt') {
      const base = SITE_URL();
      return send(req, res, 200, `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\nDisallow: /cart\nDisallow: /order/\nDisallow: /api/\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`, 'text/plain; charset=utf-8');
    }
    if (p === '/sitemap.xml') {
      const base = SITE_URL() || `http://${req.headers.host}`;
      const urls = ['/', '/menu', ...catalog.categories.map((c) => `/menu?category=${c.id}`), ...catalog.listProducts().map((x) => `/products/${x.slug}`)];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${(base + u).replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>`;
      return send(req, res, 200, xml, 'application/xml; charset=utf-8', { 'Cache-Control': 'public, max-age=3600' });
    }
    if (p === '/healthz') return json(res, 200, { ok: true });
    if (serveStatic(req, res, p)) return;
    return notFound(req, res);
  }

  if (req.method === 'POST' && p === '/api/orders') {
    if (!sameOrigin(req)) return json(res, 403, { error: 'Request blocked. Please reload the page and try again.' });
    if (!rateLimit(`order:${clientIp(req)}`, 8, 10 * 60 * 1000)) return json(res, 429, { error: 'Too many orders from this device in a short time. Please wait a few minutes, or order on WhatsApp.' });
    const { fields, files } = await parseBody(req, site.uploads.maxPaymentProofBytes + 256 * 1024);
    let input;
    try {
      input = JSON.parse(fields.order || '{}');
    } catch {
      return json(res, 400, { error: 'Something went wrong with your order details. Please reload the page and try again.' });
    }
    const file = files.screenshot;
    let proofError = null;
    if (file) {
      try {
        // Validate the file early so the customer sees a clear message.
        if (file.data.length > site.uploads.maxPaymentProofBytes) throw new HttpError(413, `Your payment screenshot is too large. Please upload a file under ${Math.round(site.uploads.maxPaymentProofBytes / 1048576)} MB.`);
      } catch (e) {
        proofError = e.message;
      }
    }
    try {
      if (proofError) throw new orders.ValidationError({ screenshot: proofError });
      const result = orders.createOrder(input, {
        hasScreenshot: !!file,
        saveProof: () => storage.savePaymentProof(file, site.uploads.maxPaymentProofBytes),
      });
      console.log(`[order] ${result.orderNumber} placed`);
      return json(res, 201, { orderNumber: result.orderNumber, url: `/order/${result.orderNumber}?t=${result.token}&placed=1` });
    } catch (e) {
      if (e instanceof orders.ValidationError) return json(res, 422, { error: e.message, fields: e.details });
      if (e instanceof HttpError) {
        // e.g. file type rejected by storage — attach to the screenshot field
        if (/screenshot/i.test(e.message)) return json(res, 422, { error: 'Please check your payment screenshot.', fields: { screenshot: e.message } });
        return json(res, e.status, { error: e.message });
      }
      throw e;
    }
  }
  return notFound(req, res);
}

// ------------------------------------------------------------------ routes: admin
async function adminRoutes(req, res, url) {
  const p = url.pathname;
  const hasAdmin = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n > 0;
  const adminHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

  if (p === '/admin/login') {
    if (!hasAdmin) return page(req, res, 200, admin.noAdminPage(), adminHeaders);
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return page(req, res, 403, admin.loginPage({ error: 'Request blocked. Please try again.' }), adminHeaders);
      const ip = clientIp(req);
      if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) return page(req, res, 429, admin.loginPage({ error: 'Too many login attempts. Please wait 15 minutes and try again.' }), adminHeaders);
      const { fields } = await parseBody(req, 16 * 1024);
      const user = auth.authenticate(fields.email, String(fields.password || ''));
      if (!user) return page(req, res, 401, admin.loginPage({ error: 'Incorrect email or password.', email: v.str(fields.email, 200) }), adminHeaders);
      return redirect(res, '/admin', 303, { 'Set-Cookie': auth.createSessionCookie(user.id) });
    }
    if (auth.getSession(req)) return redirect(res, '/admin');
    return page(req, res, 200, admin.loginPage({}), adminHeaders);
  }

  const session = auth.getSession(req);
  if (!session) {
    if (req.method === 'GET') return redirect(res, '/admin/login', 302);
    return page(req, res, 401, admin.loginPage({ error: 'Your session has expired. Please log in again.' }), adminHeaders);
  }
  const me = { ...session.admin, csrf: auth.csrfToken(session) };
  const by = session.admin.email;

  let fields = {};
  let files = {};
  if (req.method === 'POST') {
    if (!sameOrigin(req)) throw new HttpError(403, 'Request blocked.');
    ({ fields, files } = await parseBody(req, site.uploads.maxProductImageBytes + 64 * 1024));
    if (!auth.checkCsrf(session, fields._csrf)) throw new HttpError(403, 'Your form expired. Please go back, reload the page and try again.');
  }

  let m;
  if (p === '/admin/logout' && req.method === 'POST') return redirect(res, '/admin/login', 303, { 'Set-Cookie': auth.clearSessionCookie() });

  if ((p === '/admin' || p === '/admin/') && req.method === 'GET') {
    const filters = {
      q: v.str(url.searchParams.get('q') || '', 80),
      status: url.searchParams.get('status') || '',
      payment: url.searchParams.get('payment') || '',
      from: url.searchParams.get('from') || '',
      to: url.searchParams.get('to') || '',
    };
    const pageNo = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = 25;
    const result = orders.searchOrders({ ...filters, limit: pageSize, offset: (pageNo - 1) * pageSize });
    return page(req, res, 200, admin.dashboardPage({ admin: me, stats: orders.orderStats(), result, filters, page: pageNo, pageSize, flash: flashFrom(url) }), adminHeaders);
  }

  if ((m = /^\/admin\/orders\/(\d+)$/.exec(p)) && req.method === 'GET') {
    const order = orders.getOrderById(m[1]);
    if (!order) return notFound(req, res);
    return page(req, res, 200, admin.orderDetailPage({ admin: me, order, flash: flashFrom(url) }), adminHeaders);
  }
  if ((m = /^\/admin\/orders\/(\d+)\/status$/.exec(p)) && req.method === 'POST') {
    if (!orders.getOrderById(m[1])) return notFound(req, res);
    orders.updateOrderStatus(Number(m[1]), String(fields.status), fields.note, by);
    return redirect(res, `/admin/orders/${m[1]}?msg=status`);
  }
  if ((m = /^\/admin\/orders\/(\d+)\/payment$/.exec(p)) && req.method === 'POST') {
    if (!orders.getOrderById(m[1])) return notFound(req, res);
    orders.setPaymentStatus(Number(m[1]), String(fields.status), fields.note, by);
    return redirect(res, `/admin/orders/${m[1]}?msg=payment`);
  }
  if ((m = /^\/admin\/proofs\/([^/]+)$/.exec(p)) && req.method === 'GET') {
    const found = storage.resolve('proof', m[1]);
    if (!found) return notFound(req, res);
    return serveFile(req, res, found, 'private, no-store');
  }

  if (p === '/admin/products' && req.method === 'GET') {
    return page(req, res, 200, admin.productsPage({ admin: me, products: catalog.listProducts(), flash: flashFrom(url) }), adminHeaders);
  }
  if ((m = /^\/admin\/products\/(\d+)$/.exec(p))) {
    const product = catalog.getProductById(Number(m[1]));
    if (!product) return notFound(req, res);
    if (req.method === 'GET') return page(req, res, 200, admin.productEditPage({ admin: me, product, flash: flashFrom(url) }), adminHeaders);
    if (req.method === 'POST') {
      const ok = saveProduct(product, fields);
      return redirect(res, `/admin/products/${product.id}?msg=${ok ? 'saved' : 'invalid'}`);
    }
  }
  if ((m = /^\/admin\/products\/(\d+)\/toggle$/.exec(p)) && req.method === 'POST') {
    const field = { available: 'available', featured: 'featured', favorite: 'favorite' }[fields.field];
    if (field) db.prepare(`UPDATE products SET ${field} = 1 - ${field}, updated_at = datetime('now') WHERE id = ?`).run(Number(m[1]));
    return redirect(res, '/admin/products?msg=saved');
  }
  if ((m = /^\/admin\/products\/(\d+)\/image$/.exec(p)) && req.method === 'POST') {
    const product = catalog.getProductById(Number(m[1]));
    if (!product) return notFound(req, res);
    try {
      const saved = storage.saveProductImage(files.image, site.uploads.maxProductImageBytes);
      const old = product.image.startsWith('/media/products/') ? product.image.split('/').pop() : null;
      db.prepare("UPDATE products SET image = ?, updated_at = datetime('now') WHERE id = ?").run(`/media/products/${saved.name}`, product.id);
      if (old) storage.removeFile(storage.PRODUCT_DIR, old);
      return redirect(res, `/admin/products/${product.id}?msg=image`);
    } catch (e) {
      if (e instanceof HttpError) return redirect(res, `/admin/products/${product.id}?msg=imageerr`);
      throw e;
    }
  }

  if (p === '/admin/settings' && req.method === 'GET') {
    return page(req, res, 200, admin.settingsPage({ admin: me, delivery: catalog.getDelivery(), flash: flashFrom(url) }), adminHeaders);
  }
  if (p === '/admin/settings/delivery' && req.method === 'POST') {
    const ok = saveDelivery(fields);
    return redirect(res, `/admin/settings?msg=${ok ? 'saved' : 'invalid'}`);
  }
  if (p === '/admin/settings/password' && req.method === 'POST') {
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(session.admin.id);
    const np = String(fields.password || '');
    if (!auth.verifyPassword(String(fields.current || ''), user.password_hash) || np.length < 10) return redirect(res, '/admin/settings?msg=badpassword');
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(auth.hashPassword(np), user.id);
    return redirect(res, '/admin/settings?msg=password');
  }
  return notFound(req, res);
}

const arr = (x) => (x === undefined ? [] : [].concat(x));

function saveProduct(product, f) {
  const name = v.str(f.name, 80);
  const category = catalog.categories.some((c) => c.id === f.category) ? f.category : null;
  if (name.length < 2 || !category) return false;
  const ids = arr(f.v_id), labels = arr(f.v_label), sizes = arr(f.v_size), prices = arr(f.v_price), avail = arr(f.v_available), del = arr(f.v_delete);
  const rows = ids.map((id, i) => ({ id, label: v.str(labels[i], 40), size: sizes[i] === '' || sizes[i] === undefined ? null : Number(sizes[i]), price: prices[i] === '' ? null : Number(prices[i]), available: avail[i] === '1' ? 1 : 0, del: del[i] === '1' }));
  for (const r of rows) {
    if (r.id === 'new' && !r.label && r.price === null) continue;
    if (r.del) continue;
    if (!r.label || !Number.isInteger(r.price) || r.price < 0 || r.price > 10_000_000) return false;
    if (r.size !== null && (!Number.isFinite(r.size) || r.size < 0 || r.size > 1000)) return false;
  }
  const isCake = product.type === 'cake';
  const existingIds = new Set(product.variants.map((x) => String(x.id)));
  transaction(() => {
    db.prepare(`UPDATE products SET name=?, category=?, short_description=?, description=?, ingredients=?, image_alt=?,
      available=?, featured=?, favorite=?, updated_at=datetime('now') WHERE id=?`).run(
      name, category, v.str(f.short_description, 140), v.text(f.description, 1200), v.text(f.ingredients, 800), v.str(f.image_alt, 160) || name,
      f.available === '1' ? 1 : 0, f.featured === '1' ? 1 : 0, f.favorite === '1' ? 1 : 0, product.id);
    rows.forEach((r, i) => {
      if (r.id === 'new') {
        if (!r.label || r.price === null || r.del) return;
        db.prepare('INSERT INTO product_variants (product_id, label, weight_lbs, pieces, price, available, sort_order) VALUES (?,?,?,?,?,?,?)')
          .run(product.id, r.label, isCake ? r.size : null, isCake ? null : r.size, r.price, r.available, 100 + i);
      } else if (existingIds.has(r.id)) {
        if (r.del) db.prepare('DELETE FROM product_variants WHERE id = ? AND product_id = ?').run(Number(r.id), product.id);
        else db.prepare('UPDATE product_variants SET label=?, weight_lbs=?, pieces=?, price=?, available=?, sort_order=? WHERE id=? AND product_id=?')
          .run(r.label, isCake ? r.size : null, isCake ? null : r.size, r.price, r.available, i, Number(r.id), product.id);
      }
    });
    // keep weights sorted naturally
    if (isCake) {
      const vs = db.prepare('SELECT id FROM product_variants WHERE product_id = ? ORDER BY COALESCE(weight_lbs, 999), id').all(product.id);
      vs.forEach((x, i) => db.prepare('UPDATE product_variants SET sort_order = ? WHERE id = ?').run(i, x.id));
    }
  });
  return true;
}

function saveDelivery(f) {
  const ids = arr(f.a_id), names = arr(f.a_name), charges = arr(f.a_charge), active = arr(f.a_active), del = arr(f.a_delete);
  const rows = ids.map((id, i) => ({ id, name: v.str(names[i], 60), charge: charges[i] === '' || charges[i] === undefined ? null : Number(charges[i]), active: active[i] === '1' ? 1 : 0, del: del[i] === '1' }));
  for (const r of rows) {
    if (r.id === 'new' && !r.name && r.charge === null) continue;
    if (r.del) continue;
    if (!r.name || !Number.isInteger(r.charge) || r.charge < 0 || r.charge > 1_000_000) return false;
  }
  transaction(() => {
    db.prepare("UPDATE delivery_settings SET home_delivery_enabled=?, pickup_enabled=?, pickup_note=?, updated_at=datetime('now') WHERE id=1")
      .run(f.home_delivery_enabled === '1' ? 1 : 0, f.pickup_enabled === '1' ? 1 : 0, v.text(f.pickup_note, 300));
    rows.forEach((r, i) => {
      if (r.id === 'new') {
        if (r.name && r.charge !== null) db.prepare('INSERT INTO delivery_areas (name, charge, active, sort_order) VALUES (?,?,?,?)').run(r.name, r.charge, r.active, i);
      } else if (r.del) db.prepare('DELETE FROM delivery_areas WHERE id = ?').run(Number(r.id));
      else db.prepare('UPDATE delivery_areas SET name=?, charge=?, active=?, sort_order=? WHERE id=?').run(r.name, r.charge, r.active, i, Number(r.id));
    });
  });
  return true;
}

// ------------------------------------------------------------------ server
const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const isApi = url.pathname.startsWith('/api/');
  try {
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) await adminRoutes(req, res, url);
    else await storefront(req, res, url);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status >= 500) console.error('[error]', req.method, url.pathname, err);
    if (res.headersSent) return res.end();
    const message = status >= 500 ? 'Something went wrong on our side. Please try again, or order on WhatsApp.' : err.message;
    if (isApi) return json(res, status, { error: message });
    page(req, res, status, store.errorPage(status, status >= 500 ? 'Something went wrong' : 'Request problem', message));
  }
});
server.requestTimeout = 60_000;
server.headersTimeout = 20_000;

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Sohni Bakers is running → http://localhost:${PORT}`);
    const n = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n;
    if (!n) console.log('No admin account yet — run "npm run admin:create" to create one.');
  });
  const shutdown = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { server };
