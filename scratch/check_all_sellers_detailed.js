const db = require('../backend/src/db.js');

async function check() {
  try {
    const sellers = await db.prepare(`
      SELECT 
        u.id as user_id, 
        u.email, 
        u.role,
        sp.id as profile_id, 
        sp.shop_name,
        sp.whatsapp_number as profile_wa, 
        sp.whatsapp_pending_number as profile_pending,
        sp.whatsapp_otp as profile_otp,
        s.id as seller_table_id,
        s.whatsapp_number as seller_wa
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE u.role = 'seller'
      ORDER BY u.id DESC
    `).all();
    console.log('--- Detailed Sellers Status ---');
    console.log(JSON.stringify(sellers, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
