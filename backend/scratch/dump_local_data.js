const db = require('../src/db.js');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log("Extracting local data...");

    // 1. Sellers (users with role = 'seller')
    const sellers = await db.prepare("SELECT * FROM users WHERE role = 'seller'").all();
    console.log(`Found ${sellers.length} sellers.`);

    // 2. Seller profiles
    const profiles = await db.prepare("SELECT * FROM seller_profiles").all();
    console.log(`Found ${profiles.length} seller profiles.`);

    // 3. Store config
    const configs = await db.prepare("SELECT * FROM store_config").all();
    console.log(`Found ${configs.length} store configs.`);

    // 4. Products
    const products = await db.prepare("SELECT * FROM products").all();
    console.log(`Found ${products.length} products.`);

    // 5. Listings
    const listings = await db.prepare("SELECT * FROM listings").all();
    console.log(`Found ${listings.length} listings.`);

    // 6. Product images
    const productImages = await db.prepare("SELECT * FROM product_images").all();
    console.log(`Found ${productImages.length} product images.`);

    // 7. Listing images
    const listingImages = await db.prepare("SELECT * FROM listing_images").all();
    console.log(`Found ${listingImages.length} listing images.`);

    // 8. Categories
    const categories = await db.prepare("SELECT * FROM categories").all();
    console.log(`Found ${categories.length} categories.`);

    // 9. Subcategories
    const subcategories = await db.prepare("SELECT * FROM subcategories").all();
    console.log(`Found ${subcategories.length} subcategories.`);

    // 10. Listing subcategories
    const listingSubcategories = await db.prepare("SELECT * FROM listing_subcategories").all();
    console.log(`Found ${listingSubcategories.length} listing subcategories.`);

    // 11. Product subcategories
    const productSubcategories = await db.prepare("SELECT * FROM product_subcategories").all();
    console.log(`Found ${productSubcategories.length} product subcategories.`);

    const dump = {
      sellers,
      profiles,
      configs,
      categories,
      subcategories,
      products,
      listings,
      productImages,
      listingImages,
      listingSubcategories,
      productSubcategories
    };

    fs.writeFileSync(
      path.join(__dirname, 'local_dump.json'),
      JSON.stringify(dump, null, 2)
    );
    console.log("Dump saved to scratch/local_dump.json!");
    process.exit(0);
  } catch (err) {
    console.error("Extraction failed:", err);
    process.exit(1);
  }
}

main();
