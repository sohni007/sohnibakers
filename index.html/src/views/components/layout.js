'use strict';
/** Page shell: <head>/SEO, Navbar, Footer, CartDrawer, floating WhatsApp button. */
const { html, raw, jsonScript } = require('../html');
const { icon } = require('./icons');
const site = require('../../config/site');
const { waLink } = require('../../lib/whatsapp');

const SITE_URL = () => (process.env.SITE_URL || '').replace(/\/$/, '');
const abs = (p) => (SITE_URL() ? SITE_URL() + p : p);
const ASSET_V = String(Date.now()).slice(-7); // cache-busting per deploy

const NAV = [
  ['Home', '/', 'home'],
  ['Menu', '/menu', 'menu'],
  ['Cakes', '/menu?category=cakes', 'cakes'],
  ['Brownies', '/menu?category=brownies', 'brownies'],
  ['Donuts', '/menu?category=donuts', 'donuts'],
  ['About Us', '/#about', 'about'],
  ['FAQ', '/#faq', 'faq'],
  ['Contact', '/#contact', 'contact'],
];

function Navbar(active) {
  return html`
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" data-header>
  <div class="container header-inner">
    <a class="logo" href="/" aria-label="Sohni Bakers — home">
      <span class="logo-mark" aria-hidden="true">${icon('cake', { size: 22 })}</span>
      <span class="logo-text">Sohni <em>Bakers</em></span>
    </a>
    <nav class="main-nav" id="main-nav" aria-label="Main">
      <ul>
        ${NAV.map(([label, href, key]) => html`<li><a href="${href}" ${active === key ? raw('aria-current="page"') : ''}>${label}</a></li>`)}
      </ul>
      <div class="mobile-nav-cta">
        <a class="btn btn-primary btn-block" href="/menu">Order Now</a>
        <a class="btn btn-whatsapp btn-block" href="${waLink('Hello Sohni Bakers, I would like to place an order.')}" target="_blank" rel="noopener">${icon('whatsapp')} Order on WhatsApp</a>
        <a class="mobile-nav-phone" href="tel:${site.contact.phoneHref}">${icon('phone', { size: 18 })} ${site.contact.phoneDisplay}</a>
      </div>
    </nav>
    <div class="header-actions">
      <button class="icon-btn cart-btn" type="button" data-cart-open aria-label="Open cart">
        ${icon('bag', { size: 22 })}<span class="cart-count" data-cart-count hidden>0</span>
      </button>
      <a class="btn btn-primary btn-sm header-order" href="/menu">Order Now</a>
      <button class="icon-btn nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" data-nav-toggle aria-label="Open menu">
        <span class="nav-toggle-open">${icon('menu', { size: 24 })}</span><span class="nav-toggle-close">${icon('close', { size: 24 })}</span>
      </button>
    </div>
  </div>
</header>`;
}

function Footer() {
  const socials = [
    ['Facebook', 'facebook', site.social.facebook],
    ['Instagram', 'instagram', site.social.instagram],
    ['TikTok', 'tiktok', site.social.tiktok],
  ];
  return html`
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="logo logo-light" href="/"><span class="logo-mark" aria-hidden="true">${icon('cake', { size: 22 })}</span><span class="logo-text">Sohni <em>Bakers</em></span></a>
      <p class="footer-tagline">${site.brand.tagline}</p>
      <p class="footer-small">Homemade cakes, brownies &amp; donuts — ${site.brand.province}, ${site.brand.country}.</p>
      <div class="socials" aria-label="Social media">
        ${socials.map(([name, ic, url]) => url
          ? html`<a class="social" href="${url}" target="_blank" rel="noopener" aria-label="${name}">${icon(ic, { size: 18 })}</a>`
          : html`<span class="social is-placeholder" title="${name} — coming soon" aria-label="${name} (coming soon)">${icon(ic, { size: 18 })}</span>`)}
        <a class="social" href="${waLink('')}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('whatsapp', { size: 18 })}</a>
      </div>
    </div>
    <div>
      <h2 class="footer-heading">Quick Links</h2>
      <ul class="footer-links">
        <li><a href="/">Home</a></li><li><a href="/menu">Menu</a></li><li><a href="/#about">About</a></li><li><a href="/#faq">FAQ</a></li><li><a href="/#contact">Contact</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-heading">Order</h2>
      <ul class="footer-links">
        <li><a href="tel:${site.contact.phoneHref}">${icon('phone', { size: 16 })} ${site.contact.phoneDisplay}</a></li>
        <li><a href="${waLink('Hello Sohni Bakers, I would like to place an order.')}" target="_blank" rel="noopener">${icon('whatsapp', { size: 16 })} WhatsApp us</a></li>
        <li><a href="/cart">${icon('bag', { size: 16 })} Your cart</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-heading">Payment Methods</h2>
      <ul class="pay-chips">
        ${site.payments.map((p) => html`<li>${p.name}</li>`)}
      </ul>
      <p class="footer-small">Manual transfer — payment is verified by our team before your order is confirmed.</p>
    </div>
  </div>
  <div class="container footer-bottom">
    <p>© 2026 Sohni Bakers. All Rights Reserved.</p>
  </div>
</footer>`;
}

