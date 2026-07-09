const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');
const bcrypt = require('bcrypt');

async function main() {
  try {
    const username = 'admin';
    const newPassword = 'admin123';
    console.log(`=== RESETTING ADMIN PASSWORD FOR '${username}' ===`);

    const newHash = await bcrypt.hash(newPassword, 12);
    const result = await db.prepare("UPDATE admin_users SET password_hash = ? WHERE username = ?").run(newHash, username);
    
    if (result.changes > 0) {
      console.log(`Successfully reset password for '${username}' to '${newPassword}'`);
    } else {
      console.log(`Admin user '${username}' not found or password unchanged.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
