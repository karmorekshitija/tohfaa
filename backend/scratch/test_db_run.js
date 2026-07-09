const db = require('../src/db');

async function run() {
  // Let's run a test insert
  const res = await db.prepare("INSERT INTO conversations (seller_id, buyer_id, listing_id, status, intake_complete, product_type_tag, request_type, order_id) VALUES (8, 3, 2, 'awaiting_seller', 1, 'customization', 'customization', 21)").run();
  console.log('run res:', res);
  console.log('run res.lastInsertRowid:', typeof res.lastInsertRowid, res.lastInsertRowid);
  
  // Clean up
  if (res.lastInsertRowid) {
    const delRes = await db.prepare("DELETE FROM conversations WHERE id = ?").run(res.lastInsertRowid);
    console.log('delete res:', delRes);
  }
}

run();
