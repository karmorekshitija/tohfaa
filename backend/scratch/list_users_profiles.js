const db = require('../src/db');

async function main() {
  try {
    console.log("Searching users...");
    const users = await db.prepare("SELECT id, email, full_name, role FROM users").all();
    console.log("Users:", users);

    console.log("\nSearching seller profiles...");
    const profiles = await db.prepare("SELECT user_id, shop_name FROM seller_profiles").all();
    console.log("Profiles:", profiles);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
