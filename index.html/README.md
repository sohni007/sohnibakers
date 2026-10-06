# Sohni Bakers — Online Bakery Website

A complete, mobile-first e-commerce website for **Sohni Bakers**, a homemade bakery in Punjab, Pakistan — cakes (sold by weight in **pounds**), brownies and donuts, with a shopping cart, checkout, manual JazzCash / EasyPaisa / Bank Transfer payment with screenshot upload, WhatsApp ordering, and a password-protected admin dashboard.

**No npm install needed.** The whole site runs on Node.js alone (built-in web server, built-in SQLite database, built-in crypto). That keeps it fast, cheap to host, and free of third-party packages that need updating.

---

## 1. What's included

| Area | Features |
| --- | --- |
| **Storefront** | Home (hero, highlights, categories, Best Sellers, Freshly Made, Customer Favorites, Special Occasions, reviews, About, FAQ, Contact), Menu with search + category filters, product pages at `/products/<name>` |
| **Products** | All 27 products, each with its own image, description, and price options. Cakes: 1–5 lb weight selector with live price update. Brownies/Donuts: box sizes |
| **Cart** | Slide-out cart + full cart page, quantity +/–, remove, subtotal / delivery / grand total, kept on the device for 7 days |
| **Checkout** | Customer info, Home Delivery or Pickup, delivery area (with its charge), Pakistani address fields, date & time, order notes, payment method, account details, payment amount, Transaction ID, screenshot upload, confirmation tick |
| **Payments** | Manual only (not a payment gateway). Every order is saved as **Payment Verification Pending** until an admin verifies it |
| **Confirmation** | Order number (`SB-2026-0001`), all order details, payment status, progress tracker, pre-filled WhatsApp message, call button |
| **WhatsApp** | Floating button, product-page "Order on WhatsApp" with weight/qty filled in, full order message after checkout |
| **Admin** | Login, orders list with search/filter, order detail, view payment screenshot, verify/reject payment, update order status, edit products/prices/weights/images/availability/Best Seller/Favourite, delivery areas & charges, pickup on/off, change password |
| **SEO** | Titles/meta descriptions, Open Graph image, canonical URLs, `sitemap.xml`, `robots.txt`, Bakery / Product / FAQ / Breadcrumb structured data, descriptive alt text |
| **Quality** | Mobile-first, keyboard accessible, visible focus, labelled form fields, friendly error messages, gzip, lazy-loaded images, self-hosted fonts, strict security headers |

---

## 2. Quick start (on your computer)

