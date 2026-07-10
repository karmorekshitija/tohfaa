'use strict';
/**
 * listingSync.js
 *
 * Shared service that publishes/keeps in sync a pre-made listing with its
 * buyer-visible `products` row, including variants and photos.
 *
 * Extracted from server.js so it can be consumed by both:
 *   - The seller-dashboard listing routes (server.js)
 *   - The WhatsApp bot add_product confirmation flow (whatsappBotService.js)
 *
 * Both callers share the same `db` singleton, so there is no duplication.
 *
 * Returns: { synced: boolean, productId: number|null, warning: string|null }
 */

const db = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
// syncListingToProduct(listingId)
// ─────────────────────────────────────────────────────────────────────────────
async function syncListingToProduct(listingId) {
  let syncedProductId = null;
  try {
    // 1. Load the listing with all fields needed for sync
    const listing = await db.prepare(`
      SELECT id, seller_id, title, description, base_price, price_paise,
             listing_type, status, stock_count, ships_in_days, category_id,
             cover_photo_url
      FROM listings WHERE id = ?
    `).get(listingId);

    if (!listing) {
      return { synced: false, productId: null, warning: `Listing ${listingId} not found during sync` };
    }

    // 2. Sync all listings (pre-made and custom) so they are visible to buyers
    if (listing.listing_type !== 'pre-made' && listing.listing_type !== 'custom') {
      return { synced: false, productId: null, warning: null };
    }

    const effectivePrice = listing.base_price || listing.price_paise || 0;

    // 3. Compute stock_qty: sum of variant stocks if variants exist, else listing.stock_count
    const variantRows = await db.prepare(
      'SELECT stock_count FROM listing_variants WHERE listing_id = ?'
    ).all(listingId);
    const stockQty = variantRows.length > 0
      ? variantRows.reduce((sum, v) => sum + (v.stock_count || 0), 0)
      : (listing.stock_count || 0);

    // 4. Map listing status → product status
    //    'active' → 'active', 'paused' → 'paused', 'draft' → 'draft',
    //    'deleted' → 'archived'  (soft-delete; past orders may reference this product)
    const productStatusMap = { active: 'active', paused: 'paused', draft: 'draft', deleted: 'archived' };
    const productStatus = productStatusMap[listing.status] || 'draft';

    // 5. Look up linked product by source_listing_id (reliable FK, not title-match)
    let product = await db.prepare(
      'SELECT id FROM products WHERE source_listing_id = ?'
    ).get(listingId);

    if (!product) {
      // No linked product yet. Only create one when the listing is active.
      if (listing.status !== 'active') {
        return { synced: false, productId: null, warning: null }; // draft/paused — nothing to publish yet
      }
      // INSERT new product row
      const insertResult = await db.prepare(`
        INSERT INTO products
          (seller_id, category_id, name, description, price_paise, stock_qty,
           ships_in_days, status, source_listing_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))
      `).run(
        listing.seller_id,
        listing.category_id || null,
        listing.title,
        listing.description || null,
        effectivePrice,
        stockQty,
        listing.ships_in_days || 3,
        listingId
      );
      syncedProductId = Number(insertResult.lastInsertRowid);
      product = { id: syncedProductId };
      console.log(`[syncListingToProduct] Created product ${syncedProductId} for listing ${listingId}`);
    } else {
      // UPDATE existing linked product
      syncedProductId = product.id;
      await db.prepare(`
        UPDATE products SET
          name          = ?,
          description   = ?,
          price_paise   = ?,
          stock_qty     = ?,
          category_id   = ?,
          ships_in_days = ?,
          status        = ?,
          updated_at    = datetime('now')
        WHERE id = ?
      `).run(
        listing.title,
        listing.description || null,
        effectivePrice,
        stockQty,
        listing.category_id || null,
        listing.ships_in_days || 3,
        productStatus,
        product.id
      );
      console.log(`[syncListingToProduct] Updated product ${product.id} for listing ${listingId} (status=${productStatus})`);
    }

    const productId = product.id;

    // 6. Sync subcategories (unchanged from before)
    try {
      const subcats = await db.prepare(
        'SELECT subcategory_id FROM listing_subcategories WHERE listing_id = ?'
      ).all(listingId);
      await db.prepare('DELETE FROM product_subcategories WHERE product_id = ?').run(productId);
      if (subcats.length > 0) {
        const scStmt = db.prepare('INSERT INTO product_subcategories (product_id, subcategory_id) VALUES (?, ?)');
        for (const sc of subcats) { await scStmt.run(productId, sc.subcategory_id); }
      }
    } catch (scErr) {
      // Non-fatal: log but don't abort the sync
      console.warn(`[syncListingToProduct] Subcategory sync failed for product ${productId}:`, scErr.message);
    }

    // 7. Sync listing_variants → product_variants
    //    Strategy: upsert by source_variant_id; delete stale rows whose
    //    source_variant_id no longer exists in listing_variants.
    const listingVariants = await db.prepare(
      'SELECT id, variant_name, price_paise, stock_count, sku FROM listing_variants WHERE listing_id = ?'
    ).all(listingId);

    const listingVariantIds = listingVariants.map(v => v.id);

    // Delete product_variants whose source has been removed from the listing
    const existingPVs = await db.prepare(
      'SELECT id, source_variant_id FROM product_variants WHERE product_id = ?'
    ).all(productId);
    for (const pv of existingPVs) {
      if (pv.source_variant_id !== null && !listingVariantIds.includes(pv.source_variant_id)) {
        await db.prepare('DELETE FROM product_variants WHERE id = ?').run(pv.id);
        console.log(`[syncListingToProduct] Removed stale product_variant ${pv.id} (source_variant_id=${pv.source_variant_id})`);
      }
    }

    // Upsert remaining variants
    for (const lv of listingVariants) {
      const existing = await db.prepare(
        'SELECT id FROM product_variants WHERE product_id = ? AND source_variant_id = ?'
      ).get(productId, lv.id);
      if (existing) {
        await db.prepare(`
          UPDATE product_variants SET
            variant_name = ?,
            price_paise  = ?,
            stock_qty    = ?,
            sku          = ?,
            updated_at   = datetime('now')
          WHERE id = ?
        `).run(lv.variant_name, lv.price_paise, lv.stock_count, lv.sku || null, existing.id);
      } else {
        await db.prepare(`
          INSERT INTO product_variants
            (product_id, source_variant_id, variant_name, price_paise, stock_qty, sku, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(productId, lv.id, lv.variant_name, lv.price_paise, lv.stock_count, lv.sku || null);
      }
    }

    // 8a. Sync shared/fallback listing_photos (variant_id IS NULL) → product_images
    //     Full replace strategy: delete all shared synced rows, re-insert from listing_photos.
    //     Variant-specific product_images (variant_id IS NOT NULL) are handled in 8b below.
    const sharedListingPhotos = await db.prepare(
      'SELECT id, url, is_cover, sort_order FROM listing_photos WHERE listing_id = ? AND variant_id IS NULL ORDER BY sort_order ASC'
    ).all(listingId);

    const listingImages = await db.prepare(
      'SELECT id, image_url AS url, is_cover, sort_order FROM listing_images WHERE listing_id = ? ORDER BY sort_order ASC'
    ).all(listingId);

    const seenUrls = new Set();
    const allPhotos = [];

    for (const p of sharedListingPhotos) {
      if (p.url && !seenUrls.has(p.url)) {
        seenUrls.add(p.url);
        allPhotos.push(p);
      }
    }
    for (const p of listingImages) {
      if (p.url && !seenUrls.has(p.url)) {
        seenUrls.add(p.url);
        allPhotos.push(p);
      }
    }

    await db.prepare(
      'DELETE FROM product_images WHERE product_id = ? AND variant_id IS NULL'
    ).run(productId);

    if (allPhotos.length > 0) {
      const sharedImgStmt = db.prepare(`
        INSERT INTO product_images (product_id, url, is_primary, sort_order, variant_id)
        VALUES (?, ?, ?, ?, NULL)
      `);
      for (let i = 0; i < allPhotos.length; i++) {
        const lp = allPhotos[i];
        const isPrimary = lp.is_cover ? 1 : (i === 0 ? 1 : 0);
        await sharedImgStmt.run(productId, lp.url, isPrimary, lp.sort_order);
      }
    } else if (listing.cover_photo_url) {
      // Fallback: use listing's cover_photo_url if no shared photos rows exist
      await db.prepare(`
        INSERT INTO product_images (product_id, url, is_primary, sort_order, variant_id)
        VALUES (?, ?, 1, 0, NULL)
      `).run(productId, listing.cover_photo_url);
    }

    // 8b. Sync variant-specific listing_photos (variant_id IS NOT NULL) → product_images
    //     For each listing_variants row, find its linked product_variants row via
    //     source_variant_id, then full-replace product_images for that product_variant.
    //     Only runs if listing_variants exist; safely skipped for no-variant listings.
    if (listingVariants.length > 0) {
      for (const lv of listingVariants) {
        // Resolve the product_variants row that mirrors this listing_variants row.
        // The variant sync (step 7) ran first, so this row must exist.
        const pv = await db.prepare(
          'SELECT id FROM product_variants WHERE product_id = ? AND source_variant_id = ?'
        ).get(productId, lv.id);
        if (!pv) {
          console.warn(`[syncListingToProduct] product_variant for listing_variant ${lv.id} not found — skipping photo sync for this variant`);
          continue;
        }
        const pvId = pv.id;

        // Full replace: delete existing variant-scoped product_images for this product_variant
        await db.prepare(
          'DELETE FROM product_images WHERE product_id = ? AND variant_id = ?'
        ).run(productId, pvId);

        // Fetch variant-specific photos for this listing_variant
        const variantListingPhotos = await db.prepare(
          'SELECT id, url, is_cover, sort_order FROM listing_photos WHERE listing_id = ? AND variant_id = ? ORDER BY sort_order ASC'
        ).all(listingId, lv.id);

        if (variantListingPhotos.length > 0) {
          const varImgStmt = db.prepare(`
            INSERT INTO product_images (product_id, url, is_primary, sort_order, variant_id)
            VALUES (?, ?, ?, ?, ?)
          `);
          for (let i = 0; i < variantListingPhotos.length; i++) {
            const lp = variantListingPhotos[i];
            const isPrimary = lp.is_cover ? 1 : (i === 0 ? 1 : 0);
            await varImgStmt.run(productId, lp.url, isPrimary, lp.sort_order, pvId);
          }
          console.log(`[syncListingToProduct] Synced ${variantListingPhotos.length} photo(s) for product_variant ${pvId} (listing_variant ${lv.id})`);
        }
      }
    }

    return { synced: true, productId, warning: null };

  } catch (err) {
    const msg = `syncListingToProduct failed for listing ${listingId}: ${err.message}`;
    console.error('[syncListingToProduct]', msg, err);
    return { synced: false, productId: syncedProductId, warning: msg };
  }
}

module.exports = { syncListingToProduct };
