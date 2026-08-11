const cron = require('node-cron');
const db = require('../db');
const whatsappService = require('./whatsappService');

function startOccasionReminderCron() {
  // Schedule to run every day at 9:00 AM IST / local
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily occasion reminder cron job...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const occasions = await db.prepare(`
        SELECT o.id, o.user_id, o.title, o.occasion_type, o.date, o.reminder_days, o.notes,
               u.full_name, u.phone
        FROM occasions o
        JOIN users u ON o.user_id = u.id
        WHERE u.is_active = 1 AND u.is_banned = 0
      `).all();

      for (const occ of occasions) {
        if (!occ.date || !occ.phone) continue;

        const occDate = new Date(occ.date);
        const thisYear = today.getFullYear();
        let nextOcc = new Date(thisYear, occDate.getMonth(), occDate.getDate());
        if (nextOcc < today) {
          nextOcc.setFullYear(thisYear + 1);
        }

        const diffTime = nextOcc.getTime() - today.getTime();
        const daysUntil = Math.round(diffTime / (1000 * 3600 * 24));

        const reminderDays = occ.reminder_days || 7;

        if (daysUntil === reminderDays) {
          const msg = `🎉 Hi ${occ.full_name || 'there'}! Reminder: "${occ.title}" is coming up in ${daysUntil} days on ${occ.date}. Find the perfect handcrafted gift on TohfaHub today! 🎁`;
          try {
            await whatsappService.sendWhatsAppTextMessage(occ.phone, msg);
            console.log(`Sent occasion reminder to ${occ.phone} for occasion "${occ.title}"`);
          } catch (waErr) {
            console.error(`Failed to send WhatsApp reminder to ${occ.phone}:`, waErr.message);
          }
        }
      }
    } catch (err) {
      console.error('Error in occasion reminder cron job:', err);
    }
  });
}

module.exports = { startOccasionReminderCron };
