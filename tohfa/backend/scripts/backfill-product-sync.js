'use strict';

/**
 * backfill-product-sync.js
 * 
 * One-time backfill script to link active, pre-made listings to products.
 * 
 * 1. For active 'pre-made' listings without a linked product (products.source_listing_id IS NULL):
 *    - Looks for an existing product with the same seller_id and case-insensitive name.
 *    - If found, updates `source_listing_id` on that product.
 *    - Then, runs `syncListingToProduct()` to sync variants, photos, etc.
 *    - If not found, calls `syncListingToProduct()` directly to create a new product.
 * 2. Excludes 'custom' listings.
 * 3. Outputs a clear summary of actions taken.
 */

const db = require('../src/db');
const { syncListingToProduct } = require('../src/services/listingSync');

async function runBackfill() {
  console.log('=== TOHFA CATALOG BACKFILL START ===');
  
  // Row counts before backfill
  const initialProductsCount = await db.prepare('SELECT COUNT(*) as cnt FROM products').get().then(r => r.cnt);
  const initialLinkedCount = await db.prepare('SELECT COUNT(*) as cnt FROM products WHERE source_listing_id IS NOT NULL').get().then(r => r.cnt);
  const initialProductVariantsCount = await db.prepare('SELECT COUNT(*) as cnt FROM product_variants').get().then(r => r.cnt);
  
  console.log(`Initial Products in Database: ${initialProductsCount} (Linked: ${initialLinkedCount})`);
  console.log(`Initial Product Variants in Database: ${initialProductVariantsCount}`);

  // Fetch all listings
  const listings = await db.prepare('SELECT id, seller_id, title, listing_type, status FROM listings').all();
  
  let newlyLinked = 0;
  let newlyCreated = 0;
  let skippedCustom = 0;
  let skippedInactive = 0;
  let skippedAlreadyLinked = 0;
  let errors = 0;

  for (const listing of listings) {
    // 1. Guard listing_type
    if (listing.listing_type !== 'pre-made' && listing.listing_type !== 'custom') {
      skippedCustom++;
      continue;
    }

    // 2. Guard status
    if (listing.status !== 'active') {
      skippedInactive++;
      continue;
    }

    // 3. Check if product is already linked via source_listing_id
    const existingLinkedProduct = await db.prepare('SELECT id FROM products WHERE source_listing_id = ?').get(listing.id);
    if (existingLinkedProduct) {
      skippedAlreadyLinked++;
      continue;
    }

    // 4. Try to find a matching product by name (case-insensitive) and seller_id which is NOT linked yet
    const matchingUnlinkedProduct = await db.prepare(`
      SELECT id FROM products 
      WHERE seller_id = ? 
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
        AND source_listing_id IS NULL
    `).get(listing.seller_id, listing.title);

    try {
      if (matchingUnlinkedProduct) {
        // Link them
        await db.prepare('UPDATE products SET source_listing_id = ? WHERE id = ?').run(listing.id, matchingUnlinkedProduct.id);
        newlyLinked++;
        console.log(`[LINKED] Listing ID ${listing.id} ("${listing.title}") linked to existing Product ID ${matchingUnlinkedProduct.id}`);
      } else {
        newlyCreated++;
        console.log(`[CREATE FRESH] Listing ID ${listing.id} ("${listing.title}") will be created fresh`);
      }

      // Sync variables, categories, variants, and photos
      const syncResult = await syncListingToProduct(listing.id);
      if (!syncResult.synced) {
        console.error(`[SYNC WARNING] Failed to sync Listing ID ${listing.id}: ${syncResult.warning}`);
        errors++;
      } else {
        console.log(`[SYNC SUCCESS] Listing ID ${listing.id} synced successfully (Product ID: ${syncResult.productId})`);
      }
    } catch (err) {
      console.error(`[ERROR] Error processing listing ID ${listing.id}:`, err);
      errors++;
    }
  }

  // Row counts after backfill
  const finalProductsCount = await db.prepare('SELECT COUNT(*) as cnt FROM products').get().then(r => r.cnt);
  const finalLinkedCount = await db.prepare('SELECT COUNT(*) as cnt FROM products WHERE source_listing_id IS NOT NULL').get().then(r => r.cnt);
  const finalProductVariantsCount = await db.prepare('SELECT COUNT(*) as cnt FROM product_variants').get().then(r => r.cnt);

  console.log('\n=== BACKFILL SUMMARY ===');
  console.log(`Listings Newly Linked to Existing Products : ${newlyLinked}`);
  console.log(`Fresh Products Created                     : ${newlyCreated}`);
  console.log(`Skipped - Already Linked                   : ${skippedAlreadyLinked}`);
  console.log(`Skipped - Inactive Listings                : ${skippedInactive}`);
  console.log(`Skipped - Custom Listings                  : ${skippedCustom}`);
  console.log(`Sync/Processing Errors                     : ${errors}`);
  console.log('----------------------------------------');
  console.log(`Products Count Before: ${initialProductsCount} -> After: ${finalProductsCount}`);
  console.log(`Linked Products Before: ${initialLinkedCount} -> After: ${finalLinkedCount}`);
  console.log(`Product Variants Before: ${initialProductVariantsCount} -> After: ${finalProductVariantsCount}`);
  console.log('=== TOHFA CATALOG BACKFILL END ===');
  
  // Wait a brief moment to ensure logging/DB finishes, then exit.
  process.exit(0);
}

runBackfill().catch(err => {
  console.error('Fatal backfill error:', err);
  process.exit(1);
});
