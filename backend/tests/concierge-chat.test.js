// Mock the @google/generative-ai module before requiring server.js
const mockGenAI = {
  GoogleGenerativeAI: class {
    constructor(apiKey) {
      this.apiKey = apiKey;
    }
    getGenerativeModel() {
      return {
        generateContent: async (args) => {
          const sysText = args && args[0] && args[0].text ? args[0].text : '';
          
          if (sysText.includes('FINALIZE') || sysText.includes('finalize')) {
            return {
              response: {
                text: () => JSON.stringify({ decision: 'finalize' })
              }
            };
          }
          if (sysText.includes('YES') || sysText.includes('yes')) {
            return {
              response: {
                text: () => JSON.stringify({ answer: 'yes' })
              }
            };
          }
          if (sysText.includes('quantity')) {
            return {
              response: {
                text: () => JSON.stringify({ quantity: 5, needed_by_date: null })
              }
            };
          }
          // Default/details extraction
          return {
            response: {
              text: () => JSON.stringify({
                customization_type: "Hand-engraved initials",
                color_material: "Mahogany Wood",
                inspiration_reference: "engraving_sample.jpg",
                other_notes: "Please write 'A & B' on it"
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

// Mock the whatsappService
const mockWhatsapp = {
  sendWhatsAppTextMessage: async (phone, msg) => {
    console.log(`[Mock WhatsApp to ${phone}]: ${msg}`);
    return { success: true };
  }
};
require('module').prototype.require = (function(orgRequire) {
  const parent = require('module').prototype.require;
  return function(path) {
    if (path.endsWith('whatsappService') || path === './services/whatsappService' || path === '../services/whatsappService') {
      return mockWhatsapp;
    }
    if (path === '@google/generative-ai') {
      return mockGenAI;
    }
    return orgRequire.apply(this, arguments);
  };
})(require('module').prototype.require);

// Set test port and start
process.env.PORT = 5010;
const { app, server } = require('../src/server');
const jwt = require('jsonwebtoken');
const assert = require('assert');
const db = require('../src/db');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'tohfa_super_secret_key_987654321';
const buyerId = 12;
const sellerId = 6;
const buyerToken = jwt.sign({ user_id: buyerId }, JWT_SECRET);
const sellerToken = jwt.sign({ user_id: sellerId }, JWT_SECRET);

const BASE_URL = 'http://localhost:5010';

async function runTests() {
  console.log("🚀 Starting E2E Concierge Chat Tests...");
  
  // Cleanup previous test data
  console.log("Cleaning up previous test data...");
  try {
    await db.prepare("DELETE FROM conversation_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ?)").run(buyerId, sellerId);
    await db.prepare("DELETE FROM custom_offers WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ?)").run(buyerId, sellerId);
    await db.prepare("DELETE FROM orders WHERE conversation_id IN (SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ?)").run(buyerId, sellerId);
    await db.prepare("DELETE FROM custom_orders WHERE thread_id IN (SELECT id FROM conversations WHERE buyer_id = ? AND seller_id = ?)").run(buyerId, sellerId);
    await db.prepare("DELETE FROM conversations WHERE buyer_id = ? AND seller_id = ?").run(buyerId, sellerId);
    await db.prepare("UPDATE users SET last_active_at = NULL WHERE id = ?").run(sellerId);
    console.log("✓ Cleanup done.");
  } catch (err) {
    console.error("Cleanup error:", err);
  }

  let conversationId = null;

  try {
    // 1. Start Concierge Session (Buyer taps "Talk to Seller")
    console.log("Step 1: POST /api/requests (Start concierge session)...");
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
    
    assert.strictEqual(startRes.status, 200);
    const startData = await startRes.json();
    assert.ok(startData.conversation_id);
    conversationId = startData.conversation_id;
    console.log(`✓ Concierge Session started. Thread ID: ${conversationId}`);

    // 2. Verify status is 'bot_collecting'
    console.log("Step 2: GET /api/requests/:id (Verify status is bot_collecting)...");
    const getRes = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    assert.strictEqual(getRes.status, 200);
    const getData = await getRes.json();
    assert.strictEqual(getData.status, 'bot_collecting');
    console.log(`✓ Initial status verified: ${getData.status}`);

    // 3. Buyer replies -> Bot completes intake and transitions to POST_DRAFT_CHOICE
    console.log("Step 3: POST /api/requests/:id/messages (Buyer replies and completes intake)...");
    const msgRes1 = await fetch(`${BASE_URL}/api/requests/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        content: "Please customize it with mahogany wood and hand-engraved initials. Here is my inspiration."
      })
    });
    assert.strictEqual(msgRes1.status, 200);
    console.log("✓ Buyer reply 1 (details) submitted.");

    const msgRes2 = await fetch(`${BASE_URL}/api/requests/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        content: "finalize"
      })
    });
    assert.strictEqual(msgRes2.status, 200);
    console.log("✓ Buyer reply 2 (finalize) submitted.");

    const msgRes3 = await fetch(`${BASE_URL}/api/requests/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        content: "5"
      })
    });
    assert.strictEqual(msgRes3.status, 200);
    console.log("✓ Buyer reply 3 (quantity 5) submitted.");

    // 4. Verify thread state and draft card creation
    console.log("Step 4: GET /api/requests/:id (Verify status is POST_DRAFT_CHOICE and draft card created)...");
    const checkRes = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    const checkData = await checkRes.json();
    assert.strictEqual(checkData.status, 'POST_DRAFT_CHOICE', "Intake completion should transition to POST_DRAFT_CHOICE");
    
    // Check messages to find the order draft card
    const draftCardMsg = checkData.messages.find(m => m.message_type === 'order_draft_card');
    assert.ok(draftCardMsg, "An order draft card message must be present");
    const orderData = JSON.parse(draftCardMsg.content);
    assert.strictEqual(orderData.specs.color_material, "Mahogany Wood");
    assert.strictEqual(orderData.qty, 5);
    console.log(`✓ Verified status: ${checkData.status}. Order draft card specs: Qty=${orderData.qty}, Material=${orderData.specs.color_material}`);

    // 5. Test escalation when seller is OFFLINE
    console.log("Step 5: POST /api/requests/:id/talk-to-seller (Handoff when seller is offline)...");
    const talkOfflineRes = await fetch(`${BASE_URL}/api/requests/${conversationId}/talk-to-seller`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      }
    });
    assert.strictEqual(talkOfflineRes.status, 200);
    const talkOfflineData = await talkOfflineRes.json();
    assert.strictEqual(talkOfflineData.status, 'ESCALATION_PENDING', "Should transition to ESCALATION_PENDING when seller is offline");
    console.log(`✓ Handoff status verified: ${talkOfflineData.status}. Message: "${talkOfflineData.message}"`);

    // 6. Test seller online activity updates status to SELLER_LIVE
    console.log("Step 6: GET /api/requests/:id (Seller opens thread -> status transitions to SELLER_LIVE)...");
    // Run GET as seller
    const getSellerRes = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${sellerToken}` }
    });
    assert.strictEqual(getSellerRes.status, 200);
    const getSellerData = await getSellerRes.json();
    assert.strictEqual(getSellerData.status, 'SELLER_LIVE', "Should auto-transition to SELLER_LIVE when seller goes online");
    console.log(`✓ Seller online transition verified. Status is now: ${getSellerData.status}`);

    // 7. Seller finalizes order details (Timeline & Price)
    console.log("Step 7: POST /api/requests/:id/finalize (Seller finalizes the custom order)...");
    const finalizeRes = await fetch(`${BASE_URL}/api/requests/${conversationId}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sellerToken}`
      },
      body: JSON.stringify({
        price: 150000, // ₹1500.00
        delivery_days: 7
      })
    });
    assert.strictEqual(finalizeRes.status, 200, "Seller should successfully finalize details");
    const finalizeData = await finalizeRes.json();
    assert.ok(finalizeData.offer_id, "Should return offer_id");
    const offerId = finalizeData.offer_id;
    console.log(`✓ Quote finalized. Offer ID: ${offerId}`);

    // 8. Verify status is now SELLER_FINALIZED
    console.log("Step 8: GET /api/requests/:id (Verify status is SELLER_FINALIZED)...");
    const getBuyerRes = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    const getBuyerData = await getBuyerRes.json();
    assert.strictEqual(getBuyerData.status, 'SELLER_FINALIZED');
    
    // Check that we have a finalized order draft card message
    const finalizedCard = getBuyerData.messages.filter(m => m.message_type === 'order_draft_card').pop();
    assert.ok(finalizedCard);
    const finalizedCardData = JSON.parse(finalizedCard.content);
    assert.strictEqual(finalizedCardData.status, 'finalized');
    assert.strictEqual(finalizedCardData.draft_price, 150000);
    console.log(`✓ Finalized state verified. Status: ${getBuyerData.status}, Price: ₹${(finalizedCardData.draft_price / 100).toFixed(2)}`);

    // 9. Buyer pays for the finalized order (Accepts custom offer)
    console.log("Step 9: POST /api/requests/:id/accept (Buyer accepts and checks out)...");
    const acceptRes = await fetch(`${BASE_URL}/api/requests/${conversationId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${buyerToken}`
      }
    });
    assert.strictEqual(acceptRes.status, 200);
    const acceptData = await acceptRes.json();
    assert.ok(acceptData.razorpay_order_id, "Should return Razorpay order ID");
    console.log(`✓ Checkout initiated. Razorpay Order ID: ${acceptData.razorpay_order_id}`);

    // 10. Verify payment completion
    console.log("Step 10: POST /api/payments/verify (Verify Mock Razorpay Payment)...");
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
        razorpay_payment_id: "pay_concierge_payment_999",
        razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mocksecret12345')
          .update(acceptData.razorpay_order_id + '|' + "pay_concierge_payment_999")
          .digest('hex')
      })
    });
    assert.strictEqual(verifyRes.status, 200, "Payment verification should succeed");
    const verifyData = await verifyRes.json();
    console.log(`✓ Payment Verified. Order Code: ${verifyData.order_code}`);

    // 11. Final state verification
    console.log("Step 11: GET /api/requests/:id (Verify final state is accepted_paid)...");
    const finalRes = await fetch(`${BASE_URL}/api/requests/${conversationId}`, {
      headers: { 'Authorization': `Bearer ${buyerToken}` }
    });
    const finalData = await finalRes.json();
    assert.strictEqual(finalData.status, 'accepted_paid');
    assert.ok(finalData.order_details, "Order details should be populated");
    console.log(`✓ Final verification: status is ${finalData.status}`);

    console.log("\n🎉 ALL CONCIERGE CHAT TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exitCode = 1;
  } finally {
    console.log("Shutting down test server...");
    server.close();
    process.exit(process.exitCode || 0);
  }
}

// Allow server to initialize before running tests
setTimeout(runTests, 1000);
