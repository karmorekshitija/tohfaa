const db = require('../src/db.js');

async function main() {
  try {
    const cats = await db.prepare("SELECT id, name, is_active, sort_order FROM categories").all();
    console.log('Categories in DB:', cats);
  } catch (err) {
    console.error(err);
  }
}

main();
