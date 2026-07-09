const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    console.log("=== INSPECTING SELLER APPLICATIONS ===");
    
    // Check if seller_applications table exists
    const checkTable = await db.prepare(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'seller_applications'
    `).get();

    if (!checkTable) {
      console.log("Table 'seller_applications' does not exist in PostgreSQL public schema.");
      return;
    }

    const apps = await db.prepare("SELECT * FROM seller_applications").all();
    console.log("All seller applications in DB:", apps);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
