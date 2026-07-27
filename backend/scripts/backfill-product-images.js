'use strict';
const db = require('../src/db');
const { syncListingToProduct } = require('../src/services/listingSync');

async function backfillProductImages() {
  console.log('=== PRODUCT IMAGES BACKFILL SCRIPT ===');

  // 1. Select all products with source_listing_id IS NOT NULL
  const products = await db.prepare('SELECT id, source_listing_id FROM products WHERE source_listing_id IS NOT NULL').all();
  console.log(`Found ${products.length} product(s) linked to source listings.`);

  let totalResynced = 0;
  let totalChanged = 0;

  for (const p of products) {
    const beforeCountRow = await db.prepare('SELECT COUNT(*) AS c FROM product_images WHERE product_id = ?').get(p.id);
    const countBefore = beforeCountRow ? parseInt(beforeCountRow.c) : 0;

    const result = await syncListingToProduct(p.source_listing_id);

    if (result.synced) {
      totalResynced++;
      const afterCountRow = await db.prepare('SELECT COUNT(*) AS c FROM product_images WHERE product_id = ?').get(p.id);
      const countAfter = afterCountRow ? parseInt(afterCountRow.c) : 0;

      if (countBefore !== countAfter) {
        totalChanged++;
        console.log(`[Product ${p.id}] Image count changed: before = ${countBefore}, after = ${countAfter}`);
      } else {
        console.log(`[Product ${p.id}] Re-synced (image count remained ${countAfter})`);
      }
    } else {
      console.warn(`[Product ${p.id}] Sync skipped/failed: ${result.warning}`);
    }
  }

  console.log(`\n=== BACKFILL COMPLETE ===`);
  console.log(`Total Products Processed: ${products.length}`);
  console.log(`Total Products Re-synced: ${totalResynced}`);
  console.log(`Total Products with Image Count Changes: ${totalChanged}`);
}

if (require.main === module) {
  backfillProductImages()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backfill script error:', err);
      process.exit(1);
    });
}

module.exports = { backfillProductImages };
