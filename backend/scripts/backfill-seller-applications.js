'use strict';

/**
 * backfill-seller-applications.js
 * 
 * One-time backfill script to create missing `seller_applications` records for sellers
 * who registered via the deprecated Path 2 direct signup route.
 * 
 * Ensures all sellers have a corresponding application record so they appear in the
 * "Seller Applications" admin panel.
 * 
 * Usage:
 *   node backend/scripts/backfill-seller-applications.js             (dry-run mode, inspect affected sellers)
 *   node backend/scripts/backfill-seller-applications.js --confirm   (execute inserts into database)
 */

const db = require('../src/db');

async function runSellerApplicationBackfill() {
  const isConfirm = process.argv.includes('--confirm');
  console.log(`=== TOHFA SELLER APPLICATION BACKFILL START ${isConfirm ? '(LIVE EXECUTION)' : '(DRY RUN MODE)'} ===\n`);

  try {
    const unlinkedSellers = await db.prepare(`
      SELECT 
        u.id, u.full_name, u.email, u.phone, u.bio, u.created_at,
        sp.shop_name, sp.shop_bio, sp.is_approved
      FROM users u
      LEFT JOIN seller_profiles sp ON sp.user_id = u.id
      WHERE u.role = 'seller' 
        AND NOT EXISTS (SELECT 1 FROM seller_applications sa WHERE sa.user_id = u.id)
    `).all();

    console.log(`Found ${unlinkedSellers.length} seller accounts without a matching seller_applications record.\n`);

    let createdCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;

    for (const seller of unlinkedSellers) {
      const isApproved = seller.is_approved === 1;
      const targetStatus = isApproved ? 'approved' : 'pending';
      const fullName = seller.full_name || seller.shop_name || 'Artisan Seller';
      const bio = seller.shop_bio || seller.bio || 'Handcrafted items';
      const createdAt = seller.created_at || new Date().toISOString();
      const phone = seller.phone || '0000000000';

      if (targetStatus === 'approved') approvedCount++;
      else pendingCount++;

      console.log(`  [Seller User #${seller.id}] "${fullName}" (${seller.email || 'No Email'}):`);
      console.log(`    Shop Name: "${seller.shop_name || 'N/A'}"`);
      console.log(`    Current Profile is_approved: ${seller.is_approved ?? 0}`);
      console.log(`    Target Application Status: "${targetStatus}"`);

      if (isConfirm) {
        await db.prepare(`
          INSERT INTO seller_applications (
            user_id, full_name, email, phone, bio, categories, agreed_terms, agreed_handmade, status, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          seller.id,
          fullName,
          seller.email || '',
          phone,
          bio,
          '{"handcrafted"}',
          true,
          true,
          targetStatus,
          createdAt
        );
        createdCount++;
      }
    }

    console.log('\n=== BACKFILL SUMMARY ===');
    if (!isConfirm) {
      console.log(`[DRY RUN] Found ${unlinkedSellers.length} sellers needing application backfill (${pendingCount} pending, ${approvedCount} approved).`);
      console.log('Run with --confirm flag to insert these application records into the database.');
    } else {
      console.log(`[COMPLETED] Successfully created ${createdCount} seller_applications rows.`);
    }

  } catch (err) {
    console.error('Error during seller application backfill:', err);
    process.exit(1);
  }
}

runSellerApplicationBackfill();
