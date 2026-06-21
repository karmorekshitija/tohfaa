// Mock the @google/generative-ai module before requiring server.js
const mockGenAI = {
  GoogleGenerativeAI: class {
    constructor(apiKey) {
      this.apiKey = apiKey;
    }
    getGenerativeModel() {
      return {
        generateContent: async () => {
          return {
            response: {
              text: () => JSON.stringify({
                extracted_fields: { color: "Artisan Orchid Pink", quantity: 2 },
                bot_response: "Got it! I have updated color to Pink and quantity to 2. Is there anything else you'd like to customize, or shall we proceed?"
              })
            }
          };
        }
      };
    }
  }
};
require('module').prototype.require = (function(orgRequire) {
  return function(path) {
    if (path === '@google/generative-ai') {
      return mockGenAI;
    }
    return orgRequire.apply(this, arguments);
  };
})(require('module').prototype.require);

// Set test port and start
process.env.PORT = 5009;
const { app, server } = require('../src/server');
const jwt = require('jsonwebtoken');
const assert = require('assert');

const JWT_SECRET = process.env.JWT_SECRET || 'tohfa_super_secret_key_987654321';
const buyerToken = jwt.sign({ user_id: 12 }, JWT_SECRET);
const sellerToken = jwt.sign({ user_id: 6 }, JWT_SECRET);

const BASE_URL = 'http://localhost:5009';

async function runTests() {
  console.log("🚀 Starting E2E Customization Chat Tests...");
  
  // Cleanup previous test data
  console.log("Cleaning up previous test data...");
  const db = require('../src/db');
  try {
    await db.prepare("DELETE FROM conversation_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = 12 AND seller_id = 6)").run();
    await db.prepare("DELETE FROM custom_offers WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = 12 AND seller_id = 6)").run();
    await db.prepare("DELETE FROM orders WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = 12 AND seller_id = 6)").run();
    await db.prepare("DELETE FROM conversations WHERE buyer_id = 12 AND seller_id = 6").run();
    console.log("✓ Cleanup done.");
  } catch (err) {
    console.error("Cleanup error:", err);
  }

  let conversationId = null;

  try {
    // 1. Start a customization request
    console.log("Step 1: POST /api/requests (Buyer starts customization chat)...");
    const startRes = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        listing_id: 48, // Wedding Garlands Made Of Orchids
        request_type: 'customization',
        quantity: 2
      })
    });
    
    assert.strictEqual(startRes.status, 200, "Should successfully initiate custom request");
    const startData = await startRes.json();
    assert.ok(startData.conversation_id, "Should return conversation_id");
    conversationId = startData.conversation_id;
    console.log(`✓ Customization Request started. Conversation ID: ${conversationId}`);

    // 2. Fetch conversation details to verify initial status
    console.log("Step 2: GET /api/requests/:id (Verify status is bot_collecting)...");
    const getRes = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.strictEqual(getData.status, 'bot_collecting', "Initial status should be bot_collecting");
    console.log(`✓ Verified status: ${getData.status}`);

    // 3. Send message as buyer (answering bot)
    console.log("Step 3: POST /api/requests/:id/messages (Buyer sends details)...");
    const msgRes = await fetch(`${BASE_URL}/api/requests/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        content: "I want Pink color, and quantity 2"
      })
    });
    assert.strictEqual(msgRes.status, 200, "Should post message successfully");
    console.log("✓ Buyer message sent.");

    // 4. Force state to pending_seller_review (complete intake summary)
    console.log("Step 4: PATCH /api/requests/:id/status (Simulate completing intake)...");
    const patchRes = await fetch(`${BASE_URL}/api/requests/${conversationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        status: 'pending_seller_review'
      })
    });
    assert.strictEqual(patchRes.status, 200);
    console.log("✓ State transitioned to pending_seller_review.");

    // 5. Send quote as seller
    console.log("Step 5: POST /api/requests/:id/quote (Seller sends custom quote)...");
    const quoteRes = await fetch(`${BASE_URL}/api/requests/${conversationId}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        price: 5000, // ₹50.00
        delivery_date: "2026-07-01",
        seller_notes: "Sure, orchid garlands in pink color",
        expiry_hours: 24
      })
    });
    assert.strictEqual(quoteRes.status, 200, "Seller should successfully send quote");
    const quoteData = await quoteRes.json();
    assert.ok(quoteData.offer_id, "Should return offer_id");
    const offerId = quoteData.offer_id;
    console.log(`✓ Quote sent. Offer ID: ${offerId}`);

    // 6. Verify status transitioned to quote_sent
    console.log("Step 6: GET /api/requests/:id (Verify status is quote_sent)...");
    const getRes2 = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    const getData2 = await getRes2.json();
    assert.strictEqual(getData2.status, 'quote_sent');
    console.log(`✓ Verified status: ${getData2.status}`);

    // 7. Accept quote as buyer (generates Razorpay order details)
    console.log("Step 7: POST /api/requests/:id/accept (Buyer accepts quote)...");
    const acceptRes = await fetch(`${BASE_URL}/api/requests/${conversationId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      }
    });
    assert.strictEqual(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.ok(acceptData.razorpay_order_id, "Should return razorpay_order_id");
    console.log(`✓ Quote accepted. Generated Razorpay Order: ${acceptData.razorpay_order_id}`);

    // 8. Verify payment (transitions status to accepted_paid and inserts order)
    console.log("Step 8: POST /api/payments/verify (Verify Mock Razorpay Payment)...");
    const verifyRes = await fetch(`${BASE_URL}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        offer_id: offerId,
        razorpay_order_id: acceptData.razorpay_order_id,
        razorpay_payment_id: "pay_test_payment_123",
        razorpay_signature: "mock_signature"
      })
    });
    assert.strictEqual(verifyRes.status, 200, "Signature verification should succeed");
    const verifyData = await verifyRes.json();
    console.log(`✓ Payment Verified. Order Code: ${verifyData.order_code}`);

    // 9. Confirm conversation state is accepted_paid
    console.log("Step 9: GET /api/requests/:id (Verify status is accepted_paid)...");
    const getRes3 = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    const getData3 = await getRes3.json();
    assert.strictEqual(getData3.status, 'accepted_paid');
    assert.ok(getData3.order_details, "Order details should be populated");
    console.log(`✓ Final verification: status is ${getData3.status}`);

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! E2E FLOW IS CORRECT.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exitCode = 1;
  } finally {
    console.log("Shutting down test server...");
    server.close();
  }
}

// Allow server to initialize before running tests
setTimeout(runTests, 1000);
