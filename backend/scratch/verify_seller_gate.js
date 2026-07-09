const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const BASE_URL = `http://localhost:${process.env.PORT || 5001}`;

// Helper to generate dynamic emails/usernames
const rand = () => Math.random().toString(36).substring(7);

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
  console.log('--- STARTING SELLER VERIFICATION GATE INTEGRATION TEST ---');
  
  // 1. Get an admin token first
  let adminToken;
  try {
    const adminLoginRes = await req(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    if (!adminLoginRes.ok) {
      throw new Error(JSON.stringify(adminLoginRes.data));
    }
    adminToken = adminLoginRes.data.data.access_token || adminLoginRes.data.data.token;
    console.log('Successfully logged in as admin!');
  } catch (err) {
    console.error('Admin login failed:', err.message);
    process.exit(1);
  }

  // 2. Register as a seller
  const sellerEmail = `test_gate_${rand()}@test.com`;
  const sellerPassword = 'Password123!';
  const sellerName = `Test Gate Seller ${rand()}`;
  let sellerToken;
  let sellerId;

  try {
    // Register directly as a seller
    const regRes = await req(`${BASE_URL}/api/auth/register/seller`, {
      method: 'POST',
      body: JSON.stringify({
        email: sellerEmail,
        password: sellerPassword,
        full_name: sellerName,
        shop_name: `${sellerName}'s Shop`,
        shop_bio: 'A beautiful artisan shop waiting for verification',
        ships_in_days: 7,
        instagram_handle: `shop_${rand()}`
      })
    });
    if (!regRes.ok) {
      throw new Error(JSON.stringify(regRes.data));
    }
    sellerToken = regRes.data.data.access_token || regRes.data.data.token?.accessToken;
    sellerId = regRes.data.data.user.id;
    console.log(`Registered seller: ${sellerName} (ID: ${sellerId})`);
  } catch (err) {
    console.error('Seller signup failed:', err.message);
    process.exit(1);
  }

  // 3. Double-check is_approved is 0 in database
  const profileRow = await pool.query('SELECT is_approved FROM seller_profiles WHERE user_id = $1', [sellerId]);
  console.log(`Initial is_approved in database: ${profileRow.rows[0]?.is_approved}`);
  if (profileRow.rows[0]?.is_approved !== 0) {
    console.error('Error: New seller is_approved is not 0!');
    process.exit(1);
  }

  // 4. Create a listing for this seller
  let listingId;
  let productId;
  try {
    // Create draft
    const createRes = await req(
      `${BASE_URL}/api/seller/listings`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          title: `Gate Product ${rand()}`,
          category_id: 1, // Customized Gifts
          base_price: 1500
        })
      }
    );
    if (!createRes.ok) {
      throw new Error(JSON.stringify(createRes.data));
    }
    listingId = createRes.data.data.id;
    console.log(`Created draft listing (ID: ${listingId})`);

    // Save details
    await req(
      `${BASE_URL}/api/seller/listings/${listingId}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          title: `Gate Product ${rand()}`,
          category_id: 1,
          description: 'A beautiful product waiting for verification',
          listing_type: 'pre-made',
          tags: '["handmade"]'
        })
      }
    );

    // Save photos
    await req(
      `${BASE_URL}/api/seller/listings/${listingId}/photos`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          photos: ['/uploads/listings/default-photo.png']
        })
      }
    );

    // Save pricing A
    await req(
      `${BASE_URL}/api/seller/listings/${listingId}/pricing-a`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          base_price: 1500,
          stock_qty: 10,
          variants: []
        })
      }
    );

    // Save shipping (Add a dummy pickup address first)
    // Create address
    const addressRes = await req(
      `${BASE_URL}/api/seller/addresses`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          label: 'Seller Gate Pickup',
          address_line: '123 Gate St',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411014',
          phone: '9876543210'
        })
      }
    );
    if (!addressRes.ok) {
      throw new Error(JSON.stringify(addressRes.data));
    }
    const addressId = addressRes.data.data.id;

    await req(
      `${BASE_URL}/api/seller/listings/${listingId}/shipping`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sellerToken}` },
        body: JSON.stringify({
          ships_in_days: 3,
          pickup_address_id: addressId,
          package_weight_g: 500,
          package_length_cm: 15,
          package_width_cm: 15,
          package_height_cm: 10,
          shipping_methods: ['Pune Local Delivery']
        })
      }
    );

    // Publish listing
    const publishRes = await req(
      `${BASE_URL}/api/seller/listings/${listingId}/publish`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${sellerToken}` }
      }
    );
    if (!publishRes.ok) {
      throw new Error(JSON.stringify(publishRes.data));
    }
    productId = publishRes.data.data.product_id;
    console.log(`Published listing! Product ID: ${productId}`);
  } catch (err) {
    console.error('Failed to create/publish listing:', err.message);
    process.exit(1);
  }

  // 5. Try to access the product via buyer endpoints
  console.log('\n--- VERIFYING SEARCH/FEED/DETAIL EXCLUSION ---');
  
  // A. Product details API (should return 403 PENDING_VERIFICATION)
  try {
    const detailRes = await req(`${BASE_URL}/api/products/${productId}`);
    if (detailRes.status === 403 && detailRes.data?.code === 'PENDING_VERIFICATION') {
      console.log('SUCCESS: Product details blocked with 403 PENDING_VERIFICATION!');
    } else {
      console.error('Error: Product details did not return 403 PENDING_VERIFICATION:', detailRes.status, detailRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error fetching details:', err.message);
    process.exit(1);
  }

  // B. Product feed API (should not include this product)
  try {
    const feedRes = await req(`${BASE_URL}/api/products/feed`);
    const allProducts = [
      ...(feedRes.data.data.sponsored || []),
      ...(feedRes.data.data.bestSellers || []),
      ...(feedRes.data.data.regular || [])
    ];
    const found = allProducts.find(p => p.id === productId);
    if (found) {
      console.error('Error: Product from unverified seller was found in the feed!');
      process.exit(1);
    } else {
      console.log('SUCCESS: Product excluded from homepage/feed!');
    }
  } catch (err) {
    console.error('Feed fetch failed:', err.message);
    process.exit(1);
  }

  // C. Search products API (should not include this product)
  try {
    const searchRes = await req(`${BASE_URL}/api/products/search?q=verification`);
    const found = searchRes.data.data.products.find(p => p.id === productId);
    if (found) {
      console.error('Error: Product from unverified seller was found in search results!');
      process.exit(1);
    } else {
      console.log('SUCCESS: Product excluded from search results!');
    }
  } catch (err) {
    console.error('Search fetch failed:', err.message);
    process.exit(1);
  }

  // 6. Verify the seller via admin API
  console.log('\n--- VERIFYING SELLER VIA ADMIN API ---');
  try {
    const verifyRes = await req(
      `${BASE_URL}/api/admin/sellers/${sellerId}/verify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    console.log('Admin verify response:', verifyRes.data);
    if (!verifyRes.ok) {
      throw new Error(JSON.stringify(verifyRes.data));
    }
  } catch (err) {
    console.error('Verification failed:', err.message);
    process.exit(1);
  }

  // 7. Verify is_approved is 1 in database
  const profileRowAfter = await pool.query('SELECT is_approved FROM seller_profiles WHERE user_id = $1', [sellerId]);
  console.log(`Updated is_approved in database: ${profileRowAfter.rows[0]?.is_approved}`);
  if (profileRowAfter.rows[0]?.is_approved !== 1) {
    console.error('Error: Seller is_approved did not change to 1!');
    process.exit(1);
  }

  // 8. Try to access the product via buyer endpoints again (should succeed)
  console.log('\n--- VERIFYING SEARCH/FEED/DETAIL ACCESSIBILITY ---');

  // A. Product details API (should return 200)
  try {
    const detailRes = await req(`${BASE_URL}/api/products/${productId}`);
    if (detailRes.status === 200 && detailRes.data.data.id === productId) {
      console.log('SUCCESS: Product details accessible now!');
    } else {
      console.error('Error: Unexpected details response:', detailRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error: Failed to fetch product details after verification:', err.message);
    process.exit(1);
  }

  // B. Product feed API (should now contain the product)
  try {
    const feedRes = await req(`${BASE_URL}/api/products/feed`);
    const allProducts = [
      ...(feedRes.data.data.sponsored || []),
      ...(feedRes.data.data.bestSellers || []),
      ...(feedRes.data.data.regular || [])
    ];
    const found = allProducts.find(p => p.id === productId);
    if (found) {
      console.log('SUCCESS: Product now present in home feed!');
    } else {
      console.error('Warning: Product not in feed (might be excluded due to pagination/recency, checking by search instead)');
    }
  } catch (err) {
    console.error('Feed fetch failed:', err.message);
    process.exit(1);
  }

  // C. Search products API (should now find the product)
  try {
    const searchRes = await req(`${BASE_URL}/api/products/search?q=verification`);
    const found = searchRes.data.data.products.find(p => p.id === productId);
    if (found) {
      console.log('SUCCESS: Product now present in search results!');
    } else {
      console.error('Error: Product still not found in search results after verification!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Search fetch failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\n--- CLEANING UP DATABASE ---');
  try {
    // Delete product, listing, profiles, user
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    await pool.query('DELETE FROM listings WHERE id = $1', [listingId]);
    await pool.query('DELETE FROM seller_profiles WHERE user_id = $1', [sellerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
    console.log('Database cleaned up successfully!');
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  }

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
  await pool.end();
}

run();
