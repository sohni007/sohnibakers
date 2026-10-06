'use strict';
/** Homepage / shared content sections: Hero, Highlights, Occasions, Reviews, About, FAQ, Contact. */
const { html } = require('../html');
const { icon } = require('./icons');
const site = require('../../config/site');
const { waLink } = require('../../lib/whatsapp');

function Hero() {
  return html`
<section class="hero" aria-labelledby="hero-title">
  <div class="container hero-grid">
    <div class="hero-copy reveal">
      <p class="eyebrow">Homemade bakery · ${site.brand.province}, Pakistan</p>
      <h1 id="hero-title" class="hero-title">Sohni <em>Bakers</em></h1>
      <p class="hero-tagline">${site.brand.tagline}</p>
      <p class="hero-text">${site.brand.shortDescription}</p>
      <div class="hero-ctas">
        <a class="btn btn-primary btn-lg" href="/menu">Order Now ${icon('arrowRight', { size: 18 })}</a>
        <a class="btn btn-outline btn-lg" href="/menu#catalog">View Our Menu</a>
      </div>
      <div class="hero-contact">
        <a class="btn btn-whatsapp" href="${waLink('Hello Sohni Bakers, I would like to place an order.')}" target="_blank" rel="noopener">${icon('whatsapp')} Order on WhatsApp</a>
        <a class="hero-phone" href="tel:${site.contact.phoneHref}">${icon('phone', { size: 18 })} <span>Call us</span> <strong>${site.contact.phoneDisplay}</strong></a>
      </div>
    </div>
    <div class="hero-art reveal">
      <div class="hero-arch">
        <img src="/images/hero-cake.svg" alt="A cream cake with caramel drip, strawberries and cherries on a cake stand, with a donut and brownie" width="680" height="470" fetchpriority="high">
      </div>
      <p class="hero-stamp" aria-hidden="true"><span>Freshly</span><span>baked</span><span>to order</span></p>
    </div>
  </div>
</section>`;
}

const HIGHLIGHTS = [
  ['whisk', 'Freshly Homemade', 'Freshly prepared with care and quality ingredients.'],
  ['heart', 'Made with Love', 'Every order is prepared specially for our customers.'],
  ['sparkle', 'Premium Taste', 'Unique flavours and delicious combinations.'],
  ['clock', 'Freshly Prepared', 'Products are prepared fresh for your order.'],
];

function Highlights() {
  return html`
<section class="section highlights" aria-label="Why Sohni Bakers">
  <div class="container highlight-grid">
    ${HIGHLIGHTS.map(([ic, t, d]) => html`<div class="highlight reveal"><span class="highlight-icon">${icon(ic, { size: 24 })}</span><h3>${t}</h3><p>${d}</p></div>`)}
  </div>
</section>`;
}

function SectionHead(eyebrow, title, text, id) {
  return html`<div class="section-head reveal"><p class="eyebrow">${eyebrow}</p><h2 ${id ? html`id="${id}"` : ''}>${title}</h2>${text ? html`<p class="section-sub">${text}</p>` : ''}</div>`;
}

function FreshlyMade() {
  return html`
<section class="section fresh" aria-labelledby="fresh-title">
  <div class="container fresh-grid">
    <div class="fresh-art reveal"><img src="/images/products/dream-cake.svg" alt="Layered dream cake with chocolate, cream and custard layers" width="800" height="600" loading="lazy"></div>
    <div class="fresh-copy reveal">
      <p class="eyebrow">Freshly made</p>
      <h2 id="fresh-title">Baked fresh, <em>just for you</em></h2>
      <p>We don't keep shelves full of ready-made cakes. Your cake, brownies or donuts are prepared fresh for your order, in our home kitchen, with care in every step.</p>
      <ol class="steps">
        <li><span>1</span><div><strong>You place your order</strong><p>Choose your treats, cake weight and delivery date.</p></div></li>
        <li><span>2</span><div><strong>We confirm your payment</strong><p>Our team checks your payment and confirms on WhatsApp.</p></div></li>
        <li><span>3</span><div><strong>We bake it fresh</strong><p>Your order is prepared fresh and made ready for delivery or pickup.</p></div></li>
      </ol>
    </div>
  </div>
</section>`;
}

function Occasions() {
  return html`
<section class="section occasions" aria-labelledby="occasions-title">
  <div class="container">
    ${SectionHead('Order for special occasions', 'Make Your Celebration Sweeter', 'From birthdays to mehndi nights, tell us about your occasion and add your special message in the order notes.', 'occasions-title')}
    <ul class="occasion-list reveal">
      ${site.occasions.map((o) => html`<li>${o}</li>`)}
    </ul>
    <div class="center reveal">
      <a class="btn btn-primary" href="/menu?category=cakes">Choose a Cake</a>
      <a class="btn btn-whatsapp" href="${waLink('Hello Sohni Bakers, I would like to order a cake for a special occasion.')}" target="_blank" rel="noopener">${icon('whatsapp')} Discuss your event</a>
    </div>
  </div>
</section>`;
}

