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
process.env.PORT = 5015;
const { app, server } = require('../src/server');
const jwt = require('jsonwebtoken');
const assert = require('assert');

const JWT_SECRET = process.env.JWT_SECRET || 'tohfa_super_secret_key_987654321';
const BASE_URL = 'http://localhost:5015';

async function runTests() {
  console.log("🚀 Starting E2E Seller Restrictions Tests...");
  const db = require('../src/db');

  async function performCascadingCleanup() {
    await db.prepare("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR user_id IN (960, 961)").run();
    await db.prepare("DELETE FROM message_threads WHERE buyer_id IN (960, 961) OR seller_id IN (960, 961) OR buyer_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM custom_offers WHERE seller_id IN (960, 961) OR buyer_id IN (960, 961) OR seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR buyer_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM conversation_messages WHERE sender_id IN (960, 961) OR sender_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM conversations WHERE buyer_id IN (960, 961) OR seller_id IN (960, 961) OR buyer_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM reviews WHERE reviewer_id IN (960, 961) OR seller_id IN (960, 961) OR reviewer_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM order_items WHERE product_id IN (995, 996) OR product_id IN (SELECT id FROM products WHERE seller_id IN (960, 961) OR seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')))").run();
    await db.prepare("DELETE FROM orders WHERE buyer_id IN (960, 961) OR seller_id IN (960, 961) OR buyer_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM listings WHERE seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR seller_id IN (960, 961) OR id IN (795, 796)").run();
    await db.prepare("DELETE FROM products WHERE seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR seller_id IN (960, 961) OR id IN (995, 996)").run();
    await db.prepare("DELETE FROM addresses WHERE user_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR user_id IN (960, 961) OR id = 888").run();
    await db.prepare("DELETE FROM cart_items WHERE user_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR user_id IN (960, 961)").run();
    await db.prepare("DELETE FROM wishlists WHERE user_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com')) OR user_id IN (960, 961)").run();
    await db.prepare("DELETE FROM store_config WHERE seller_id IN (960, 961) OR seller_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM seller_profiles WHERE user_id IN (960, 961) OR user_id IN (SELECT id FROM users WHERE email IN ('seller_test@test.com', 'buyer_test@test.com'))").run();
    await db.prepare("DELETE FROM users WHERE id IN (960, 961) OR email IN ('seller_test@test.com', 'buyer_test@test.com')").run();
  }

  try {
    console.log("Setting up mock database tables...");
    await performCascadingCleanup();

    // Insert Users
    await db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (960, 'seller_test@test.com', 'hash', 'Test Seller', 'seller')").run();
    await db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (961, 'buyer_test@test.com', 'hash', 'Test Buyer', 'buyer')").run();

    // Insert Products
    await db.prepare("INSERT INTO products (id, seller_id, name, price_paise, stock_qty, status) VALUES (995, 960, 'Seller Product', 1500, 10, 'active')").run();
    await db.prepare("INSERT INTO products (id, seller_id, name, price_paise, stock_qty, status) VALUES (996, 961, 'Buyer Product', 2000, 5, 'active')").run();

    // Insert Listings
    await db.prepare("INSERT INTO listings (id, seller_id, title, base_price, price_paise, listing_type, status) VALUES (795, 960, 'Seller Listing', 1500, 1500, 'pre-made', 'active')").run();
    await db.prepare("INSERT INTO listings (id, seller_id, title, base_price, price_paise, listing_type, status) VALUES (796, 961, 'Buyer Listing', 2000, 2000, 'pre-made', 'active')").run();

    // Generate JWT token for Seller
    const token = jwt.sign({ user_id: 960 }, JWT_SECRET);

    console.log("✓ Mock setup completed. Starting boundary testing...");

    // Test 1: POST /api/cart/items with own product returns 403 OWN_PRODUCT_FORBIDDEN
    console.log("Test 1: Adding own product to cart...");
    const res1 = await fetch(`${BASE_URL}/api/cart/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: 995, quantity: 1 })
    });
    assert.strictEqual(res1.status, 403);
    const data1 = await res1.json();
    assert.strictEqual(data1.error, true);
    assert.strictEqual(data1.code, "OWN_PRODUCT_FORBIDDEN");
    assert.strictEqual(data1.message, "Sellers cannot purchase their own products");
    console.log("✓ Correctly blocked adding own product to cart with 403 OWN_PRODUCT_FORBIDDEN.");

    // Test 2: POST /api/wishlist/:productId with own product returns 403 OWN_PRODUCT_FORBIDDEN
    console.log("Test 2: Adding own product to wishlist...");
    const res2 = await fetch(`${BASE_URL}/api/wishlist/995`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    assert.strictEqual(res2.status, 403);
    const data2 = await res2.json();
    assert.strictEqual(data2.error, true);
    assert.strictEqual(data2.code, "OWN_PRODUCT_FORBIDDEN");
    assert.strictEqual(data2.message, "Sellers cannot wishlist their own products");
    console.log("✓ Correctly blocked adding own product to wishlist with 403 OWN_PRODUCT_FORBIDDEN.");

    // Test 3: POST /api/orders with own product in cart returns 403 OWN_PRODUCT_FORBIDDEN
    console.log("Test 3: Placing order containing own product...");
    // Direct SQL insert to bypass cart protection for testing order validation
    await db.prepare("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (960, 995, 1)").run();
    // Insert address for user
    await db.prepare("INSERT INTO addresses (id, user_id, full_name, line1, city, state, pincode, phone, is_default) VALUES (888, 960, 'Test Seller', '123 Test St', 'Test City', 'State', '123456', '1234567890', 1)").run();
    
    const res3 = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ address_id: 888 })
    });
    assert.strictEqual(res3.status, 403);
    const data3 = await res3.json();
    assert.strictEqual(data3.error, true);
    assert.strictEqual(data3.code, "OWN_PRODUCT_FORBIDDEN");
    assert.strictEqual(data3.message, "Sellers cannot purchase their own products");
    console.log("✓ Correctly blocked order placement with own product with 403 OWN_PRODUCT_FORBIDDEN.");

    // Test 4: POST /api/conversations starting chat with oneself returns 403 OWN_CHAT_FORBIDDEN
    console.log("Test 4: Starting chat with oneself...");
    const res4 = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ listing_id: 795, product_type_tag: "Custom Item" })
    });
    assert.strictEqual(res4.status, 403);
    const data4 = await res4.json();
    assert.strictEqual(data4.error, true);
    assert.strictEqual(data4.code, "OWN_CHAT_FORBIDDEN");
    assert.strictEqual(data4.message, "Sellers cannot start a chat with themselves");
    console.log("✓ Correctly blocked starting chat with oneself with 403 OWN_CHAT_FORBIDDEN.");

    console.log("\n🎉 ALL SELLER RESTRICTIONS TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exitCode = 1;
  } finally {
    console.log("Cleaning up mock database tables...");
    await performCascadingCleanup();

    console.log("Shutting down test server...");
    server.close();
    process.exit(process.exitCode || 0);
  }
}

// Allow server to initialize
setTimeout(runTests, 1000);
