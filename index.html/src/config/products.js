/**
 * ============================================================
 *  SOHNI BAKERS — PRODUCT CATALOG (central product file)
 * ============================================================
 *
 *  ⚠️  ALL PRICES BELOW ARE PLACEHOLDERS. Replace them with your real prices.
 *
 *  How this file is used
 *  ---------------------
 *  • On the very first start, the website copies this catalog into its database.
 *  • After that you can edit products, prices, images, availability and
 *    "featured" from the Admin Dashboard — no coding needed.
 *  • If you prefer editing this file instead, edit it and run:
 *        npm run catalog:sync
 *    That updates every product in the database to match this file
 *    (products are matched by `slug`).
 *
 *  Fields
 *  ------
 *  slug          URL name → /products/<slug>   (lowercase-with-dashes, keep it stable)
 *  name          Product name shown to customers
 *  type          'cake' | 'brownie' | 'donut'
 *  category      'cakes' | 'signature' | 'dry-cakes' | 'brownies' | 'donuts'
 *  short         One-line description for product cards
 *  description   Longer description for the product page
 *  ingredients   Leave '' until the bakery confirms ingredients (we never guess)
 *  image         Path to the image (put real photos in /public/images/products/)
 *  imageAlt      Descriptive alt text (SEO + accessibility)
 *  available     false = shown as "Currently unavailable", can't be ordered
 *  featured      true  = shown in "Best Sellers" on the homepage
 *  favorite      true  = shown in "Customer Favorites" on the homepage
 *  weightPrices  Cakes: price in PKR per weight in pounds (lb)
 *  options       Brownies/Donuts: { label, pieces, price }
 * ============================================================
 */

// Helper: builds 1–5 lb prices from a 1 lb starting price.
// PLACEHOLDER maths only — replace with exact prices whenever you like, e.g.
//   weightPrices: { 1: 1500, 2: 2900, 3: 4200, 4: 5500, 5: 6800 }
function lbPrices(onePound) {
  const factors = { 1: 1, 2: 1.9, 3: 2.8, 4: 3.7, 5: 4.6 };
  const out = {};
  for (const [lb, f] of Object.entries(factors)) out[lb] = Math.round((onePound * f) / 50) * 50;
  return out;
}

const img = (slug) => `/images/products/${slug}.svg`;