**Requirement:** [Node.js](https://nodejs.org) **version 22.5 or newer** (22 LTS or 24 recommended). Check with `node -v`.

```bash
cd sohni-bakers
cp .env.example .env          # Windows: copy .env.example .env
```

Open `.env` and, for testing on your own computer, set `NODE_ENV=development`.

```bash
npm run admin:create          # choose the admin email + password
npm start                     # → http://localhost:3000
```

- Website: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>

The database is created automatically on first start and filled with all 27 products.

Run the automated tests any time with `npm test`.

---

## 3. Things to update before going live

> These were **not provided**, so the site uses clearly marked placeholders. Nothing has been invented.

1. **Prices** — every price is a placeholder. Update them in **Admin → Products** (click a product, edit the price boxes, Save).
2. **Delivery charges** — "Local Delivery: PKR 200" and "Other Areas in Punjab: PKR 500" are placeholders. Update/rename/add areas in **Admin → Delivery & Settings**.
3. **Sample-price notice** — once your real prices are in, open `src/config/site.js` and set `showPlaceholderPriceNotice: false`, then restart.
4. **Product photos** — each product has its own illustrated image. Replace them with real photos in **Admin → Products → (product) → Upload image** (landscape 4:3, about 1200 × 900 px looks best).
5. **Best Sellers / Customer Favorites** — chosen as a starting point only. Toggle them in **Admin → Products**.
6. **Social media** — add your Facebook / Instagram / TikTok links in `src/config/site.js` → `social` (empty = shown as "coming soon").
7. **Ingredients** — leave empty to show "available on request", or fill in per product in the admin.
8. **Address / map** — the bakery is home-based, so no address is shown. If you want a map later, fill `location` in `src/config/site.js`.

---

## 4. Managing the bakery (Admin Dashboard)

Go to `/admin` and log in.

**Daily order flow**

1. A new order arrives as **Payment Verification Pending** (the dashboard shows "Payments to verify").
2. Open the order → look at the payment screenshot and Transaction ID → check your JazzCash / EasyPaisa / bank app.
3. Click **Mark Payment Verified** (status becomes **Payment Verified**) — or **Reject Payment** and contact the customer.
4. Move the order along: **Preparing → Ready → Out for Delivery → Delivered** (or **Cancelled**).
5. The customer can open their confirmation link at any time to see the current status.

All statuses: New Order · Payment Verification Pending · Payment Verified · Preparing · Ready · Out for Delivery · Delivered · Cancelled.

**Products:** change name, category, descriptions, ingredients, image, alt text, availability, Best Seller, Customer Favourite, and every weight/box price. Add a new weight (e.g. 6 Pounds) using the "New" row. Price changes never affect orders already placed.

**Prefer editing a file?** All products are also defined in `src/config/products.js`. Edit it and run `npm run catalog:sync` to copy it into the database (this overwrites the database values for those products).

**Payment account details** live in `src/config/site.js` → `payments`. They are shown only at the checkout payment step and on the customer's own order confirmation page.

**Customer reviews:** the Reviews section shows clearly-marked placeholders until real reviews exist. Real reviews are stored in the `reviews` table; to publish one:

```bash
node -e "require('./src/lib/db').db.prepare('INSERT INTO reviews (customer_name, rating, text, approved) VALUES (?,?,?,1)').run('Customer name', 5, 'Their review text')"
```

---

## 5. Deployment

The site needs a host that runs **Node.js 22+** with a **persistent disk** (the database and uploaded screenshots are files). Always use **HTTPS**.

> Serverless hosts such as Vercel or Netlify are **not** suitable as-is, because they don't keep files between requests.

### Option A — VPS (recommended; e.g. a small Ubuntu server)

```bash
# 1. Install Node.js 22 (as root or with sudo)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs nginx

# 2. Upload the project to /var/www/sohni-bakers, then:
cd /var/www/sohni-bakers
cp .env.example .env && nano .env      # set SITE_URL, SESSION_SECRET, NODE_ENV=production, TRUST_PROXY=1
npm run admin:create
```

Keep it running with **systemd** — create `/etc/systemd/system/sohni-bakers.service`:

```ini
[Unit]
Description=Sohni Bakers website
After=network.target

[Service]
WorkingDirectory=/var/www/sohni-bakers
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server.js
Restart=always
User=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /var/www/sohni-bakers
sudo systemctl enable --now sohni-bakers
```

**Nginx** (`/etc/nginx/sites-available/sohni-bakers`):

```nginx
server {
  server_name sohnibakers.pk www.sohnibakers.pk;
  client_max_body_size 8m;            # allows 5 MB payment screenshots
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sohni-bakers /etc/nginx/sites-enabled/
sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx   # free HTTPS
```

### Option B — Railway / Render / Fly.io

- Start command: `npm start` (Node 22+).
- Add a **persistent volume/disk** mounted at e.g. `/data`, and set `DATA_DIR=/data/db` and `STORAGE_DIR=/data/storage`.
- Set the environment variables from `.env.example` (`SITE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `TRUST_PROXY=1`, and `ADMIN_EMAIL` + `ADMIN_PASSWORD` for the first start — remove the password after logging in).

### Option C — Docker

```bash
docker build -t sohni-bakers .
docker run -d --name sohni-bakers -p 3000:3000 -v sohni-data:/data \
  -e SITE_URL=https://sohnibakers.pk -e SESSION_SECRET=<long-random> -e TRUST_PROXY=1 \
  -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD=<strong-password> sohni-bakers
```

### Backups

Everything important is in two folders: `data/` (orders, products, settings) and `storage/` (payment screenshots, uploaded product photos). Back them up regularly, e.g. a daily copy:

```bash
sqlite3 data/sohni-bakers.db ".backup 'backup-$(date +%F).db'"   # or simply copy the data/ folder while the site is stopped
```

After going live, submit `https://<your-domain>/sitemap.xml` in Google Search Console.

---

## 6. Security notes

- Admin passwords are hashed with **scrypt**; never stored in plain text. No credentials are in the website code.
- Admin sessions are signed, HttpOnly, SameSite=Strict cookies (HTTPS-only in production) with CSRF tokens on every admin form; login attempts are rate-limited.
- **The server calculates every price and total** from the database — prices from the browser are ignored.
- Payment screenshots are stored outside the public folder and are only viewable by a logged-in admin. Files are checked by their real content (JPG/PNG/WEBP/PDF only, max 5 MB).
- Each order confirmation page is protected by a private random link token, so one customer can't view another's order by guessing order numbers.
- Strict Content-Security-Policy and security headers on every page; all customer input is validated on the server.

---

## 7. Project structure

```
server.js                 web server + all routes (storefront, API, admin)
src/config/site.js        brand, contact, payment accounts, starting delivery settings
src/config/products.js    the central product catalog (27 products, prices, weights)
src/lib/db.js             database schema (SQLite) + seeding
src/lib/orders.js         order creation, server-side pricing, statuses, order numbers
src/lib/catalog.js        product & delivery queries
src/lib/auth.js           admin passwords, sessions, CSRF
src/lib/storage.js        uploads (payment proofs, product images)
src/lib/validate.js       input validation (Pakistani mobile numbers, dates…)
src/lib/whatsapp.js       WhatsApp links & order message
src/views/components/     Navbar, Footer, CartDrawer, ProductCard, ProductGrid, Hero, FAQ, Reviews, Contact…
src/views/pages/store.js  Home, Menu, Product, Cart, Checkout, Order Confirmation pages
src/views/admin/pages.js  Admin dashboard pages
public/                   CSS, JavaScript, fonts, product images
scripts/                  create-admin, catalog sync, image generator
tests/                    automated tests (npm test)
data/, storage/           created at runtime — database and uploads (back these up)
```

**Database tables:** `products`, `product_variants`, `customers` (users), `orders`, `order_items`, `payments`, `order_status_history`, `delivery_settings`, `delivery_areas`, `reviews`, `admin_users`, `counters`.

---

## 8. Support

Bakery contact used on the website: **0316 2443843** (phone & WhatsApp).
