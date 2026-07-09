const Database = require('better-sqlite3');
const path = require('path');

async function main() {
  try {
    const dbPath = path.join(__dirname, '..', 'tohfa.db');
    console.log("=== INSPECTING SQLITE SELLER APPLICATIONS: " + dbPath + " ===");
    const db = new Database(dbPath);
    
    // Check if seller_applications table exists
    const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seller_applications'").get();
    if (!checkTable) {
      console.log("Table 'seller_applications' does not exist in SQLite.");
      db.close();
      return;
    }

    const apps = db.prepare("SELECT * FROM seller_applications").all();
    console.log("Applications in SQLite:", apps);
    db.close();
  } catch (err) {
    console.error(err);
  }
}

main();
