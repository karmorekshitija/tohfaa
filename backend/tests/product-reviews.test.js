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
process.env.PORT = 5013;
const { app, server } = require('../src/server');
const jwt = require('jsonwebtoken');
const assert = require('assert');

const JWT_SECRET = process.env.JWT_SECRET || 'tohfa_super_secret_key_987654321';
const BASE_URL = 'http://localhost:5013';

async function runTests() {
  console.log("🚀 Starting E2E Product Reviews and Ratings Tests...");
  const db = require('../src/db');

  try {
    // 1. Create mock buyer, seller, products & orders in DB
    console.log("Setting up mock database tables...");
    
    // Cleanup
    await db.prepare("DELETE FROM reviews WHERE reviewer_id = 951 OR seller_id = 950").run();
    await db.prepare("DELETE FROM order_items WHERE order_id IN (851, 852, 853)").run();
    await db.prepare("DELETE FROM orders WHERE id IN (851, 852, 853)").run();
    await db.prepare("DELETE FROM products WHERE id IN (991, 992)").run();
    await db.prepare("DELETE FROM listings WHERE id = 791").run();
    await db.prepare("DELETE FROM seller_profiles WHERE user_id = 950").run();
    await db.prepare("DELETE FROM users WHERE id IN (950, 951)").run();

    // Insert Users
    await db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (950, 'seller_review@test.com', 'hash', 'Artisan Seller', 'seller')").run();
    await db.prepare("INSERT INTO seller_profiles (user_id, shop_name, is_approved) VALUES (950, 'Artisan Shop', 1)").run();
    await db.prepare("INSERT INTO users (id, email, password_hash, full_name, role) VALUES (951, 'buyer_review@test.com', 'hash', 'Reviewer Buyer', 'buyer')").run();

    // Insert Products
    await db.prepare("INSERT INTO products (id, seller_id, name, price_paise, stock_qty, status, avg_rating, review_count) VALUES (991, 950, 'Handcrafted Ceramic Mug', 1500, 10, 'active', 0, 0)").run();
    await db.prepare("INSERT INTO products (id, seller_id, name, price_paise, stock_qty, status, avg_rating, review_count) VALUES (992, 950, 'Unrelated Product', 2000, 5, 'active', 0, 0)").run();

    // Insert matching Listing for Mug to test listing lookup
    await db.prepare("INSERT INTO listings (id, seller_id, title, base_price, price_paise, listing_type, status) VALUES (791, 950, 'Handcrafted Ceramic Mug', 1500, 1500, 'pre-made', 'active')").run();

    // Insert Orders
    // Order 851: Delivered
    await db.prepare("INSERT INTO orders (id, order_ref, buyer_id, seller_id, status, subtotal_paise, shipping_paise, total_paise) VALUES (851, 'TF-REV1', 951, 950, 'Delivered', 1500, 100, 1600)").run();
    await db.prepare("INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity) VALUES (851, 991, 'Handcrafted Ceramic Mug', 1500, 1)").run();

    // Order 852: Processing (not Delivered)
    await db.prepare("INSERT INTO orders (id, order_ref, buyer_id, seller_id, status, subtotal_paise, shipping_paise, total_paise) VALUES (852, 'TF-REV2', 951, 950, 'Processing', 1500, 100, 1600)").run();
    await db.prepare("INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity) VALUES (852, 991, 'Handcrafted Ceramic Mug', 1500, 1)").run();

    // Generate JWT token for Buyer
    const token = jwt.sign({ user_id: 951 }, JWT_SECRET);

    console.log("✓ Mock setup completed. Starting boundary testing...");

    // Test 1: Validation error if order_id is missing
    console.log("Test 1: Posting review with missing order_id...");
    const res1 = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: 991, rating: 5, body: "Lovely mug!" })
    });
    assert.strictEqual(res1.status, 400);
    const data1 = await res1.status === 400 ? await res1.json() : null;
    assert.strictEqual(data1.code, "VALIDATION_ERROR");
    console.log("✓ Correctly returned 400 Validation Error.");

    // Test 2: Forbidden error if order is not Delivered
    console.log("Test 2: Posting review on an order that is still 'Processing'...");
    const res2 = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: 991, order_id: 852, rating: 4, body: "Great!" })
    });
    assert.strictEqual(res2.status, 403);
    console.log("✓ Correctly returned 403 Forbidden for non-delivered order.");

    // Test 3: Forbidden error if product does not exist in order items
    console.log("Test 3: Posting review for a product not in the order...");
    const res3 = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: 992, order_id: 851, rating: 5, body: "Cheat review!" })
    });
    assert.strictEqual(res3.status, 403);
    console.log("✓ Correctly returned 403 Forbidden for product not in order.");

    // Test 4: Successful review creation
    console.log("Test 4: Posting valid review for delivered order item...");
    const res4 = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: 991, order_id: 851, rating: 5, body: "Stunning craftsmanship and finish." })
    });
    assert.strictEqual(res4.status, 201);
    const data4 = await res4.json();
    assert.strictEqual(data4.success, true);
    assert.strictEqual(data4.data.rating, 5);
    console.log("✓ Successfully created review and returned 201.");

    // Test 5: Verify reviews database fields (seller_id, listing_id) are populated correctly
    console.log("Test 5: Verifying populated reviews fields in DB...");
    const dbReview = await db.prepare("SELECT * FROM reviews WHERE order_id = 851 AND product_id = 991").get();
    assert.ok(dbReview);
    assert.strictEqual(dbReview.seller_id, 950, "seller_id should be populated");
    assert.strictEqual(dbReview.listing_id, 791, "listing_id should be matched and populated");
    console.log("✓ Reviews fields are populated correctly.");

    // Test 6: Verify product rating metrics are recalculated and updated
    console.log("Test 6: Verifying product table rating metrics...");
    const product = await db.prepare("SELECT avg_rating, review_count FROM products WHERE id = 991").get();
    assert.strictEqual(product.review_count, 1);
    assert.strictEqual(product.avg_rating, 5.0);
    console.log("✓ Product table ratings are recalculated correctly.");

    // Test 7: Verify is_reviewed is returned in GET /api/orders/:id
    console.log("Test 7: Verifying GET /api/orders/:id returns is_reviewed...");
    const res7 = await fetch(`${BASE_URL}/api/orders/851`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.strictEqual(res7.status, 200);
    const data7 = await res7.json();
    const mugItem = data7.data.items.find(i => i.product_id === 991);
    assert.ok(mugItem);
    assert.strictEqual(mugItem.is_reviewed, true, "is_reviewed should be true");
    console.log("✓ GET /api/orders/:id successfully returns is_reviewed: true.");

    // Test 8: Verify duplicate review check fails with 409
    console.log("Test 8: Posting duplicate review for same product and order...");
    const res8 = await fetch(`${BASE_URL}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ product_id: 991, order_id: 851, rating: 3, body: "Second try." })
    });
    assert.strictEqual(res8.status, 409);
    console.log("✓ Correctly returned 409 Conflict for duplicate review.");

    // Test 9: Verify GET /api/products/:id returns reviews with avatar and display name
    console.log("Test 9: Verifying GET /api/products/:id response format...");
    const res9 = await fetch(`${BASE_URL}/api/products/991`);
    assert.strictEqual(res9.status, 200);
    const data9 = await res9.json();
    assert.strictEqual(data9.data.review_count, 1);
    assert.strictEqual(data9.data.avg_rating, 5.0);
    assert.ok(data9.data.recent_reviews);
    assert.strictEqual(data9.data.recent_reviews.length, 1);
    assert.strictEqual(data9.data.recent_reviews[0].reviewer_name, "Reviewer Buyer");
    assert.strictEqual(data9.data.recent_reviews[0].reviewer_avatar, "/uploads/avatars/default-avatar.png"); // R6 fallback avatar
    console.log("✓ GET /api/products/:id successfully returned reviews with name and avatar.");

    console.log("\n🎉 ALL PRODUCT REVIEW & RATING TESTS PASSED SUCCESSFULLY!");
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
