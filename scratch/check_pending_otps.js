const db = require('../backend/src/db.js');

async function check() {
  try {
    const pendingSellers = await db.prepare(`
      SELECT user_id, whatsapp_number, whatsapp_pending_number, whatsapp_otp, whatsapp_otp_expires_at, whatsapp_otp_count 
      FROM sellers 
      WHERE whatsapp_pending_number IS NOT NULL OR whatsapp_otp IS NOT NULL
    `).all();
    console.log('--- Pending OTPs in sellers ---');
    console.log(JSON.stringify(pendingSellers, null, 2));

    const pendingProfiles = await db.prepare(`
      SELECT user_id, whatsapp_number, whatsapp_pending_number, whatsapp_otp, whatsapp_otp_expires_at, whatsapp_otp_count 
      FROM seller_profiles 
      WHERE whatsapp_pending_number IS NOT NULL OR whatsapp_otp IS NOT NULL
    `).all();
    console.log('--- Pending OTPs in seller_profiles ---');
    console.log(JSON.stringify(pendingProfiles, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

check();