const cakes = [
  {
    slug: 'fresh-vanilla-cake',
    name: 'Fresh Vanilla Cake',
    category: 'cakes',
    short: 'Soft vanilla sponge finished with light, fresh cream.',
    description:
      'A timeless favourite. Soft, fluffy vanilla sponge layered and covered with smooth fresh cream and finished with delicate cream swirls — simple, elegant and perfect for every celebration.',
    imageAlt: 'Fresh vanilla cream cake decorated with white cream rosettes',
    weightPrices: lbPrices(1400),
    featured: true,
  },
  {
    slug: 'simple-chocolate-cake',
    name: 'Simple Chocolate Cake',
    category: 'cakes',
    short: 'Classic chocolate sponge with smooth chocolate frosting.',
    description:
      'Our classic chocolate cake — moist chocolate sponge with a smooth chocolate frosting. An everyday treat that never goes out of style.',
    imageAlt: 'Round chocolate cake with smooth chocolate frosting and swirls',
    weightPrices: lbPrices(1500),
  },
  {
    slug: 'rich-chocolaty-cream-cake',
    name: 'Rich Chocolaty Cream Cake',
    category: 'cakes',
    short: 'Extra chocolaty layers with rich chocolate cream.',
    description:
      'For true chocolate lovers. Layers of chocolate sponge and rich chocolate cream, finished with chocolate shards and cream swirls on top.',
    imageAlt: 'Rich chocolate cream cake topped with chocolate shards and cream swirls',
    weightPrices: lbPrices(1800),
    favorite: true,
  },
  {
    slug: 'fudge-cake',
    name: 'Fudge Cake',
    category: 'cakes',
    short: 'Dense, indulgent chocolate cake with glossy fudge.',
    description:
      'Deep, dense and indulgent — a rich chocolate cake covered in thick, glossy chocolate fudge that drips down every side.',
    imageAlt: 'Dense chocolate fudge cake with thick glossy fudge drips',
    weightPrices: lbPrices(2000),
    featured: true,
  },
  {
    slug: 'pineapple-cake',
    name: 'Pineapple Cake',
    category: 'cakes',
    short: 'Light sponge with fresh cream and juicy pineapple.',
    description:
      'Light and refreshing. Soft sponge layered with fresh cream and pineapple pieces, decorated with pineapple rings and cherries.',
    imageAlt: 'Pineapple cream cake decorated with pineapple rings and cherries',
    weightPrices: lbPrices(1500),
  },
  {
    slug: 'mix-fruit-cake',
    name: 'Mix Fruit Cake',
    category: 'cakes',
    short: 'Fresh cream cake topped with colourful mixed fruit.',
    description:
      'A bright and cheerful cake — fluffy sponge and fresh cream topped with a colourful mix of fruits. A lovely choice for family gatherings.',
    imageAlt: 'Fresh cream cake topped with colourful mixed fruit pieces',
    weightPrices: lbPrices(1700),
  },
  {
    slug: 'strawberry-cake',
    name: 'Strawberry Cake',
    category: 'cakes',
    short: 'Pretty pink strawberry cream with strawberries on top.',
    description:
      'Soft sponge with sweet strawberry cream, finished with strawberries and cream swirls. Pretty, fruity and loved by all ages.',
    imageAlt: 'Pink strawberry cream cake topped with fresh strawberries',
    weightPrices: lbPrices(1700),
    favorite: true,
  },
  {
    slug: 'caramel-cake',
    name: 'Caramel Cake',
    category: 'cakes',
    short: 'Creamy cake finished with golden caramel drizzle.',
    description:
      'Soft sponge and cream finished with a golden caramel drip and caramel swirls — sweet, buttery and irresistible.',
    imageAlt: 'Cream cake with golden caramel drip and caramel decorations',
    weightPrices: lbPrices(1700),
  },
  {
    slug: 'caramel-crunch-peanut-cake',
    name: 'Caramel Crunch Peanut Cake',
    category: 'cakes',
    short: 'Caramel cake with a crunchy peanut topping.',
    description:
      'The perfect mix of sweet and crunchy. Caramel cream cake with a golden caramel drip and a generous crunchy peanut topping.',
    imageAlt: 'Caramel cake topped with crunchy peanuts and caramel drip',
    weightPrices: lbPrices(1900),
    favorite: true,
  },
  {
    slug: 'chocolate-caramel-cake',
    name: 'Chocolate Caramel Cake',
    category: 'cakes',
    short: 'Chocolate cake with a rich caramel drip.',
    description:
      'Two favourites together — moist chocolate cake and chocolate cream, finished with a rich caramel drip on top.',
    imageAlt: 'Chocolate cake with a golden caramel drip on top',
    weightPrices: lbPrices(1900),
  },
  {
    slug: 'caramel-crunch-walnuts-cake',
    name: 'Caramel Crunch Walnuts Cake',
    category: 'cakes',
    short: 'Caramel cream cake topped with walnuts.',
    description:
      'Golden caramel cream cake topped with walnuts and finished with a caramel drizzle — rich, nutty and full of flavour.',
    imageAlt: 'Caramel cake decorated with walnut halves and caramel drizzle',
    weightPrices: lbPrices(2000),
  },
  {
    slug: 'coconut-cake',
    name: 'Coconut Cake',
    category: 'cakes',
    short: 'Soft cream cake covered in coconut flakes.',
    description:
      'Soft sponge and smooth cream covered in coconut flakes for a light, tropical taste.',
    imageAlt: 'White cream cake covered in coconut flakes',
    weightPrices: lbPrices(1600),
  },
];

