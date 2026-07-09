const db = require('../backend/src/db.js');

async function check() {
  try {
    const allUsers = await db.prepare(`
      SELECT id, email, role, is_active, is_banned FROM users ORDER BY id DESC LIMIT 5
    `).all();
    console.log('--- Latest Users ---');
    console.log(JSON.stringify(allUsers, null, 2));

    const latestSellers = await db.prepare(`
      SELECT user_id, whatsapp_number, whatsapp_verified_at, whatsapp_pending_number, whatsapp_otp FROM sellers ORDER BY user_id DESC LIMIT 5
    `).all();
    console.log('--- Latest Sellers ---');
    console.log(JSON.stringify(latestSellers, null, 2));

    const latestProfiles = await db.prepare(`
      SELECT id, user_id, whatsapp_number, whatsapp_verified_at, whatsapp_pending_number, whatsapp_otp FROM seller_profiles ORDER BY id DESC LIMIT 5
    `).all();
    console.log('--- Latest Seller Profiles ---');
    console.log(JSON.stringify(latestProfiles, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
