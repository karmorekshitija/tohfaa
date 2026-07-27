const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');

function getLocalDateString() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

async function checkCapacityExceeded(productId, quantity) {
  const product = await db.prepare('SELECT seller_id, name FROM products WHERE id = ?').get(productId);
  if (!product) {
    return { exceeded: false, reason: 'Product not found', listing: null, sellerId: null };
  }
  
  const sellerId = product.seller_id;
  const productName = product.name;
  
  let listing = await db.prepare('SELECT id, title, daily_product_cap FROM listings WHERE id = ?').get(productId);
  if (!listing || listing.seller_id !== sellerId || listing.title !== productName) {
    listing = await db.prepare('SELECT id, title, daily_product_cap FROM listings WHERE seller_id = ? AND title = ?').get(sellerId, productName);
  }
  
  const listingId = listing ? listing.id : productId;
  const dailyProductCap = listing ? listing.daily_product_cap : null;
  
  const sellerProfile = await db.prepare('SELECT daily_order_limit FROM seller_profiles WHERE user_id = ?').get(sellerId);
  const dailyOrderLimit = sellerProfile ? sellerProfile.daily_order_limit : null;
  
  if (dailyProductCap !== null && dailyProductCap >= 0) {
    const todayStr = getLocalDateString();
    const standardUnits = (await db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as qty
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = ? AND date(o.created_at) = ? AND o.status != 'Cancelled'
    `).get(listingId, todayStr)).qty;
    
    const customUnits = (await db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as qty
      FROM orders
      WHERE listing_id = ? AND date(created_at) = ? AND status != 'Cancelled' AND order_type = 'custom'
    `).get(listingId, todayStr)).qty;
    
    const listingTodayUnits = standardUnits + customUnits;
    if (listingTodayUnits + quantity > dailyProductCap) {
      return {
        exceeded: true,
        reason: `Listing daily cap of ${dailyProductCap} units exceeded.`,
        listing,
        sellerId
      };
    }
  }
  
  if (dailyOrderLimit !== null && dailyOrderLimit >= 0) {
    const todayStr = getLocalDateString();
    const standardUnits = (await db.prepare(`
      SELECT COALESCE(SUM(oi.quantity), 0) as qty
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.seller_id = ? AND date(o.created_at) = ? AND o.status != 'Cancelled'
    `).get(sellerId, todayStr)).qty;
    
    const customUnits = (await db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as qty
      FROM orders
      WHERE seller_id = ? AND date(created_at) = ? AND status != 'Cancelled' AND order_type = 'custom'
    `).get(sellerId, todayStr)).qty;
    
    const sellerTodayUnits = standardUnits + customUnits;
    if (sellerTodayUnits + quantity > dailyOrderLimit) {
      return {
        exceeded: true,
        reason: `Seller daily limit of ${dailyOrderLimit} units exceeded.`,
        listing,
        sellerId
      };
    }
  }

  return { exceeded: false, reason: '', listing, sellerId };
}

// POST /api/orders
router.post('/api/orders', rateLimit(10), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { address_id, cart_item_ids } = req.body;
  
  if (address_id === undefined || address_id === null) {
    return res.status(400).json({
      error: true,
      message: "address_id required",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const address = await db.prepare('SELECT id, user_id FROM addresses WHERE id = ?').get(address_id);
    if (!address || address.user_id !== userId) {
      return res.status(404).json({
        error: true,
        message: "Address not found",
        code: "ADDRESS_NOT_FOUND"
      });
    }
    
    let cartItems = [];
    if (cart_item_ids && Array.isArray(cart_item_ids) && cart_item_ids.length > 0) {
      const placeholders = cart_item_ids.map(() => '?').join(',');
      const sql = `
        SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price_paise, p.stock_qty, p.status,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ? AND ci.id IN (${placeholders}) AND p.status != 'archived'
      `;
      cartItems = await db.prepare(sql).all(userId, ...cart_item_ids);
      if (cartItems.length !== cart_item_ids.length) {
        return res.status(422).json({
          error: true,
          message: "Cart items out of stock or not found",
          code: "INVALID_CART_ITEMS"
        });
      }
    } else {
      const sql = `
        SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price_paise, p.stock_qty, p.status,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image_url
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = ? AND p.status != 'archived'
      `;
      cartItems = await db.prepare(sql).all(userId);
    }
    
    if (cartItems.length === 0) {
      return res.status(422).json({
        error: true,
        message: "Cart is empty / items out of stock",
        code: "EMPTY_CART"
      });
    }
    
    for (const item of cartItems) {
      if (item.quantity > item.stock_qty || item.status !== 'active') {
        return res.status(422).json({
          error: true,
          message: `Requested quantity exceeds stock for ${item.name}`,
          code: "INSUFFICIENT_STOCK"
        });
      }
    }

    const sellerQuantityMap = {};
    for (const item of cartItems) {
      const pRow = await db.prepare('SELECT seller_id FROM products WHERE id = ?').get(item.product_id);
      const sid = pRow ? pRow.seller_id : null;
      if (sid !== null) {
        if (sid === userId) {
          return res.status(403).json({
            error: true,
            message: "Sellers cannot purchase their own products",
            code: "OWN_PRODUCT_FORBIDDEN"
          });
        }
        if (!sellerQuantityMap[sid]) {
          sellerQuantityMap[sid] = { totalQty: 0, items: [] };
        }
        sellerQuantityMap[sid].totalQty += item.quantity;
        sellerQuantityMap[sid].items.push(item);
      }
    }

    const subtotal_paise = cartItems.reduce((sum, item) => sum + item.price_paise * item.quantity, 0);
    const shipping_paise = subtotal_paise >= 50000 ? 0 : 12000;
    const total_paise = subtotal_paise + shipping_paise;

    const year = new Date().getFullYear();
    const order_ref = `TF-${year}-${Math.floor(1000 + Math.random() * 9000)}`;

    let razorpayOrderId = null;
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            amount: total_paise,
            currency: 'INR',
            receipt: order_ref
          })
        });
        if (rpRes.ok) {
          const rpData = await rpRes.json();
          razorpayOrderId = rpData.id;
        }
      } catch (err) {
        console.error('Error generating real Razorpay order ID:', err);
      }
    }

    if (!razorpayOrderId) {
      razorpayOrderId = 'order_' + crypto.randomBytes(8).toString('hex');
    }

    let txnResult;
    try {
      txnResult = await db.transaction(async () => {
        for (const [sid, sellerCart] of Object.entries(sellerQuantityMap)) {
          const representativeItem = sellerCart.items[0];
          const check = await checkCapacityExceeded(representativeItem.product_id, sellerCart.totalQty);

          if (check.exceeded) {
            const draftOrderRef = `TF-OVF-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
            const draftOrderInfo = await db.prepare(`
              INSERT INTO orders (order_ref, buyer_id, seller_id, address_id, status, subtotal_paise, shipping_paise, total_paise, razorpay_order_id)
              VALUES (?, ?, ?, ?, 'Awaiting Reschedule Payment', ?, ?, ?, NULL)
            `).run(draftOrderRef, userId, parseInt(sid), address_id, subtotal_paise, shipping_paise, total_paise);

            const draftOrderId = draftOrderInfo.lastInsertRowid;

            const insertOrderItem = db.prepare(`
              INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity, image_url)
              VALUES (?, ?, ?, ?, ?, ?)
            `);
            for (const item of sellerCart.items) {
              await insertOrderItem.run(draftOrderId, item.product_id, item.name, item.price_paise, item.quantity, item.image_url);
            }

            let overflowRequestId = null;
            if (check.listing) {
              const info = await db.prepare(`
                INSERT INTO overflow_requests (buyer_id, seller_id, listing_id, variant_id, quantity, original_price_paise, order_id, status, created_at, updated_at)
                VALUES (?, ?, ?, NULL, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
              `).run(userId, check.sellerId, check.listing.id, sellerCart.totalQty, representativeItem.price_paise, draftOrderId);

              overflowRequestId = info.lastInsertRowid;
            }

            const buyer = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
            const buyerName = buyer ? buyer.full_name : 'A buyer';
            if (check.listing) {
              await db.prepare(`
                INSERT INTO notifications (user_id, type, message, is_read, created_at)
                VALUES (?, 'new_overflow_request', ?, 0, datetime('now'))
              `).run(check.sellerId, `New overflow order request from ${buyerName} for ${check.listing.title}`);
            }

            return {
              overflow: true,
              overflow_request_id: overflowRequestId ? String(overflowRequestId) : null,
              draft_order_id: String(draftOrderId)
            };
          }
        }

        const firstItem = cartItems[0];
        const pRow = await db.prepare("SELECT seller_id FROM products WHERE id = ?").get(firstItem.product_id);
        const orderSellerId = pRow ? pRow.seller_id : null;

        const CONTENTION_THRESHOLD = 1;
        for (const item of cartItems) {
          const liveProduct = await db.prepare('SELECT stock_qty, status FROM products WHERE id = ?').get(item.product_id);
          if (!liveProduct || liveProduct.stock_qty <= CONTENTION_THRESHOLD) {
            const contestRow = await db.prepare(`
              INSERT INTO checkout_contention_attempts (product_id, buyer_id, quantity, status, requested_at, address_id, razorpay_order_id)
              VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP, ?, ?)
            `).run(item.product_id, userId, item.quantity, address_id, razorpayOrderId);
            return {
              contention: true,
              attempt_id: Number(contestRow.lastInsertRowid),
              product_id: item.product_id,
              contention_pending: true
            };
          }
        }

        const orderInfo = await db.prepare(`
          INSERT INTO orders (order_ref, buyer_id, seller_id, address_id, status, subtotal_paise, shipping_paise, total_paise, razorpay_order_id)
          VALUES (?, ?, ?, ?, 'Awaiting Payment', ?, ?, ?, ?)
        `).run(order_ref, userId, orderSellerId, address_id, subtotal_paise, shipping_paise, total_paise, razorpayOrderId);

        const oId = orderInfo.lastInsertRowid;

        const insertOrderItem = db.prepare(`
          INSERT INTO order_items (order_id, product_id, product_name, unit_price_paise, quantity, image_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const item of cartItems) {
          await insertOrderItem.run(oId, item.product_id, item.name, item.price_paise, item.quantity, item.image_url);
        }

        const cartItemIds = cartItems.map(item => item.id);
        const placeholders = cartItemIds.map(() => '?').join(',');
        await db.prepare(`DELETE FROM cart_items WHERE id IN (${placeholders})`).run(...cartItemIds);

        return { overflow: false, orderId: oId };
      })();
    } catch (txnErr) {
      console.error('Transaction error in POST /api/orders:', txnErr);
      return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
    }

    if (txnResult.overflow) {
      return res.status(200).json({
        success: true,
        overflow: true,
        overflow_request_id: txnResult.overflow_request_id,
        draft_order_id: txnResult.draft_order_id,
        message: "Capacity exceeded. Reschedule request created."
      });
    }

    if (txnResult.contention) {
      return res.status(200).json({
        success: true,
        status: 'contention_pending',
        attempt_id: txnResult.attempt_id,
        message: "Order placed on hold while we verify stock contention."
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        order_id: txnResult.orderId,
        order_ref,
        subtotal_paise,
        shipping_paise,
        total_paise,
        status: 'Awaiting Payment',
        razorpay_order_id: razorpayOrderId
      }
    });
  } catch (err) {
    console.error('Error placing order:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// GET /api/checkout/contention/:attempt_id
router.get('/api/checkout/contention/:attempt_id', rateLimit(120), authenticateToken, async (req, res) => {
  const { attempt_id } = req.params;
  const userId = req.user.user_id;

  try {
    const attempt = await db.prepare('SELECT * FROM checkout_contention_attempts WHERE id = ?').get(attempt_id);
    if (!attempt) {
      return res.status(404).json({ error: true, message: 'Contention attempt not found', code: 'NOT_FOUND' });
    }
    if (attempt.buyer_id !== userId) {
      return res.status(403).json({ error: true, message: 'Forbidden', code: 'FORBIDDEN' });
    }

    return res.status(200).json({
      success: true,
      data: {
        status: attempt.status,
        order_id: attempt.order_id,
        order_ref: attempt.order_ref
      }
    });
  } catch (err) {
    console.error('Error checking contention status:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/orders
router.get('/api/orders', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const orders = await db.prepare(`
      SELECT 
        o.id, o.order_ref, o.status, o.total_paise, o.created_at,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
        (SELECT product_name FROM order_items WHERE order_id = o.id ORDER BY id ASC LIMIT 1) AS primary_product_name,
        (SELECT image_url FROM order_items WHERE order_id = o.id ORDER BY id ASC LIMIT 1) AS primary_image_url
      FROM orders o
      WHERE o.buyer_id = ?
      ORDER BY o.created_at DESC
    `).all(userId);

    return res.status(200).json({
      success: true,
      data: { orders }
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

module.exports = router;
