const db = require('../src/db');

async function insert() {
  try {
    // 1. Get product image
    const img = await db.prepare("SELECT url FROM product_images WHERE product_id = 6 LIMIT 1").get();
    const imageUrl = img ? img.url : 'https://placehold.co/120x120/f4ede3/516447?text=Coasters';

    // 2. Insert item into order_items
    await db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity, image_url)
      VALUES (21, 6, 'Ceramic Coasters With Lavender H', 49900, 1, ?)
    `).run(imageUrl);

    // 3. Update order subtotal/total paise for completeness
    await db.prepare("UPDATE orders SET subtotal_paise = 49900, shipping_paise = 100, total_paise = 50000 WHERE id = 21").run();

    console.log('Successfully seeded order_items for TF-DUMMY-5!');
  } catch (err) {
    console.error('Error seeding order item:', err);
  }
}

insert();