const signature = [
  {
    slug: 'three-milk-pistachio-cake',
    name: 'Three Milk Pistachio Cake',
    category: 'signature',
    short: 'Milk-soaked sponge with cream and pistachio topping.',
    description:
      'Our signature three milk cake — a soft sponge soaked in a creamy three-milk mixture, topped with light cream and pistachios.',
    imageAlt: 'Slice of three milk cake with cream and pistachio topping in creamy milk',
    weightPrices: lbPrices(2200),
    featured: true,
  },
  {
    slug: 'three-milk-caramel-cake',
    name: 'Three Milk Caramel Cake',
    category: 'signature',
    short: 'Creamy three milk cake with caramel drizzle.',
    description:
      'Soft sponge soaked in a creamy three-milk mixture, topped with cream and a golden caramel drizzle.',
    imageAlt: 'Three milk caramel cake slice with cream and caramel drizzle',
    weightPrices: lbPrices(2100),
    favorite: true,
  },
  {
    slug: 'chocolate-mousse-cake',
    name: 'Chocolate Mousse Cake',
    category: 'signature',
    short: 'Silky smooth chocolate mousse with a glossy finish.',
    description:
      'Light, airy and silky — smooth chocolate mousse on a chocolate base with a glossy chocolate finish and chocolate curls.',
    imageAlt: 'Smooth chocolate mousse cake with glossy top and chocolate curls',
    weightPrices: lbPrices(2200),
    featured: true,
  },
  {
    slug: 'chocolate-tub-cake',
    name: 'Chocolate Tub Cake',
    category: 'signature',
    short: 'Layers of chocolate cake and cream in a tub.',
    description:
      'Layers of chocolate cake, chocolate cream and ganache served in a tub — grab a spoon and enjoy every layer.',
    imageAlt: 'Chocolate cake layered with chocolate cream served in a tub',
    weightPrices: lbPrices(1800),
    favorite: true,
  },
  {
    slug: 'dream-cake',
    name: 'Dream Cake',
    category: 'signature',
    short: 'Luxurious layers of sponge, custard, cream and chocolate.',
    description:
      'Our most indulgent creation — layers of chocolate sponge, smooth custard and cream, topped with a rich chocolate layer.',
    imageAlt: 'Luxury layered dream cake with chocolate top, cream and custard layers',
    weightPrices: lbPrices(2400),
    featured: true,
  },
];

const dryCakes = [
  {
    slug: 'dry-fruits-cake',
    name: 'Dry Fruits Cake',
    category: 'dry-cakes',
    short: 'Golden tea-time cake loaded with mixed dry fruits.',
    description:
      'A rich, golden tea-time cake packed with mixed dry fruits — perfect with chai and lovely as a gift.',
    imageAlt: 'Golden dry fruits loaf cake with mixed dry fruits, sliced',
    weightPrices: lbPrices(1800),
  },
  {
    slug: 'banana-cake',
    name: 'Banana Cake',
    category: 'dry-cakes',
    short: 'Soft, moist banana tea cake.',
    description: 'Soft and moist banana cake with real banana flavour — a comforting tea-time favourite.',
    imageAlt: 'Moist banana loaf cake topped with banana slices',
    weightPrices: lbPrices(1300),
  },
  {
    slug: 'milky-dry-cake',
    name: 'Milky Dry Cake',
    category: 'dry-cakes',
    short: 'Light, milky and soft tea-time cake.',
    description: 'A light, soft and milky dry cake — simple, comforting and perfect with a cup of chai.',
    imageAlt: 'Soft golden milky dry loaf cake dusted with milk powder',
    weightPrices: lbPrices(1200),
  },
  {
    slug: 'almond-cake',
    name: 'Almond Cake',
    category: 'dry-cakes',
    short: 'Golden cake topped with almonds.',
    description: 'A soft golden tea cake topped with almonds for a lovely nutty crunch in every bite.',
    imageAlt: 'Golden almond loaf cake topped with almond flakes',
    weightPrices: lbPrices(1700),
  },
  {
    slug: 'tutty-fruity-dry-cake',
    name: 'Tutty Fruity Dry Cake',
    category: 'dry-cakes',
    short: 'Classic tea cake with colourful tutti frutti.',
    description:
      'The classic bakery tea cake — soft and golden with colourful tutti frutti pieces in every slice.',
    imageAlt: 'Tutti frutti loaf cake slice showing colourful tutti frutti pieces',
    weightPrices: lbPrices(1300),
  },
];

