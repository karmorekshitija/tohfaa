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
  console.log('--- STARTING CATALOG SYNC INTEGRATION TEST ---');

  // Let's find a verified seller (we need is_approved = 1)
  const sellerRow = await pool.query(`
    SELECT u.id, u.email, u.password_hash
    FROM users u
    JOIN seller_profiles sp ON u.id = sp.user_id
    WHERE sp.is_approved = 1
    LIMIT 1
  `);

  if (sellerRow.rows.length === 0) {
    console.log('No approved sellers found to run sync test.');
    process.exit(0);
  }

  const { id: sellerId, email: sellerEmail, password_hash: sellerOldHash } = sellerRow.rows[0];
  console.log(`Using Seller ID: ${sellerId} (${sellerEmail})`);

  const tempPassword = 'tempPassword123!';
  const tempHash = await bcrypt.hash(tempPassword, 12);

  // Set temp password for seller
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [tempHash, sellerId]);

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
    console.log(`Logged in successfully as Seller!`);

    // 2. Create listing
    const listingTitle = `Test Sync Listing ${Math.random()}`;
    const listingRes = await req(`${BASE_URL}/api/seller/listings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        title: listingTitle,
        description: 'Test description',
        base_price: 150000, // in paise
        listing_type: 'pre-made',
        status: 'active',
        category_id: 3, // Ceramics & Pottery
        stock_count: 10,
        ships_in_days: 5,
        dispatch_sla_days: 2,
        shipping_method: 'courier'
      })
    });
    if (!listingRes.ok) {
      throw new Error(JSON.stringify(listingRes.data));
    }
    const listingId = listingRes.data.data.id;
    console.log(`Created Listing ID: ${listingId}`);

    // 3. Verify in DB that it is synced to `products` table
    const productRow = await pool.query('SELECT * FROM products WHERE source_listing_id = $1', [listingId]);
    console.log('Products row in DB:', productRow.rows[0]);
    if (!productRow.rows[0]) {
      throw new Error('Product not found in products table for source_listing_id!');
    }
    const productId = productRow.rows[0].id;
    if (productRow.rows[0].name !== listingTitle) {
      throw new Error(`Product name is '${productRow.rows[0].name}', expected '${listingTitle}'`);
    }
    console.log(`SUCCESS: Product created & verified in DB! Product ID: ${productId}`);

    // 4. Update listing
    const newTitle = `Updated Sync Listing ${Math.random()}`;
    const updateRes = await req(`${BASE_URL}/api/seller/listings/${listingId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: JSON.stringify({
        title: newTitle,
        base_price: 200000
      })
    });
    if (!updateRes.ok) {
      throw new Error(JSON.stringify(updateRes.data));
    }
    console.log('Listing updated successfully!');

    // 5. Verify product is updated in DB
    const updatedProdRow = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    console.log('Updated product row in DB:', updatedProdRow.rows[0]);
    if (updatedProdRow.rows[0].name !== newTitle || updatedProdRow.rows[0].price_paise !== 200000) {
      throw new Error(`Product update mismatch: name=${updatedProdRow.rows[0].name}, price_paise=${updatedProdRow.rows[0].price_paise}`);
    }
    console.log('SUCCESS: Product update verified in DB!');

    // 6. Verify buyer products API returns this product
    const buyerProdRes = await req(`${BASE_URL}/api/products/${productId}`);
    if (!buyerProdRes.ok) {
      throw new Error(`Buyer API returned status ${buyerProdRes.status}: ${JSON.stringify(buyerProdRes.data)}`);
    }
    console.log('SUCCESS: Buyer Products API returned product details successfully!');

    console.log('\n--- ALL CATALOG SYNC CHECKS PASSED SUCCESSFULLY! ---');
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
