const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');
const bcrypt = require('bcrypt');

async function main() {
  try {
    const emails = [
      'shyamsagarkar@gmail.com',
      'kshitijakar@gmail.com',
      'karmorekshitija@gmail.com',
      'kavya@to.in'
    ];
    const newPassword = 'kshitija123';
    const saltRounds = 12;

    console.log("=== RESETTING PASSWORD FOR KSHITIJA ACCOUNTS ===");
    console.log(`New password will be: '${newPassword}'`);

    const newHash = await bcrypt.hash(newPassword, saltRounds);

    for (const email of emails) {
      const result = await db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(newHash, email);
      if (result.changes > 0) {
        console.log(`- Successfully reset password for: ${email}`);
      } else {
        console.log(`- Email not found or unchanged: ${email}`);
      }
    }
    console.log("=== PASSWORD RESET COMPLETED ===");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