function Reviews(reviews) {
  const has = reviews && reviews.length > 0;
  return html`
<section class="section reviews" aria-labelledby="reviews-title">
  <div class="container">
    ${SectionHead('Kind words', 'Customer Reviews', has ? '' : 'We are collecting reviews from our customers — yours could be the first one here.', 'reviews-title')}
    <div class="review-grid">
      ${has
        ? reviews.map((r) => html`<figure class="review reveal"><div class="stars" aria-label="${r.rating} out of 5 stars">${Array.from({ length: 5 }, (_, i) => icon('star', { size: 16, cls: i < r.rating ? 'on' : '' }))}</div><blockquote>${r.text}</blockquote><figcaption>— ${r.customer_name}</figcaption></figure>`)
        : [1, 2, 3].map(() => html`<figure class="review is-placeholder reveal"><span class="placeholder-tag">Placeholder</span><div class="stars" aria-hidden="true">${Array.from({ length: 5 }, () => icon('star', { size: 16 }))}</div><blockquote>Your review could appear here.</blockquote><figcaption>— Sohni Bakers customer</figcaption></figure>`)}
    </div>
    <div class="center reveal"><a class="btn btn-ghost" href="${waLink('Hello Sohni Bakers, I would like to share a review of my order:')}" target="_blank" rel="noopener">${icon('whatsapp', { size: 18 })} Share your review</a></div>
  </div>
</section>`;
}

function About() {
  return html`
<section class="section about" id="about" aria-labelledby="about-title">
  <div class="container about-grid">
    <div class="about-copy reveal">
      <p class="eyebrow">Our story</p>
      <h2 id="about-title">About Sohni Bakers</h2>
      <p>Sohni Bakers is a homemade bakery dedicated to creating fresh, delicious and unique cakes, brownies and donuts. Every product is prepared with care using quality ingredients and a passion for great taste.</p>
      <p>From classic cakes to rich chocolate desserts, caramel creations, brownies and donuts, Sohni Bakers brings homemade sweetness directly to your doorstep.</p>
      <p class="brand-message">${site.brand.brandMessage}</p>
    </div>
    <div class="about-art reveal">
      <img src="/images/products/strawberry-cake.svg" alt="Strawberry cream cake decorated with strawberries" width="800" height="600" loading="lazy">
      <img src="/images/products/brownie-cup.svg" alt="Brownie cups topped with chocolate" width="800" height="600" loading="lazy">
    </div>
  </div>
</section>`;
}

const FAQS = [
  ['Do you offer different cake weights?', 'Yes. Cake weights can be selected in pounds — from 1 pound up to 5 pounds. The price updates automatically when you choose a weight.'],
  ['How can I pay?', 'JazzCash, EasyPaisa and Bank Transfer are available. Account details are shown on the payment step of checkout.'],
  ['Can I order through WhatsApp?', 'Yes. Tap any "Order on WhatsApp" button and your order details will be ready to send to us on WhatsApp.'],
  ['Can I request a special message on my cake?', 'Yes, customers can add special instructions during checkout — for example "Happy Birthday Ali", "Less cream" or "Add candles".'],
  ['Do you offer home delivery?', 'Yes, delivery options can be selected during checkout based on the available delivery areas. Pickup is also available when enabled.'],
  ['Can I order for a specific date?', 'Customers can request a delivery date during checkout, subject to availability. We will confirm with you on WhatsApp.'],
  ['How is payment verified?', 'For manual payments, customers upload payment proof and the bakery verifies the payment before confirming the order. Until then, your order shows "Payment Verification Pending".'],
];

function FAQ() {
  return html`
<section class="section faq" id="faq" aria-labelledby="faq-title">
  <div class="container narrow">
    ${SectionHead('Questions', 'Frequently Asked Questions', '', 'faq-title')}
    <div class="faq-list">
      ${FAQS.map(([q, a]) => html`<details class="faq-item reveal"><summary><h3>${q}</h3><span class="faq-icon" aria-hidden="true">${icon('plus', { size: 18 })}</span></summary><p>${a}</p></details>`)}
    </div>
  </div>
</section>`;
}

function Contact() {
  return html`
<section class="section contact" id="contact" aria-labelledby="contact-title">
  <div class="container">
    <div class="contact-card reveal">
      <div class="contact-copy">
        <p class="eyebrow">Get in touch</p>
        <h2 id="contact-title">Contact Sohni Bakers</h2>
        <p>Have a question, a custom cake idea or a big order for an event? Call or WhatsApp us — we would love to help.</p>
        <p class="contact-number"><span>Phone / WhatsApp</span><a href="tel:${site.contact.phoneHref}">${site.contact.phoneDisplay}</a></p>
        ${site.contact.email ? html`<p class="contact-email"><a href="mailto:${site.contact.email}">${site.contact.email}</a></p>` : ''}
        <div class="contact-ctas">
          <a class="btn btn-light" href="tel:${site.contact.phoneHref}">${icon('phone', { size: 18 })} Call Now</a>
          <a class="btn btn-whatsapp" href="${waLink('Hello Sohni Bakers, I would like to place an order.')}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>
          <a class="btn btn-caramel" href="/menu">${icon('bag', { size: 18 })} Order Now</a>
        </div>
      </div>
      ${site.location.mapEmbedUrl
        ? html`<div class="contact-map"><iframe title="Sohni Bakers location on Google Maps" src="${site.location.mapEmbedUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>${site.location.address ? html`<p>${site.location.address}</p>` : ''}</div>`
        : html`<div class="contact-note"><span class="highlight-icon">${icon('home', { size: 24 })}</span><p><strong>A home-based bakery</strong>Home delivery is available across our delivery areas, and pickup details are shared on WhatsApp after your order is confirmed.</p></div>`}
    </div>
  </div>
</section>`;
}

module.exports = { Hero, Highlights, SectionHead, FreshlyMade, Occasions, Reviews, About, FAQ, FAQS, Contact };
