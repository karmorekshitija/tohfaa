'use strict';

/**
 * backfill-avatar-urls.js
 * 
 * One-time backfill script to normalize avatar URLs stored in `users` and `seller_profiles`.
 * Strips absolute protocol & domain prefixes (e.g. `https://api.thetohfa.in/uploads/...` or `http://localhost:5000/uploads/...`),
 * converting them into normalized relative paths (`/uploads/avatars/...`).
 * 
 * Usage:
 *   node backend/scripts/backfill-avatar-urls.js --dry-run   (inspect affected rows without updating DB)
 *   node backend/scripts/backfill-avatar-urls.js           (apply updates in-place)
 */

const db = require('../src/db');

function toRelativePath(url) {
  if (!url || typeof url !== 'string') return url;
  const uploadsIdx = url.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    return url.slice(uploadsIdx);
  }
  const imgIdx = url.indexOf('/img/');
  if (imgIdx !== -1) {
    return url.slice(imgIdx);
  }
  return url.replace(/^https?:\/\/[^\/]+/, '');
}

async function runAvatarBackfill() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== TOHFA AVATAR URL BACKFILL START ${isDryRun ? '(DRY RUN MODE)' : '(LIVE EXECUTION)'} ===\n`);

  let usersUpdated = 0;
  let sellerProfilesUpdated = 0;

  try {
    // 1. Fetch matching user records
    const users = await db.prepare(`
      SELECT id, full_name, email, avatar_url 
      FROM users 
      WHERE avatar_url LIKE 'http://%' OR avatar_url LIKE 'https://%'
    `).all();

    console.log(`Found ${users.length} users with absolute avatar URLs in database.`);
    for (const u of users) {
      const rel = toRelativePath(u.avatar_url);
      console.log(`  [User #${u.id}] "${u.full_name || u.email}":`);
      console.log(`    Before: ${u.avatar_url}`);
      console.log(`    After:  ${rel}`);
      
      if (!isDryRun) {
        await db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(rel, u.id);
        usersUpdated++;
      }
    }

    console.log('');

    // 2. Fetch matching seller profile records
    const sellerProfiles = await db.prepare(`
      SELECT id, user_id, shop_name, avatar_url 
      FROM seller_profiles 
      WHERE avatar_url LIKE 'http://%' OR avatar_url LIKE 'https://%'
    `).all();

    console.log(`Found ${sellerProfiles.length} seller profiles with absolute avatar URLs in database.`);
    for (const sp of sellerProfiles) {
      const rel = toRelativePath(sp.avatar_url);
      console.log(`  [SellerProfile #${sp.id}] User #${sp.user_id} (${sp.shop_name}):`);
      console.log(`    Before: ${sp.avatar_url}`);
      console.log(`    After:  ${rel}`);
      
      if (!isDryRun) {
        await db.prepare('UPDATE seller_profiles SET avatar_url = ? WHERE id = ?').run(rel, sp.id);
        sellerProfilesUpdated++;
      }
    }

    console.log('\n=== BACKFILL SUMMARY ===');
    if (isDryRun) {
      console.log(`[DRY RUN] Would update ${users.length} users and ${sellerProfiles.length} seller profiles.`);
      console.log('Run without --dry-run to commit changes to the database.');
    } else {
      console.log(`[COMPLETED] Updated ${usersUpdated} users and ${sellerProfilesUpdated} seller profiles.`);
    }

  } catch (err) {
    console.error('Error during avatar URL backfill:', err);
    process.exit(1);
  }
}

runAvatarBackfill();
