const db = require('../backend/src/db.js');

async function forceLink() {
  const userId = 21; // user_id for kshitijakar@gmail.com
  const phone = '+979755329298';
  const now = new Date().toISOString();

  try {
    // 1. Update seller_profiles
    const resProfile = await db.prepare(`
      UPDATE seller_profiles
      SET whatsapp_number = ?,
          whatsapp_verified_at = ?,
          whatsapp_pending_number = NULL,
          whatsapp_otp = NULL,
          whatsapp_otp_expires_at = NULL
      WHERE user_id = ?
    `).run(phone, now, userId);

    // 2. Update sellers
    const resSeller = await db.prepare(`
      UPDATE sellers
      SET whatsapp_number = ?,
          whatsapp_verified_at = ?,
          whatsapp_pending_number = NULL,
          whatsapp_otp = NULL,
          whatsapp_otp_expires_at = NULL
      WHERE user_id = ?
    `).run(phone, now, userId);

    console.log('Update results:');
    console.log('seller_profiles affected rows:', resProfile.changes);
    console.log('sellers affected rows:', resSeller.changes);

    process.exit(0);
  } catch (err) {
    console.error('Failed to link WhatsApp number:', err);
    process.exit(1);
  }
}

forceLink();
