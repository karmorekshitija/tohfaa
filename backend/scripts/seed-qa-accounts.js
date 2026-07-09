const db = require('../src/db');
const bcrypt = require('bcrypt');

async function seedUser({ email, password, fullName, role }) {
  console.log(`\nSeeding user: ${email} (Role: ${role})...`);
  const passwordHash = await bcrypt.hash(password, 12);
  
  // 1. Insert or update user
  const existingUser = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  let userId;
  if (!existingUser) {
    console.log(`- Creating new user...`);
    const insertRes = await db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role, is_active, is_banned)
      VALUES (?, ?, ?, ?, 1, 0)
    `).run(email, passwordHash, fullName, role);
    userId = insertRes.lastInsertId || insertRes.id;
    if (!userId) {
      // Find the created user ID
      const newlyCreated = await db.prepare("SELECT id FROM users WHERE email = ?").get(email);
      userId = newlyCreated.id;
    }
  } else {
    userId = existingUser.id;
    console.log(`- Updating existing user ID: ${userId}...`);
    await db.prepare(`
      UPDATE users 
      SET password_hash = ?, full_name = ?, role = ?, is_active = 1, is_banned = 0 
      WHERE id = ?
    `).run(passwordHash, fullName, role, userId);
  }

  // 2. If seller, configure seller profile, sellers, and store config
  if (role === 'seller') {
    const shopName = `${fullName} Handcrafted`;
    let storeSlug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Check if slug is taken
    const slugTaken = await db.prepare("SELECT id FROM seller_profiles WHERE store_slug = ? AND user_id != ?").get(storeSlug, userId);
    if (slugTaken) {
      storeSlug = `${storeSlug}-${userId}`;
    }

    let handle = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    // Check if handle is taken
    const handleTaken = await db.prepare("SELECT id FROM seller_profiles WHERE handle = ? AND user_id != ?").get(handle, userId);
    if (handleTaken) {
      handle = `${handle}_${userId}`;
    }

    // A. seller_profiles
    const existingProfile = await db.prepare("SELECT id FROM seller_profiles WHERE user_id = ?").get(userId);
    if (!existingProfile) {
      console.log(`- Creating seller profile with handle: ${handle} and slug: ${storeSlug}...`);
      await db.prepare(`
        INSERT INTO seller_profiles (
          user_id, shop_name, display_name, handle, store_slug, 
          is_approved, is_accepting_orders, platform_fee_pct, onboarding_step, banner_url
        ) VALUES (?, ?, ?, ?, ?, 1, 1, 8, 3, '/uploads/banners/default-banner.png')
      `).run(userId, shopName, fullName, handle, storeSlug);
    } else {
      console.log(`- Updating existing seller profile...`);
      await db.prepare(`
        UPDATE seller_profiles SET 
          shop_name = ?, display_name = ?, handle = ?, store_slug = ?, 
          is_approved = 1, is_accepting_orders = 1, onboarding_step = 3
          WHERE user_id = ?
      `).run(shopName, fullName, handle, storeSlug, userId);
    }

    // B. sellers table
    const existingSeller = await db.prepare("SELECT id FROM sellers WHERE user_id = ?").get(userId);
    const bio = "Crafting high-quality handmade goods with love.";
    const photoUrl = "/uploads/avatars/default-avatar.png";
    const bannerUrl = "/uploads/banners/default-banner.png";

    if (!existingSeller) {
      console.log("- Registering in sellers table...");
      await db.prepare(`
        INSERT INTO sellers (
          user_id, shop_name, handle, city, bio, photo_url, banner_url
        ) VALUES (?, ?, ?, 'Jaipur', ?, ?, ?)
      `).run(userId, shopName, handle, bio, photoUrl, bannerUrl);
    } else {
      console.log("- Updating in sellers table...");
      await db.prepare(`
        UPDATE sellers SET 
          shop_name = ?, handle = ?, city = 'Jaipur', bio = ?, photo_url = ?, banner_url = ?, deleted_at = NULL
        WHERE user_id = ?
      `).run(shopName, handle, bio, photoUrl, bannerUrl, userId);
    }

    // C. store_config
    const existingConfig = await db.prepare("SELECT seller_id FROM store_config WHERE seller_id = ?").get(userId);
    if (!existingConfig) {
      console.log("- Creating store config...");
      await db.prepare(`
        INSERT INTO store_config (
          seller_id, banner_url, city, artist_bio, about_headline, artisan_story
        ) VALUES (?, ?, ?, ?, 'Handcrafted Gifts', ?)
      `).run(userId, bannerUrl, 'Jaipur', bio, bio);
    } else {
      console.log("- Updating store config...");
      await db.prepare(`
        UPDATE store_config SET 
          banner_url = ?, city = 'Jaipur', artist_bio = ?, artisan_story = ?
        WHERE seller_id = ?
      `).run(bannerUrl, bio, bio, userId);
    }

    // D. seller_applications
    try {
      const existingApp = await db.prepare("SELECT id FROM seller_applications WHERE user_id = ?").get(userId);
      if (!existingApp) {
        await db.prepare(`
          INSERT INTO seller_applications (
            user_id, full_name, email, phone, bio, categories, agreed_terms, agreed_handmade, status, reviewed_at
          ) VALUES (?, ?, ?, '9999999999', ?, '{gifts}', true, true, 'approved', CURRENT_TIMESTAMP)
        `).run(userId, fullName, email, bio);
      } else {
        await db.prepare(`
          UPDATE seller_applications SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE user_id = ?
        `).run(userId);
      }
    } catch (appErr) {
      console.warn("- Warning: Failed to write to seller_applications:", appErr.message);
    }
  }

  console.log(`- Successfully seeded ${email}!`);
}

async function runSeed() {
  console.log('=== TOHFA QA ACCOUNTS SEED START ===');

  // 1. Seeding Diya Roy (Buyer)
  await seedUser({
    email: 'diya@tohfa.in',
    password: 'diya123',
    fullName: 'Diya Roy',
    role: 'buyer'
  });

  // 2. Seeding Kshitija Karmore (Seller)
  await seedUser({
    email: 'kshitijakar@gmail.com',
    password: 'kshitija123',
    fullName: 'Kshitija Karmore',
    role: 'seller'
  });

  // 3. Seeding qa-buyer@tohfa.in (Buyer)
  await seedUser({
    email: 'qa-buyer@tohfa.in',
    password: 'password123',
    fullName: 'QA Buyer',
    role: 'buyer'
  });

  // 4. Seeding qa-seller@tohfa.in (Seller)
  await seedUser({
    email: 'qa-seller@tohfa.in',
    password: 'password123',
    fullName: 'QA Seller',
    role: 'seller'
  });

  console.log('\n=== TOHFA QA ACCOUNTS SEED COMPLETE ===');
  process.exit(0);
}

runSeed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