function CartDrawer() {
  return html`
<div class="drawer-backdrop" data-cart-backdrop hidden></div>
<aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" data-cart-drawer tabindex="-1" hidden>
  <div class="drawer-head">
    <h2 id="cart-title">Your Cart</h2>
    <button class="icon-btn" type="button" data-cart-close aria-label="Close cart">${icon('close', { size: 22 })}</button>
  </div>
  <div class="drawer-body" data-cart-items aria-live="polite"><p class="muted center pad">Loading…</p></div>
  <div class="drawer-foot" data-cart-foot hidden>
    <dl class="totals">
      <div><dt>Subtotal</dt><dd data-cart-subtotal>—</dd></div>
      <div><dt>Delivery Charges</dt><dd data-cart-delivery>—</dd></div>
      <div class="grand"><dt>Grand Total</dt><dd data-cart-total>—</dd></div>
    </dl>
    <p class="tiny muted" data-cart-delivery-note></p>
    <a class="btn btn-primary btn-block btn-lg" href="/checkout">Proceed to Checkout ${icon('arrowRight', { size: 18 })}</a>
    <a class="btn btn-ghost btn-block" href="/cart">View full cart</a>
  </div>
</aside>
<div class="toast" role="status" aria-live="polite" data-toast hidden></div>`;
}

function PriceNotice() {
  if (!site.pricing.showPlaceholderPriceNotice) return '';
  return html`<div class="price-notice" role="note">${icon('info', { size: 16 })}<span>${site.pricing.placeholderNoticeText}</span></div>`;
}

/**
 * @param {object} o
 *  title, description, path (canonical), active, body, jsonLd[], noindex, ogImage, scripts[], bodyClass
 */
function Layout(o) {
  const title = o.title ? `${o.title} | Sohni Bakers` : site.seo.title;
  const description = o.description || site.seo.description;
  const canonical = o.path ? abs(o.path) : '';
  const ogImage = abs(o.ogImage || '/images/og-image.png');
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Bakery',
      name: site.brand.name,
      description: site.seo.description,
      telephone: site.contact.phoneHref,
      url: SITE_URL() || undefined,
      image: ogImage,
      priceRange: 'PKR',
      servesCuisine: 'Bakery',
      areaServed: { '@type': 'State', name: 'Punjab, Pakistan' },
      address: { '@type': 'PostalAddress', addressRegion: site.brand.province, addressCountry: 'PK' },
    },
    ...(o.jsonLd || []),
  ];
  return '<!doctype html>' + html`
<html lang="en-PK">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
${canonical ? html`<link rel="canonical" href="${canonical}">` : ''}
${o.noindex ? raw('<meta name="robots" content="noindex, nofollow">') : ''}
<meta name="theme-color" content="#3b2418">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sohni Bakers">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
${canonical ? html`<meta property="og:url" content="${canonical}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/lora-var.woff" as="font" type="font/woff" crossorigin>
<link rel="preload" href="/fonts/inter-regular.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/css/styles.css?v=${ASSET_V}">
${o.noindex ? '' : html`<script type="application/ld+json">${jsonScript(ld)}</script>`}
</head>
<body class="${o.bodyClass || ''}">
${Navbar(o.active)}
<main id="main" tabindex="-1">${o.body}</main>
${Footer()}
${CartDrawer()}
<a class="wa-float" href="${waLink('Hello Sohni Bakers, I would like to place an order.')}" target="_blank" rel="noopener" aria-label="Order on WhatsApp">${icon('whatsapp', { size: 28 })}<span>Order on WhatsApp</span></a>
<script src="/js/app.js?v=${ASSET_V}" defer></script>
${(o.scripts || []).map((s) => html`<script src="${s}?v=${ASSET_V}" defer></script>`)}
</body>
</html>`;
}

module.exports = { Layout, PriceNotice, abs, SITE_URL, ASSET_V };
