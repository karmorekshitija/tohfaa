const db = require('../src/db');

async function main() {
  try {
    const notifications = await db.prepare("SELECT * FROM notifications WHERE conversation_id = 5").all();
    console.log("Notifications for Conversation 5:", notifications);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
