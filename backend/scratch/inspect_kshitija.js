const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    console.log("=== INSPECTING KSHITIJA USER RECORD ===");
    
    // Search users by name or email
    const users = await db.prepare(`
      SELECT id, email, full_name, role, is_active, is_banned 
      FROM users 
      WHERE full_name LIKE '%Kshitija%' OR email LIKE '%kshitija%' OR email = 'shyamsagarkar@gmail.com'
    `).all();
    console.log("Matching users:", users);

    for (const u of users) {
      // Check seller_profiles
      const profile = await db.prepare("SELECT * FROM seller_profiles WHERE user_id = ?").get(u.id);
      console.log(`\nSeller Profile for user_id = ${u.id}:`, profile);

      // Check seller applications or pending approvals table if they exist
      const apps = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seller_applications'").get();
      if (apps) {
        const appRecord = await db.prepare("SELECT * FROM seller_applications WHERE user_id = ?").get(u.id);
        console.log(`\nSeller Application for user_id = ${u.id}:`, appRecord);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
