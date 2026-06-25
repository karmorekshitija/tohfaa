const db = require('../src/db');

async function main() {
  try {
    const listing = await db.prepare("SELECT * FROM listings WHERE id = 48").get();
    console.log("Listing 48:", listing);
    if (listing) {
      const seller = await db.prepare("SELECT * FROM users WHERE id = ?").get(listing.seller_id);
      console.log("Seller for Listing 48:", seller);
      const sellerProfile = await db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(listing.seller_id);
      console.log("Seller Profile:", sellerProfile);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
