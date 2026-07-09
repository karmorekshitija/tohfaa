const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    const userIds = [3, 21, 31, 35];
    console.log("=== PROMOTING KSHITIJA USER ACCOUNTS TO SELLER ===");

    for (const userId of userIds) {
      // 1. Fetch user details
      const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
      if (!user) {
        console.log(`User ID ${userId} not found in database.`);
        continue;
      }

      console.log(`\nProcessing user: ${user.full_name} (${user.email})`);

      // 2. Update role to seller
      await db.prepare("UPDATE users SET role = 'seller' WHERE id = ?").run(userId);
      console.log(`- Role set to 'seller'.`);

      // 3. Insert or update seller_profiles
      const existingProfile = await db.prepare("SELECT id FROM seller_profiles WHERE user_id = ?").get(userId);
      
      const displayName = user.full_name || 'Kshitija Karmore';
      const shopName = `${displayName} Handcrafted`;
      let storeSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Check if slug is taken
      const slugTaken = await db.prepare("SELECT id FROM seller_profiles WHERE store_slug = ? AND user_id != ?").get(storeSlug, userId);
      if (slugTaken) {
        storeSlug = `${storeSlug}-${userId}`;
      }

      let handle = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      if (!handle) {
        handle = `kshitija_${userId}`;
      }

      // Check if handle is taken
      const handleTaken = await db.prepare("SELECT id FROM seller_profiles WHERE handle = ? AND user_id != ?").get(handle, userId);
      if (handleTaken) {
        handle = `${handle}_${userId}`;
      }

      if (!existingProfile) {
        console.log(`- Creating seller profile with handle: ${handle} and slug: ${storeSlug}...`);
        await db.prepare(`
          INSERT INTO seller_profiles (
            user_id, shop_name, display_name, handle, store_slug, 
            is_approved, is_accepting_orders, platform_fee_pct, onboarding_step
          ) VALUES (?, ?, ?, ?, ?, 1, 1, 8, 3)
        `).run(userId, shopName, displayName, handle, storeSlug);
      } else {
        console.log(`- Updating existing seller profile...`);
        await db.prepare(`
          UPDATE seller_profiles SET 
            shop_name = ?, display_name = ?, handle = ?, store_slug = ?, 
            is_approved = 1, is_accepting_orders = 1, onboarding_step = 3
          WHERE user_id = ?
        `).run(shopName, displayName, handle, storeSlug, userId);
      }

      // 4. Insert or update sellers table
      const existingSeller = await db.prepare("SELECT id FROM sellers WHERE user_id = ?").get(userId);
      const bio = "Pottery and handcrafted ceramics made with love.";
      const photoUrl = "/uploads/avatars/default-avatar.png";
      const bannerUrl = "/uploads/banners/default-banner.png";

      if (!existingSeller) {
        console.log("- Registering in sellers table...");
        await db.prepare(`
          INSERT INTO sellers (
            user_id, shop_name, handle, city, bio, photo_url, banner_url, created_at
          ) VALUES (?, ?, ?, 'Jaipur', ?, ?, ?, datetime('now'))
        `).run(userId, shopName, handle, bio, photoUrl, bannerUrl);
      } else {
        console.log("- Updating in sellers table...");
        await db.prepare(`
          UPDATE sellers SET 
            shop_name = ?, handle = ?, city = 'Jaipur', bio = ?, photo_url = ?, banner_url = ?, deleted_at = NULL
          WHERE user_id = ?
        `).run(shopName, handle, bio, photoUrl, bannerUrl, userId);
      }

      // 5. Insert or update store_config
      const existingConfig = await db.prepare("SELECT seller_id FROM store_config WHERE seller_id = ?").get(userId);
      if (!existingConfig) {
        console.log("- Creating store config...");
        await db.prepare(`
          INSERT INTO store_config (
            seller_id, banner_url, city, artist_bio, about_headline, artisan_story
          ) VALUES (?, ?, ?, ?, 'Handcrafted Pottery', ?)
        `).run(userId, bannerUrl, 'Jaipur', bio, bio);
      } else {
        console.log("- Updating store config...");
        await db.prepare(`
          UPDATE store_config SET 
            banner_url = ?, city = 'Jaipur', artist_bio = ?, about_headline = 'Handcrafted Pottery', artisan_story = ?
          WHERE seller_id = ?
        `).run(bannerUrl, bio, bio, userId);
      }

      // 6. Create seller applications entry for auditing
      try {
        const existingApp = await db.prepare("SELECT id FROM seller_applications WHERE user_id = ?").get(userId);
        if (!existingApp) {
          await db.prepare(`
            INSERT INTO seller_applications (
              user_id, full_name, email, phone, bio, categories, agreed_terms, agreed_handmade, status, reviewed_at
            ) VALUES (?, ?, ?, '9999999999', ?, '{pottery}', true, true, 'approved', CURRENT_TIMESTAMP)
          `).run(userId, displayName, user.email, bio);
        } else {
          await db.prepare(`
            UPDATE seller_applications SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP WHERE user_id = ?
          `).run(userId);
        }
      } catch (appErr) {
        console.warn("- Warning: Failed to write to seller_applications:", appErr.message);
      }

      console.log(`- User ${user.email} successfully approved as seller!`);
    }

    console.log("\n=== ALL ACCOUNTS PROMOTED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Promotion failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
