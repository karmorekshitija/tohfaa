const db = require('../src/db.js');

async function main() {
  try {
    const userCount = await db.prepare("SELECT COUNT(*) as c FROM users").get();
    const sellerCount = await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'seller'").get();
    const profileCount = await db.prepare("SELECT COUNT(*) as c FROM seller_profiles").get();
    const productCount = await db.prepare("SELECT COUNT(*) as c FROM products").get();
    const listingCount = await db.prepare("SELECT COUNT(*) as c FROM listings").get();

    console.log("=== Counts ===");
    console.log("Users:", userCount.c);
    console.log("Sellers (users):", sellerCount.c);
    console.log("Seller Profiles:", profileCount.c);
    console.log("Products:", productCount.c);
    console.log("Listings:", listingCount.c);

    console.log("=== Sellers ===");
    const sellers = await db.prepare(`
      SELECT u.id, u.email, u.full_name, sp.shop_name, sp.handle, sp.store_slug
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE u.role = 'seller'
      LIMIT 10
    `).all();
    console.log(JSON.stringify(sellers, null, 2));

    console.log("=== First 5 Products ===");
    const products = await db.prepare(`
      SELECT id, seller_id, category_id, name, price_paise, status
      FROM products
      LIMIT 5
    `).all();
    console.log(JSON.stringify(products, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
