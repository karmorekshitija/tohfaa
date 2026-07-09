const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    const userId = 6;
    console.log("=== RESTORING KAVYA STORE AND PRODUCTS ===");

    // 1. Fetch Profile and Store Config
    const profile = await db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(userId);
    const config = await db.prepare("SELECT * FROM store_config WHERE seller_id = ?").get(userId);

    if (!profile) {
      throw new Error(`No seller profile found for user_id = ${userId}`);
    }

    console.log("Found seller profile:", profile.shop_name);

    // 2. Check and Insert/Update sellers table
    const existingSeller = await db.prepare("SELECT id FROM sellers WHERE user_id = ?").get(userId);
    
    const shopName = profile.shop_name || 'Kavya Handcrafted Crafts';
    const handle = profile.handle || 'craftsbykavya';
    const city = config?.city || 'Jaipur';
    const bio = profile.shop_bio || config?.artist_bio || 'Elegant customized gifts, hoop art, and personalized keepsakes for your loved ones.';
    const photoUrl = profile.avatar_url || '/uploads/avatars/default-avatar.png';
    const bannerUrl = config?.banner_url || '/uploads/banners/default-banner.png';
    const aboutHeadline = config?.about_headline || 'Crafted with Intention';
    const aboutDescription = config?.artisan_story || profile.shop_bio || '';

    if (!existingSeller) {
      console.log("Inserting row into sellers table...");
      await db.prepare(`
        INSERT INTO sellers (
          user_id, shop_name, handle, city, bio, photo_url, banner_url, 
          about_headline, about_description, created_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), NULL)
      `).run(userId, shopName, handle, city, bio, photoUrl, bannerUrl, aboutHeadline, aboutDescription);
      console.log("Row successfully inserted!");
    } else {
      console.log("Updating existing row in sellers table...");
      await db.prepare(`
        UPDATE sellers SET 
          shop_name = ?, handle = ?, city = ?, bio = ?, photo_url = ?, banner_url = ?, 
          about_headline = ?, about_description = ?, deleted_at = NULL
        WHERE user_id = ?
      `).run(shopName, handle, city, bio, photoUrl, bannerUrl, aboutHeadline, aboutDescription, userId);
      console.log("Row successfully updated!");
    }

    // 3. Activate Listings
    console.log("Activating listings in listings table...");
    const listingsResult = await db.prepare(`
      UPDATE listings 
      SET status = 'active', stock_count = CASE WHEN stock_count <= 0 THEN 15 ELSE stock_count END
      WHERE seller_id = ?
    `).run(userId);
    console.log(`Updated ${listingsResult.changes} listings.`);

    // 4. Activate Products
    console.log("Activating products in products table...");
    const productsResult = await db.prepare(`
      UPDATE products 
      SET status = 'active', stock_qty = CASE WHEN stock_qty <= 0 THEN 15 ELSE stock_qty END
      WHERE seller_id = ?
    `).run(userId);
    console.log(`Updated ${productsResult.changes} products.`);

    console.log("=== RESTORATION COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Restoration failed:", err);
  } finally {
    process.exit(0);
  }
}

main();
