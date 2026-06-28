const db = require('./src/db.js');

async function main() {
  try {
    const users = await db.prepare("SELECT id, email, role, avatar_url FROM users WHERE role = 'seller' LIMIT 5").all();
    console.log('Sellers from users:', users);

    const profiles = await db.prepare("SELECT user_id, shop_name, banner_url FROM seller_profiles LIMIT 5").all();
    console.log('Profiles:', profiles);

    const configs = await db.prepare("SELECT seller_id, banner_url FROM store_config LIMIT 5").all();
    console.log('Configs:', configs);
  } catch (err) {
    console.error(err);
  }
}

main();

