const db = require('./db.js');

async function main() {
  try {
    const products = await db.prepare(`
      SELECT 
        p.id, p.name, p.seller_id,
        COALESCE(sp.shop_name, u.full_name) AS seller_name,
        (p.id IN (
          SELECT oi.product_id
          FROM order_items oi
          JOIN products p2 ON oi.product_id = p2.id
          JOIN orders o ON oi.order_id = o.id
          WHERE p2.seller_id = p.seller_id
            AND p2.status = 'active'
            AND o.status NOT IN ('cancelled', 'Cancelled', 'awaiting_payment', 'Awaiting Payment')
          GROUP BY oi.product_id
          HAVING SUM(oi.quantity) > 0
          ORDER BY SUM(oi.quantity) DESC, MAX(p2.created_at) DESC, oi.product_id DESC
          LIMIT 5
        )) AS is_bestseller,
        COALESCE((SELECT listing_type FROM listings WHERE title = p.name LIMIT 1), 'pre-made') AS listing_type
      FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE COALESCE(sp.shop_name, u.full_name) LIKE '%Kavya%'
    `).all();
    console.log("Kavya's products:", products);

    // Let's also check active orders
    const orders = await db.prepare(`
      SELECT o.id, o.order_ref, o.seller_id, o.status, oi.product_id, oi.product_name, oi.quantity
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      LIMIT 10
    `).all();
    console.log("Active orders and items:", orders);

  } catch (err) {
    console.error(err);
  }
}
main();
