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
process.env.PORT = 5016;
const { app, server } = require('../src/server');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const { syncListingToProduct } = require('../src/services/listingSync');

const JWT_SECRET = process.env.JWT_SECRET || 'tohfa_super_secret_key_987654321';
const BASE_URL = 'http://localhost:5016';

async function runTests() {
  console.log("🚀 Starting E2E Category Pipeline Tests...");
  const db = require('../src/db');

  async function performCascadingCleanup() {
    try {
      // Delete listing/product dependencies first
      await db.prepare("DELETE FROM product_subcategories WHERE subcategory_id = 990001 OR product_id IN (SELECT id FROM products WHERE seller_id = 990002)").run();
      await db.prepare("DELETE FROM listing_subcategories WHERE subcategory_id = 990001 OR listing_id IN (SELECT id FROM listings WHERE seller_id = 990002)").run();
      await db.prepare("DELETE FROM products WHERE seller_id = 990002 OR category_id = 990001").run();
      await db.prepare("DELETE FROM listings WHERE seller_id = 990002 OR category_id = 990001").run();
      
      // Delete subcategories
      await db.prepare("DELETE FROM subcategories WHERE id = 990001 OR category_id = 990001").run();
      
      // Delete categories
      await db.prepare("DELETE FROM categories WHERE id = 990001 OR slug = 'test-regression-category'").run();

      // Delete users
      await db.prepare("DELETE FROM seller_profiles WHERE user_id = 990002").run();
      await db.prepare("DELETE FROM admin_users WHERE id = 990001 OR username = 'admin_test_pipeline'").run();
      await db.prepare("DELETE FROM users WHERE id IN (990002, 990003) OR email IN ('seller_test_pipeline@test.com', 'buyer_test_pipeline@test.com')").run();
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }

  try {
    console.log("Setting up mock database tables...");
    await performCascadingCleanup();

    // 1. Setup users
    await db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES (990002, 'seller_test_pipeline@test.com', 'hash', 'Test Pipeline Seller', 'seller')
    `).run();
    await db.prepare(`
      INSERT INTO seller_profiles (id, user_id, shop_name, is_approved)
      VALUES (990002, 990002, 'Pipeline Seller Shop', 1)
    `).run();
    await db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES (990003, 'buyer_test_pipeline@test.com', 'hash', 'Test Pipeline Buyer', 'buyer')
    `).run();
    await db.prepare(`
      INSERT INTO admin_users (id, username, email, password_hash, role, display_name, is_active)
      VALUES (990001, 'admin_test_pipeline', 'admin_test_pipeline@test.com', 'hash', 'super_admin', 'Pipeline Admin', 1)
    `).run();

    const adminToken = jwt.sign({ sub: 990001, type: 'admin_access', role: 'super_admin' }, JWT_SECRET);
    const sellerToken = jwt.sign({ user_id: 990002 }, JWT_SECRET);
    const buyerToken = jwt.sign({ user_id: 990003 }, JWT_SECRET);

    console.log("✓ Mock setup completed.");

    // 2. Admin creates category
    console.log("Step 2: Admin creating category...");
    const resCat = await fetch(`${BASE_URL}/api/admin/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        emoji_icon: '🏷️',
        display_name: '__TEST__ Regression Category',
        slug: 'test-regression-category',
        description: 'Regression Test Category Description',
        sort_order: 999,
        is_active: true
      })
    });
    assert.strictEqual(resCat.status, 201, "Expected category creation to return 201 status code");
    const catData = await resCat.json();
    assert.ok(catData.success, "Expected successful response wrapper for category creation");
    const categoryId = catData.data.id;
    assert.ok(categoryId, "Expected category id to be present in response data");
    console.log(`✓ Category created successfully (id: ${categoryId})`);

    // 3. Admin creates subcategory under it
    console.log("Step 3: Admin creating subcategory...");
    const resSub = await fetch(`${BASE_URL}/api/admin/subcategories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        category_id: categoryId,
        name: '__TEST__ Regression Subcategory',
        slug: 'test-regression-subcategory',
        description: 'Regression Test Subcategory Description'
      })
    });
    assert.strictEqual(resSub.status, 201, "Expected subcategory creation to return 201 status code");
    const subData = await resSub.json();
    assert.ok(subData.success, "Expected successful response wrapper for subcategory creation");
    const subcategoryId = subData.data.id;
    assert.ok(subcategoryId, "Expected subcategory id to be present in response data");
    console.log(`✓ Subcategory created successfully (id: ${subcategoryId})`);

    // 4. Public API reflects it immediately
    console.log("Step 4: Checking public categories list for category and subcategory...");
    const resPublicCats = await fetch(`${BASE_URL}/api/categories`);
    assert.strictEqual(resPublicCats.status, 200, "Expected public categories fetch to return 200 status code");
    const publicCatsData = await resPublicCats.json();
    const testCat = publicCatsData.data.categories.find(c => c.id === categoryId);
    assert.ok(testCat, "Expected created category to be found in public categories list");
    assert.strictEqual(testCat.display_name, '__TEST__ Regression Category');
    assert.strictEqual(testCat.product_count, 0, "Expected initial category product count to be 0");
    const testSub = testCat.subcategories.find(sc => sc.id === subcategoryId);
    assert.ok(testSub, "Expected nested subcategory to be found in category subcategories array");
    console.log("✓ Public category listing correctly reflects category & nested subcategory.");

    // 5. Seller creates and publishes a listing under it
    console.log("Step 5: Seller creating and publishing listing...");
    const resListing = await fetch(`${BASE_URL}/api/seller/listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        title: 'Regression Test Item',
        description: 'Regression item description',
        base_price: 1500,
        category_id: categoryId,
        subcategory_ids: [subcategoryId],
        status: 'active',
        listing_type: 'pre-made'
      })
    });
    assert.strictEqual(resListing.status, 201, "Expected listing creation to return 201 status code");
    const listingData = await resListing.json();
    const listingId = listingData.data.id;
    assert.ok(listingId, "Expected listing id to be present in response data");

    // Manually sync listing to product (simulating the sync service run)
    const syncRes = await syncListingToProduct(listingId);
    assert.ok(syncRes.synced, "Expected successful sync of listing to products table");
    console.log(`✓ Listing created and synced to products successfully (listingId: ${listingId}, productId: ${syncRes.productId})`);

    // 6. Live count updates immediately
    console.log("Step 6: Checking category counts update to 2 live...");
    const resPublicCats2 = await fetch(`${BASE_URL}/api/categories`);
    assert.strictEqual(resPublicCats2.status, 200);
    const publicCatsData2 = await resPublicCats2.json();
    const testCat2 = publicCatsData2.data.categories.find(c => c.id === categoryId);
    assert.strictEqual(testCat2.product_count, 2, "Expected live product count to be updated to 2 (1 active product + 1 active listing)");
    console.log("✓ Live product count verified.");

    // 7. Category detail page + subcategory filters work
    console.log("Step 7: Testing category products retrieval and subcategory filters...");
    const resProdList = await fetch(`${BASE_URL}/api/categories/test-regression-category/products`);
    assert.strictEqual(resProdList.status, 200);
    const prodListData = await resProdList.json();
    const testProd = prodListData.data.products.find(p => p.name === 'Regression Test Item');
    assert.ok(testProd, "Expected created product to appear on category detail products list");

    // Filter with correct subcategory
    const resProdListFilterOk = await fetch(`${BASE_URL}/api/categories/test-regression-category/products?subcategory_ids=${subcategoryId}`);
    assert.strictEqual(resProdListFilterOk.status, 200);
    const prodListFilterOkData = await resProdListFilterOk.json();
    const testProdFilteredOk = prodListFilterOkData.data.products.find(p => p.name === 'Regression Test Item');
    assert.ok(testProdFilteredOk, "Expected product to still appear when filtering by its correct subcategory");

    // Filter with incorrect subcategory
    const resProdListFilterBad = await fetch(`${BASE_URL}/api/categories/test-regression-category/products?subcategory_ids=999999`);
    assert.strictEqual(resProdListFilterBad.status, 200);
    const prodListFilterBadData = await resProdListFilterBad.json();
    const testProdFilteredBad = prodListFilterBadData.data.products.find(p => p.name === 'Regression Test Item');
    assert.ok(!testProdFilteredBad, "Expected product to be excluded when filtering by an unrelated subcategory");
    console.log("✓ Category details and subcategory exclusion filtering verified.");

    // 8. Admin delete safety check block
    console.log("Step 8: Admin category deletion safety block check...");
    const resDeleteCatAttempt = await fetch(`${BASE_URL}/api/admin/categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    assert.strictEqual(resDeleteCatAttempt.status, 400, "Expected admin category deletion to be blocked with 400 when active products/listings exist");
    const deleteCatAttemptData = await resDeleteCatAttempt.json();
    assert.ok(deleteCatAttemptData.message.includes("active products") || deleteCatAttemptData.message.includes("active listings"), "Expected deletion block message to specify counts of active items");
    console.log("✓ Admin category delete safety check works perfectly.");

    console.log("\n🎉 ALL CATEGORY PIPELINE E2E TESTS PASSED SUCCESSFULLY!");
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