const donuts = [
  {
    slug: 'donuts',
    name: 'Donuts',
    type: 'donut',
    category: 'donuts',
    short: 'Soft, fluffy glazed donuts.',
    description: 'Soft and fluffy donuts with a sweet glaze and sprinkles — a fun treat for kids and grown-ups alike.',
    imageAlt: 'Soft glazed donuts with chocolate and pink glaze and sprinkles',
    options: [
      { label: 'Box of 2', pieces: 2, price: 400 }, // PLACEHOLDER
      { label: 'Box of 4', pieces: 4, price: 750 }, // PLACEHOLDER
      { label: 'Box of 6', pieces: 6, price: 1100 }, // PLACEHOLDER
      { label: 'Box of 12', pieces: 12, price: 2100 }, // PLACEHOLDER
    ],
    favorite: true,
  },
  {
    slug: 'chocolate-filled-donuts',
    name: 'Chocolate Filled Donuts',
    type: 'donut',
    category: 'donuts',
    short: 'Fluffy donuts filled with chocolate.',
    description: 'Fluffy sugared donuts with a generous chocolate filling inside — every bite is a chocolate surprise.',
    imageAlt: 'Sugared donuts with one cut open showing chocolate filling',
    options: [
      { label: 'Box of 2', pieces: 2, price: 500 }, // PLACEHOLDER
      { label: 'Box of 4', pieces: 4, price: 950 }, // PLACEHOLDER
      { label: 'Box of 6', pieces: 6, price: 1400 }, // PLACEHOLDER
      { label: 'Box of 12', pieces: 12, price: 2700 }, // PLACEHOLDER
    ],
    featured: true,
  },
];

const brownies = [
  {
    slug: 'brownie-cup',
    name: 'Brownie Cup',
    type: 'brownie',
    category: 'brownies',
    short: 'Fudgy brownie baked in a cup with chocolate on top.',
    description: 'A rich, fudgy brownie baked in its own cup and topped with chocolate — perfect single servings.',
    imageAlt: 'Fudgy brownie baked in a paper cup topped with chocolate',
    options: [
      { label: '1 Cup', pieces: 1, price: 250 }, // PLACEHOLDER
      { label: 'Box of 4', pieces: 4, price: 950 }, // PLACEHOLDER
      { label: 'Box of 6', pieces: 6, price: 1400 }, // PLACEHOLDER
      { label: 'Box of 12', pieces: 12, price: 2700 }, // PLACEHOLDER
    ],
  },
  {
    slug: 'triple-chocolate-brownie',
    name: 'Triple Chocolate Brownie',
    type: 'brownie',
    category: 'brownies',
    short: 'Rich brownie with three kinds of chocolate.',
    description: 'Rich, moist and seriously chocolatey — a fudgy brownie loaded with three kinds of chocolate.',
    imageAlt: 'Stacked triple chocolate brownies with chocolate chunks and drizzle',
    options: [
      { label: 'Box of 4', pieces: 4, price: 1000 }, // PLACEHOLDER
      { label: 'Box of 6', pieces: 6, price: 1450 }, // PLACEHOLDER
      { label: 'Box of 12', pieces: 12, price: 2800 }, // PLACEHOLDER
    ],
    featured: true,
  },
  {
    slug: 'crinkle-top-brownie',
    name: 'Crinkle Top Brownie',
    type: 'brownie',
    category: 'brownies',
    short: 'Fudgy brownie with a shiny crinkly top.',
    description: 'The classic fudgy brownie with that shiny, crackly crinkle top — chewy edges and a soft, rich centre.',
    imageAlt: 'Fudgy brownie squares with shiny crinkle tops',
    options: [
      { label: 'Box of 4', pieces: 4, price: 900 }, // PLACEHOLDER
      { label: 'Box of 6', pieces: 6, price: 1300 }, // PLACEHOLDER
      { label: 'Box of 12', pieces: 12, price: 2500 }, // PLACEHOLDER
    ],
  },
];

const categories = [
  { id: 'cakes', name: 'Cakes', blurb: 'Fresh cream cakes for every celebration.' },
  { id: 'signature', name: 'Signature Cakes', blurb: 'Our special creations — three milk, mousse, tub and dream cakes.' },
  { id: 'dry-cakes', name: 'Dry Cakes', blurb: 'Golden tea-time cakes, perfect with chai.' },
  { id: 'brownies', name: 'Brownies', blurb: 'Rich, fudgy and chocolatey.' },
  { id: 'donuts', name: 'Donuts', blurb: 'Soft, fluffy and fun.' },
];

const products = [...cakes, ...signature, ...dryCakes, ...brownies, ...donuts].map((p, i) => ({
  type: 'cake',
  ingredients: '',
  available: true,
  featured: false,
  favorite: false,
  image: img(p.slug),
  sortOrder: i + 1,
  ...p,
}));

module.exports = { products, categories };
