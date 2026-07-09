const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');

async function main() {
  try {
    const userIds = [3, 21, 31, 35];
    console.log("=== INSPECTING KSHITIJA PASSWORD HASHES ===");
    for (const userId of userIds) {
      const user = await db.prepare("SELECT email, password_hash FROM users WHERE id = ?").get(userId);
      if (user) {
        console.log(`${user.email}: ${user.password_hash}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
