const db = require('../src/db');

async function main() {
  try {
    const userId = 3;
    const rows = await db.prepare(`
      SELECT c.*, l.title as product_title, l.cover_photo_url, u.full_name as other_party_name
      FROM conversations c
      JOIN listings l ON c.listing_id = l.id
      JOIN users u ON c.seller_id = u.id
      WHERE c.buyer_id = ?
      ORDER BY c.updated_at DESC
    `).all(userId);
    
    console.log("Conversations for buyer 3:");
    for (const c of rows) {
      let other_party_name = c.other_party_name || "";
      const sellerProfile = await db.prepare("SELECT shop_name FROM seller_profiles WHERE user_id = ?").get(c.seller_id);
      if (sellerProfile && sellerProfile.shop_name) {
        other_party_name = sellerProfile.shop_name;
      }
      console.log(`id: ${c.id}, other_party_name: "${other_party_name}"`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
