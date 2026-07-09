const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    data = { rawText: text };
  }
  return { status: res.status, data, ok: res.ok };
}

async function run() {
  console.log('--- STARTING SELLER ORDERS CHAT INTEGRATION TEST ---');

  // Let's find an existing order and its buyer/seller from DB
  const orderRow = await pool.query(`
    SELECT o.id, o.buyer_id, o.seller_id, o.listing_id,
           u_buyer.email as buyer_email, u_seller.email as seller_email,
           u_seller.password_hash as seller_old_hash
    FROM orders o
    JOIN users u_buyer ON o.buyer_id = u_buyer.id
    JOIN users u_seller ON o.seller_id = u_seller.id
    LIMIT 1
  `);

  if (orderRow.rows.length === 0) {
    console.log('No orders found in database to run chat integration test.');
    process.exit(0);
  }

  const { id: orderId, buyer_id: buyerId, seller_id: sellerId, buyer_email: buyerEmail, seller_email: sellerEmail, seller_old_hash: sellerOldHash } = orderRow.rows[0];
  console.log(`Using Order ID: ${orderId}, Buyer ID: ${buyerId} (${buyerEmail}), Seller ID: ${sellerId} (${sellerEmail})`);

  const tempPassword = 'tempPassword123!';
  const tempHash = await bcrypt.hash(tempPassword, 12);

  // Set temp password for seller
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [tempHash, sellerId]);
  console.log('Temporarily set seller password to: ' + tempPassword);

  let sellerToken;
  try {
    // 1. Log in as Seller
    const loginRes = await req(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: sellerEmail,
        password: tempPassword
      })
    });
    if (!loginRes.ok) {
      throw new Error(JSON.stringify(loginRes.data));
    }
    sellerToken = loginRes.data.data.access_token;
    console.log(`Logged in successfully as Seller (${sellerEmail})!`);

    // 2. Call `/api/seller/messages/start`
    let threadId;
    const startRes = await req(`${BASE_URL}/api/seller/messages/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        order_id: orderId,
        buyer_id: buyerId
      })
    });
    if (!startRes.ok) {
      throw new Error(JSON.stringify(startRes.data));
    }
    threadId = startRes.data.data.thread_id;
    console.log(`Successfully started/found thread. Thread ID: ${threadId}`);

    // 3. Verify in DB that it is stored in `conversations` table linked to `order_id`
    const convRow = await pool.query('SELECT * FROM conversations WHERE id = $1', [threadId]);
    console.log('Conversations row in DB:', convRow.rows[0]);
    if (!convRow.rows[0]) {
      throw new Error('Thread not found in conversations table!');
    }
    if (convRow.rows[0].order_id !== orderId) {
      throw new Error(`Conversation order_id is ${convRow.rows[0].order_id}, expected ${orderId}`);
    }
    console.log('SUCCESS: Conversation verified in DB!');

    // 4. Send message as Seller
    const testMsg = `Hello from Seller - Order context test ${Math.random()}`;
    const sendRes = await req(`${BASE_URL}/api/seller/messages/${threadId}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({ body: testMsg })
    });
    if (!sendRes.ok) {
      throw new Error(JSON.stringify(sendRes.data));
    }
    console.log('Message sent successfully from Seller!');

    // 5. Verify message is in `conversation_messages` table
    const msgRow = await pool.query('SELECT * FROM conversation_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 1', [threadId]);
    console.log('Inserted message in DB:', msgRow.rows[0]);
    if (!msgRow.rows[0] || msgRow.rows[0].content !== testMsg) {
      throw new Error('Message content mismatch or not found in conversation_messages!');
    }
    console.log('SUCCESS: Message verified in DB!');

    console.log('\n--- ALL CHECKS PASSED SUCCESSFULLY! ---');
  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    // Restore old password
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [sellerOldHash, sellerId]);
    console.log('Restored seller password hash.');
    await pool.end();
  }
}

run();
