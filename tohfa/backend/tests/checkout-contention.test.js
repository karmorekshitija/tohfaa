// Mock the @google/generative-ai module before requiring server.js
const mockGenAI = {
  GoogleGenerativeAI: class {
    constructor(apiKey) { this.apiKey = apiKey; }
    getGenerativeModel() {
      return { generateContent: async () => ({ response: { text: () => "{}" } }) };
    }
  }
};
require('module').prototype.require = (function(orgRequire) {
  return function(path) {
    if (path === '@google/generative-ai') { return mockGenAI; }
    return orgRequire.apply(this, arguments);
  };
})(require('module').prototype.require);

// Run test server on a different port
process.env.PORT = 5012;
const { app, server } = require('../src/server');
const jwt = require('jsonwebtoken');
const assert = require('assert');

const JWT_SECRET = process.env.JWT_SECRET || 'tohfa_super_secret_key_987654321';
const BASE_URL = 'http://localhost:5012';

async function runTests() {
  console.log("🚀 Starting E2E Checkout Contention & Loyalty Tiebreak Tests...");
  const db = require('../src/db');

  try {
    // 1. Create mock buyers & seller in DB
    console.log("Creating mock buyers and seller...");
    // Cleanup first
    await db.prepare("DELETE FROM checkout_contention_attempts").run();
    await db.prepare("DELETE FROM order_items").run();
    await db.prepare("DELETE FROM orders WHERE buyer_id IN (901, 902) OR seller_id = 900").run();
    await db.prepare("DELETE FROM cart_items WHERE user_id IN (901, 902)").run();
    await db.prepare("DELETE FROM addresses WHERE user_id IN (901, 902)").run();
    await db.prepare("DELETE FROM products WHERE id = 999").run();
    await db.prepare("DELETE FROM users WHERE id IN (900, 901, 902)").run();

    // Insert Users
    await db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (900, 'seller_test@test.com', 'hash', 'Test Seller', 'seller')").run();
    await db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (901, 'buyer_a@test.com', 'hash', 'Buyer A (Loyal)', 'buyer')").run();
    await db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (902, 'buyer_b@test.com', 'hash', 'Buyer B (New)', 'buyer')").run();

    // Insert Addresses
    await db.prepare("INSERT INTO addresses (id, user_id, full_name, line1, city, state, pincode, phone, is_default) VALUES (801, 901, 'Buyer A', 'Line 1', 'City', 'State', '123456', '9999999999', 1)").run();
    await db.prepare("INSERT INTO addresses (id, user_id, full_name, line1, city, state, pincode, phone, is_default) VALUES (802, 902, 'Buyer B', 'Line 1', 'City', 'State', '123456', '9999999999', 1)").run();

    // Insert Product with stock_qty = 1
    await db.prepare("INSERT INTO products (id, seller_id, name, price_paise, stock_qty, status) VALUES (999, 900, 'Last Artisan Candle', 2000, 1, 'active')").run();

    // Insert completed orders for Buyer A (Loyal) to give them higher completed order count (3 vs 0)
    await db.prepare("INSERT INTO orders (id, order_ref, buyer_id, seller_id, address_id, status, subtotal_paise, shipping_paise, total_paise) VALUES (701, 'TF-L1', 901, 900, 801, 'Delivered', 2000, 120, 2120)").run();
    await db.prepare("INSERT INTO orders (id, order_ref, buyer_id, seller_id, address_id, status, subtotal_paise, shipping_paise, total_paise) VALUES (702, 'TF-L2', 901, 900, 801, 'Delivered', 2000, 120, 2120)").run();
    await db.prepare("INSERT INTO orders (id, order_ref, buyer_id, seller_id, address_id, status, subtotal_paise, shipping_paise, total_paise) VALUES (703, 'TF-L3', 901, 900, 801, 'Delivered', 2000, 120, 2120)").run();

    // Generate JWT tokens
    const tokenA = jwt.sign({ user_id: 901 }, JWT_SECRET);
    const tokenB = jwt.sign({ user_id: 902 }, JWT_SECRET);

    // Add product to cart for both buyers
    await db.prepare("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (901, 999, 1)").run();
    await db.prepare("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (902, 999, 1)").run();

    console.log("✓ Mock setup completed.");

    // 2. Buyer B (New) checks out (T = 0)
    console.log("Step 2: Buyer B (0 orders) attempts checkout first...");
    const resB = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ address_id: 802 })
    });
    assert.strictEqual(resB.status, 200);
    const dataB = await resB.json();
    console.log("Buyer B Response Data:", dataB);
    assert.strictEqual(dataB.status, 'contention_pending');
    const attemptB_id = dataB.attempt_id;
    console.log(`✓ Buyer B placed in contention. Attempt ID: ${attemptB_id}`);

    // 3. Buyer A (Loyal) checks out (T = 100ms)
    console.log("Step 3: Buyer A (3 orders) attempts checkout second...");
    const resA = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({ address_id: 801 })
    });
    assert.strictEqual(resA.status, 200);
    const dataA = await resA.json();
    console.log("Buyer A Response Data:", dataA);
    assert.strictEqual(dataA.status, 'contention_pending');
    const attemptA_id = dataA.attempt_id;
    console.log(`✓ Buyer A placed in contention. Attempt ID: ${attemptA_id}`);

    // 4. Wait for the resolution window (2.5 seconds + 500ms safety)
    console.log("Waiting 3 seconds for async contention resolver...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Poll for Buyer A (Loyal)
    console.log("Step 5: Polling contention status for Buyer A (Loyal)...");
    const pollA = await fetch(`${BASE_URL}/api/checkout/contention/${attemptA_id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.strictEqual(pollA.status, 200);
    const pollDataA = await pollA.json();
    console.log("Buyer A Poll Data:", pollDataA.data);
    assert.strictEqual(pollDataA.data.status, 'won', "Buyer A should win because of higher completed order count (3 vs 0)");
    assert.ok(pollDataA.data.order_id, "Buyer A should have a generated order_id");
    assert.ok(pollDataA.data.order_ref, "Buyer A should have a generated order_ref");

    // 6. Poll for Buyer B (New)
    console.log("Step 6: Polling contention status for Buyer B (New)...");
    const pollB = await fetch(`${BASE_URL}/api/checkout/contention/${attemptB_id}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.strictEqual(pollB.status, 200);
    const pollDataB = await pollB.json();
    console.log("Buyer B Poll Data:", pollDataB.data);
    assert.strictEqual(pollDataB.data.status, 'lost', "Buyer B should lose");
    assert.strictEqual(pollDataB.data.order_id, null);

    // 7. Verify product stock is decremented to 0
    console.log("Step 7: Verifying product stock is 0...");
    const prod = await db.prepare("SELECT stock_qty FROM products WHERE id = 999").get();
    assert.strictEqual(prod.stock_qty, 0, "Product stock should be decremented to 0");
    console.log("✓ Product stock is correctly decremented to 0.");

    // 8. Verify winner order is created
    console.log("Step 8: Verifying order details for Buyer A...");
    const ord = await db.prepare("SELECT buyer_id, total_paise, status FROM orders WHERE id = ?").get(pollDataA.data.order_id);
    assert.ok(ord);
    assert.strictEqual(ord.buyer_id, 901, "Order should belong to Buyer A");
    assert.strictEqual(ord.status, 'Awaiting Payment', "Order status should be Awaiting Payment");
    console.log("✓ Winner order exists and matches details.");

    // 9. Verify cart items are cleared for Winner, but retained for Loser
    console.log("Step 9: Verifying cart items cleanup...");
    const cartA = Number(await db.prepare("SELECT COUNT(*) as count FROM cart_items WHERE user_id = 901 AND product_id = 999").get().count);
    const cartB = Number(await db.prepare("SELECT COUNT(*) as count FROM cart_items WHERE user_id = 902 AND product_id = 999").get().count);
    assert.strictEqual(cartA, 0, "Winner cart item should be deleted");
    assert.strictEqual(cartB, 1, "Loser cart item should be preserved so they see it is out of stock");
    console.log("✓ Winner cart cleared, Loser cart preserved.");

    console.log("\n🎉 ALL CHECKOUT CONTENTION & TIEBREAK TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exitCode = 1;
  } finally {
    console.log("Shutting down test server...");
    server.close();
    process.exit(process.exitCode || 0);
  }
}

// Allow server to initialize
setTimeout(runTests, 1000);
