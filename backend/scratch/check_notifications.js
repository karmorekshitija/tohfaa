const db = require('../src/db');

async function main() {
  try {
    const userId = 6;
    console.log("Checking notifications for Kavya (user_id = 6)...");
    const notifications = await db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20").all(userId);
    console.log(notifications);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
