const Database = require('better-sqlite3');
const path = require('path');

async function main() {
  try {
    const dbPath = path.join(__dirname, '..', 'tohfa.db');
    console.log("=== INSPECTING SQLITE DB: " + dbPath + " ===");
    const db = new Database(dbPath);
    
    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log("Tables found in SQLite:", tables.map(t => t.name));
    
    if (tables.some(t => t.name === 'users')) {
      const users = db.prepare("SELECT id, email, full_name, role FROM users").all();
      console.log(`\nUsers in SQLite (${users.length} found):`, users);
    }
    
    if (tables.some(t => t.name === 'seller_profiles')) {
      const profiles = db.prepare("SELECT user_id, shop_name FROM seller_profiles").all();
      console.log(`\nSeller Profiles in SQLite (${profiles.length} found):`, profiles);
    }
    
    if (tables.some(t => t.name === 'listings')) {
      const listingsCount = db.prepare("SELECT COUNT(*) as count FROM listings").get();
      console.log(`\nListings count in SQLite:`, listingsCount.count);
    }
    
    if (tables.some(t => t.name === 'products')) {
      const productsCount = db.prepare("SELECT COUNT(*) as count FROM products").get();
      console.log(`\nProducts count in SQLite:`, productsCount.count);
    }

    db.close();
  } catch (err) {
    console.error("Error inspecting SQLite database:", err);
  }
}

main();
