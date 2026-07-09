const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db');
const bcrypt = require('bcrypt');

const commonPasswords = [
  'kshitija123',
  'admin123',
  'password123',
  '123456',
  'password',
  'tohfa123',
  'tohfa',
  'kavya123',
  'ananya123',
  'vihaan123',
  'isha123',
  'diya123',
  'aarav123',
  'vikram123',
  'riya123',
  'aman123',
  'sneha123'
];

async function main() {
  try {
    console.log("=== SCANNING ALL USERS ===");
    const users = await db.prepare("SELECT id, email, password_hash, full_name, role FROM users ORDER BY id DESC").all();
    
    for (const u of users) {
      let matchedPassword = "Unknown";
      
      // Try to match with common passwords
      for (const p of commonPasswords) {
        try {
          if (u.password_hash === 'hash') {
            matchedPassword = "Test Token Mock ('hash')";
            break;
          }
          if (await bcrypt.compare(p, u.password_hash)) {
            matchedPassword = p;
            break;
          }
        } catch (e) {}
      }
      
      console.log(`- [${u.role.toUpperCase()}] ID: ${u.id} | Name: ${u.full_name} | Email: ${u.email} | Password: ${matchedPassword} | Hash: ${u.password_hash}`);
    }
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
