const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    console.log("=== LISTING ALL USERS IN POSTGRES ===");
    const users = await db.prepare("SELECT id, email, full_name, role, created_at FROM users ORDER BY id DESC").all();
    console.log(users);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
