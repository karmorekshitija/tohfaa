const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    console.log("=== LISTING ADMIN USERS ===");
    const admins = await db.prepare("SELECT id, username, password_hash, display_name FROM admin_users").all();
    console.log(admins);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
