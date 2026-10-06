/**
 * ============================================================
 *  SOHNI BAKERS — SITE SETTINGS
 * ============================================================
 *  Edit this file to change brand details, contact numbers,
 *  payment instructions and the *starting* delivery settings.
 *
 *  After the first start, delivery charges / areas live in the
 *  database and are edited from the Admin Dashboard
 *  (Admin → Delivery Settings). Products & prices: see products.js.
 * ============================================================
 */

module.exports = {
  brand: {
    name: 'Sohni Bakers',
    tagline: 'Freshly Baked. Homemade with Love.',
    shortDescription:
      'Delicious homemade cakes, brownies and donuts, freshly prepared with quality ingredients and lots of love.',
    brandMessage: 'Freshly baked. Homemade with love. Made specially for you.',
    province: 'Punjab',
    country: 'Pakistan',
  },

  contact: {
    phoneDisplay: '0316 2443843',
    phoneHref: '+923162443843', // used for tel: links
    whatsappNumber: '923162443843', // international format, no "+" (used for wa.me links)
    email: '', // optional — leave empty to hide
  },

  /**
   * Physical location. Sohni Bakers is home-based, so this is empty.
   * If you add an address later, fill both fields and a Google Maps
   * section will appear automatically in the Contact section.
   *   mapEmbedUrl: Google Maps → Share → Embed a map → copy the src="..." URL
   */
  location: {
    address: '',
    mapEmbedUrl: '',
  },

  /** Social links — leave '' to show a "coming soon" placeholder icon. Never guess URLs. */
  social: {
    facebook: '',
    instagram: '',
    tiktok: '',
  },

  seo: {
    title: 'Sohni Bakers | Homemade Cakes, Brownies & Donuts',
    description:
      'Sohni Bakers offers fresh homemade cakes, brownies and donuts in Punjab, Pakistan. Order delicious cakes, chocolate desserts and homemade bakery treats.',
    // Set SITE_URL in .env for correct canonical links, sitemap and social previews.
  },

  pricing: {
    currency: 'PKR',
    /**
     * While prices in products.js are placeholders, keep this TRUE so customers
     * see a small notice. Set to FALSE once you have entered your real prices.
     */
    showPlaceholderPriceNotice: true,
    placeholderNoticeText:
      'Prices shown are sample prices for now — your final price will be confirmed on WhatsApp.',
  },

  /**
   * Manual payment methods. These are NOT automatic payment gateways —
   * customers transfer the amount themselves and upload proof.
   * Full account details are only shown on the checkout payment step
   * and on the customer's own order confirmation page.
   */
  payments: [
    {
      id: 'jazzcash',
      name: 'JazzCash',
      accountTitle: 'Shehla Aman',
      accountNumber: '0308 3373522',
      bankName: '',
      requireTransactionId: true,
      requireScreenshot: true,
      steps: [
        'Open your JazzCash app (or dial *786#).',
        'Choose "Send Money" → "Mobile Account".',
        'Send the exact payment amount to the account below.',
        'Take a screenshot of the successful transaction and note the Transaction ID (TID).',
      ],
    },
    {
      id: 'easypaisa',
      name: 'EasyPaisa',
      accountTitle: 'Nimra Aman',
      accountNumber: '0316 2443843',
      bankName: '',
      requireTransactionId: true,
      requireScreenshot: true,
      steps: [
        'Open your EasyPaisa app.',
        'Choose "Send Money" → "Easypaisa Account".',
        'Send the exact payment amount to the account below.',
        'Take a screenshot of the successful transaction and note the Transaction ID.',
      ],
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      accountTitle: 'Nimra Aman',
      accountNumber: '5040355163600012',
      bankName: 'Punjab Bank',
      requireTransactionId: true,
      requireScreenshot: true,
      steps: [
        'Open your banking app or visit your bank.',
        'Transfer the exact payment amount to the account below.',
        'Take a screenshot of the receipt and note the Reference / Transaction number.',
      ],
    },
  ],

  /**
   * Starting delivery settings. Copied into the database on first start;
   * after that, change them from Admin → Delivery Settings.
   * Charges below are PLACEHOLDERS — please update them.
   */
  deliveryDefaults: {
    homeDeliveryEnabled: true,
    pickupEnabled: true,
    pickupNote:
      'Pickup location and time will be shared with you on WhatsApp once your order is confirmed.',
    areas: [
      { name: 'Local Delivery', charge: 200 }, // PLACEHOLDER charge
      { name: 'Other Areas in Punjab', charge: 500 }, // PLACEHOLDER charge
    ],
  },

  orders: {
    numberPrefix: 'SB', // order numbers look like SB-2026-0001
    maxQuantityPerItem: 20,
    maxItemsPerOrder: 30,
  },

  uploads: {
    maxPaymentProofBytes: 5 * 1024 * 1024, // 5 MB
    maxProductImageBytes: 4 * 1024 * 1024, // 4 MB
  },

  occasions: [
    'Birthday',
    'Anniversary',
    'Wedding',
    'Engagement',
    'Dholki',
    'Mehndi',
    'Baby Shower',
    'Family Events',
    'Corporate Events',
  ],
};
