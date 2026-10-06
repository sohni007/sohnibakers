'use strict';
const { html } = require('../html');
const { icon } = require('./icons');
const { pkr } = require('../../lib/validate');
const { categoryName } = require('../../lib/catalog');

const optionWord = (p) => (p.type === 'cake' ? 'weight' : 'box size');

function optionsSummary(p) {
  const live = p.variants.filter((v) => v.available);
  if (!live.length) return '';
  if (p.type === 'cake') {
    const lbs = live.map((v) => v.weight_lbs).filter(Boolean);
    return `${Math.min(...lbs)}–${Math.max(...lbs)} lb`;
  }
  return live.map((v) => v.pieces).filter(Boolean).join(' / ') + ' pcs';
}

function ProductCard(p, { headingLevel = 3, eager = false } = {}) {
  const H = `h${headingLevel}`;
  const badge = !p.orderable ? 'Currently unavailable' : p.featured ? 'Best Seller' : p.category === 'signature' ? 'Signature' : '';
  return html`
<article class="product-card${p.orderable ? '' : ' is-unavailable'}" data-product data-name="${p.name.toLowerCase()}" data-category="${p.category}" data-type="${p.type}">
  <a class="pc-media" href="/products/${p.slug}" tabindex="-1" aria-hidden="true">
    <img src="${p.image}" alt="${p.image_alt}" width="800" height="600" ${eager ? '' : 'loading="lazy"'} decoding="async">
    ${badge ? html`<span class="badge ${p.orderable ? '' : 'badge-muted'}">${badge}</span>` : ''}
  </a>
  <div class="pc-body">
    <p class="pc-cat">${categoryName(p.category)}</p>
    ${html([`<${H} class="pc-title">`, `</${H}>`], html`<a href="/products/${p.slug}">${p.name}</a>`)}
    <p class="pc-desc">${p.short_description}</p>
    <div class="pc-meta">
      <p class="pc-price">${p.fromPrice !== null ? html`<span class="from">From</span> ${pkr(p.fromPrice)}` : 'Price on request'}</p>
      <p class="pc-sizes">${optionsSummary(p)}</p>
    </div>
    ${p.orderable ? html`
    <form class="pc-add" data-quick-add novalidate>
      <input type="hidden" name="product" value="${p.id}">
      <label class="sr-only" for="qa-${p.id}">Select ${p.type === 'cake' ? 'cake weight' : 'box size'} for ${p.name}</label>
      <select id="qa-${p.id}" name="variant" class="select select-sm" required>
        <option value="">Select ${optionWord(p)}</option>
        ${p.variants.filter((v) => v.available).map((v) => html`<option value="${v.id}">${v.label} — ${pkr(v.price)}</option>`)}
      </select>
      <p class="field-error" data-error hidden></p>
      <div class="pc-actions">
        <a class="btn btn-ghost btn-sm" href="/products/${p.slug}">View Details</a>
        <button class="btn btn-primary btn-sm" type="submit">${icon('plus', { size: 16 })} Add to Cart</button>
      </div>
    </form>` : html`
    <div class="pc-actions">
      <a class="btn btn-ghost btn-sm btn-block" href="/products/${p.slug}">View Details</a>
    </div>`}
  </div>
</article>`;
}

const ProductGrid = (products, opts = {}) => html`<div class="product-grid${opts.compact ? ' is-compact' : ''}">${products.map((p, i) => ProductCard(p, { ...opts, eager: opts.eager && i < 2 }))}</div>`;

module.exports = { ProductCard, ProductGrid, optionsSummary };
