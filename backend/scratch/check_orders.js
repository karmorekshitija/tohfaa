const db = require('../src/db');

async function check() {
  try {
    const products = await db.prepare("SELECT id, name, price_paise FROM products WHERE seller_id = 8").all();
    console.log('Products for Seller 8:', products);
  } catch (err) {
    console.error('Error querying products:', err);
  }
}

check();
