const db = require('../src/db');
const { scheduleLogisticsPickups } = require('../src/server');

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log("=== STARTING LOGISTICS SCHEDULING VERIFICATION ===");
  try {
    // 1. Fetch valid buyer, seller and listing
    const buyer = await db.prepare("SELECT id FROM users LIMIT 1").get();
    const listing = await db.prepare("SELECT id, seller_id FROM listings LIMIT 1").get();
    
    if (!buyer || !listing) {
      console.error("Test aborted: Buyer or Listing not found in the DB. Make sure the database has seeded data.");
      process.exit(1);
    }
    
    const buyerId = buyer.id;
    const sellerId = listing.seller_id;
    const listingId = listing.id;
    
    console.log(`Using Buyer ID: ${buyerId}, Seller ID: ${sellerId}, Listing ID: ${listingId}`);
    
    // 2. Clean up previous test orders
    await db.prepare("DELETE FROM orders WHERE order_ref LIKE 'TF-TEST-LOG-%'").run();
    console.log("Cleaned up old test orders.");
    
    // 3. Setup test configurations
    // Set daily slots limit to 2
    process.env.MAX_PICKUP_SLOTS_PER_SELLER_PER_DAY = "2";
    console.log("Configured MAX_PICKUP_SLOTS_PER_SELLER_PER_DAY = 2");
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const futureHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    
    // 4. Seed test orders
    // Order 1: eligible (1h ago), pending
    await db.prepare(`
      INSERT INTO orders (
        order_ref, buyer_id, seller_id, listing_id, status, order_type,
        pickup_eligible_at, pickup_status, payment_status, total_paise, total_amount, unit_price, quantity
      ) VALUES ('TF-TEST-LOG-0001', ?, ?, ?, 'processing', 'custom', ?, 'pending', 'paid', 1000, 1000, 1000, 1)
    `).run(buyerId, sellerId, listingId, oneHourAgo);

    // Order 2: eligible (2h ago), queued (simulating a previously queued order)
    await db.prepare(`
      INSERT INTO orders (
        order_ref, buyer_id, seller_id, listing_id, status, order_type,
        pickup_eligible_at, pickup_status, payment_status, total_paise, total_amount, unit_price, quantity
      ) VALUES ('TF-TEST-LOG-0002', ?, ?, ?, 'processing', 'custom', ?, 'queued', 'paid', 1000, 1000, 1000, 1)
    `).run(buyerId, sellerId, listingId, twoHoursAgo);

    // Order 3: eligible (3h ago), pending
    await db.prepare(`
      INSERT INTO orders (
        order_ref, buyer_id, seller_id, listing_id, status, order_type,
        pickup_eligible_at, pickup_status, payment_status, total_paise, total_amount, unit_price, quantity
      ) VALUES ('TF-TEST-LOG-0003', ?, ?, ?, 'processing', 'custom', ?, 'pending', 'paid', 1000, 1000, 1000, 1)
    `).run(buyerId, sellerId, listingId, threeHoursAgo);

    // Order 4: ineligible (in future), pending
    await db.prepare(`
      INSERT INTO orders (
        order_ref, buyer_id, seller_id, listing_id, status, order_type,
        pickup_eligible_at, pickup_status, payment_status, total_paise, total_amount, unit_price, quantity
      ) VALUES ('TF-TEST-LOG-0004', ?, ?, ?, 'processing', 'custom', ?, 'pending', 'paid', 1000, 1000, 1000, 1)
    `).run(buyerId, sellerId, listingId, futureHour);

    console.log("Seeded 4 test orders.");
    
    // 5. Run the scheduling cron logic
    console.log("Executing scheduleLogisticsPickups...");
    await scheduleLogisticsPickups();
    
    // Wait for async logs to settle
    await sleep(1000);
    
    // 6. Fetch results and verify assertions
    const results = await db.prepare("SELECT order_ref, status, pickup_status, tracking_id, scheduled_pickup_at FROM orders WHERE order_ref LIKE 'TF-TEST-LOG-%' ORDER BY order_ref").all();
    console.log("\n--- VERIFICATION RESULTS ---");
    console.log(JSON.stringify(results, null, 2));
    
    const o1 = results.find(o => o.order_ref === 'TF-TEST-LOG-0001');
    const o2 = results.find(o => o.order_ref === 'TF-TEST-LOG-0002');
    const o3 = results.find(o => o.order_ref === 'TF-TEST-LOG-0003');
    const o4 = results.find(o => o.order_ref === 'TF-TEST-LOG-0004');
    
    let passed = true;
    
    // Order 2 was 'queued' (highest priority), so it must be scheduled.
    if (o2.status !== 'ready_for_pickup' || o2.pickup_status !== 'scheduled' || !o2.tracking_id) {
      console.error("FAIL: Order 2 (queued) should have been scheduled!");
      passed = false;
    } else {
      console.log("PASS: Order 2 (queued) was scheduled successfully.");
    }
    
    // Order 3 was 'pending' and older than Order 1 (3h ago vs 1h ago). Since limit is 2, it should be scheduled.
    if (o3.status !== 'ready_for_pickup' || o3.pickup_status !== 'scheduled' || !o3.tracking_id) {
      console.error("FAIL: Order 3 (oldest pending) should have been scheduled!");
      passed = false;
    } else {
      console.log("PASS: Order 3 (oldest pending) was scheduled successfully.");
    }
    
    // Order 1 is eligible but limit is 2, so it should be queued (overflow).
    if (o1.status !== 'processing' || o1.pickup_status !== 'queued') {
      console.error("FAIL: Order 1 should have been queued due to limit!");
      passed = false;
    } else {
      console.log("PASS: Order 1 was correctly queued as overflow.");
    }
    
    // Order 4 is in the future, so it should remain pending/processing.
    if (o4.status !== 'processing' || o4.pickup_status !== 'pending') {
      console.error("FAIL: Order 4 (future) should remain unchanged!");
      passed = false;
    } else {
      console.log("PASS: Order 4 (future) remained unchanged.");
    }
    
    // 7. Test daily cap check (simulating another run on the same day when cap is reached)
    console.log("\nTesting daily cap enforcement for subsequent run...");
    
    // Seed one more order (eligible, pending)
    await db.prepare(`
      INSERT INTO orders (
        order_ref, buyer_id, seller_id, listing_id, status, order_type,
        pickup_eligible_at, pickup_status, payment_status, total_paise, total_amount, unit_price, quantity
      ) VALUES ('TF-TEST-LOG-0005', ?, ?, ?, 'processing', 'custom', ?, 'pending', 'paid', 1000, 1000, 1000, 1)
    `).run(buyerId, sellerId, listingId, threeHoursAgo);
    
    await scheduleLogisticsPickups();
    await sleep(1000);
    
    const resultsAfterSecondRun = await db.prepare("SELECT order_ref, status, pickup_status FROM orders WHERE order_ref LIKE 'TF-TEST-LOG-%' ORDER BY order_ref").all();
    const o5 = resultsAfterSecondRun.find(o => o.order_ref === 'TF-TEST-LOG-0005');
    
    // Since limit of 2 is already reached today for this seller, Order 5 and Order 1 should remain/become queued.
    if (o5.status !== 'processing' || o5.pickup_status !== 'queued') {
      console.error("FAIL: Order 5 should have been queued because the daily limit of 2 is already reached!");
      passed = false;
    } else {
      console.log("PASS: Order 5 was correctly queued due to daily slot limit being reached.");
    }
    
    // 8. Cleanup test records
    await db.prepare("DELETE FROM orders WHERE order_ref LIKE 'TF-TEST-LOG-%'").run();
    console.log("\nCleaned up test orders.");
    
    if (passed) {
      console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
    } else {
      console.error("\n=== SOME TESTS FAILED! ===");
    }
    
  } catch (e) {
    console.error("Error running verification test:", e);
  } finally {
    process.exit(0);
  }
}

// Start tests
setTimeout(runTests, 1000);
