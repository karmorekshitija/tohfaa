const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    console.log("=== REGISTERED SELLERS IN DATABASE ===");
    const sellers = await db.prepare(`
      SELECT 
        u.id AS user_id, 
        u.email, 
        u.full_name,
        sp.shop_name AS profile_shop_name,
        sp.handle AS profile_handle,
        CASE WHEN s.id IS NOT NULL THEN 'Yes' ELSE 'No' END AS in_sellers_table
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE u.role = 'seller'
      ORDER BY u.id ASC
    `).all();
    console.log(sellers);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
