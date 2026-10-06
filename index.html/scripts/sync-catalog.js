'use strict';
/**
 * Copies src/config/products.js into the database (matched by slug).
 * Use this if you prefer editing prices in the file instead of the Admin Dashboard.
 * NOTE: this overwrites name, prices, weights, images and flags in the database
 * for every product listed in the file.
 *   npm run catalog:sync
 */
const { syncCatalog } = require('../src/lib/db');
const r = syncCatalog({ overwrite: true });
console.log(`Catalog synced: ${r.created} created, ${r.updated} updated.`);
