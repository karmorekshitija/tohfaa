const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireSeller } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const {
  uploadListingPhoto,
  uploadSellerPhoto,
  uploadSellerBanner,
  uploadSellerAboutImage
} = require('../middleware/upload');
const { formatImg, normalizeImageUrl, getThumbnailUrl } = require('../utils/helpers');

// GET /api/seller/dashboard
router.get('/api/seller/dashboard', rateLimit(60), requireSeller, async (req, res) => {
  const sellerId = req.seller.user_id;

  try {
    const stats = await db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE seller_id = ?) AS total_orders,
        (SELECT COALESCE(SUM(total_paise), 0) FROM orders WHERE seller_id = ? AND status != 'Cancelled') AS total_revenue_paise,
        (SELECT COUNT(*) FROM products WHERE seller_id = ? AND status = 'active') AS active_listings_count,
        (SELECT COUNT(*) FROM orders WHERE seller_id = ? AND status IN ('Processing', 'awaiting_payment')) AS pending_fulfillment_count
    `).get(sellerId, sellerId, sellerId, sellerId);

    const recentOrders = await db.prepare(`
      SELECT o.id, o.order_ref, o.status, o.total_paise, o.created_at, u.full_name AS buyer_name
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `).all(sellerId);

    return res.status(200).json({
      success: true,
      data: {
        shop_name: req.seller.shop_name,
        is_approved: req.seller.is_approved === 1,
        stats: {
          total_orders: stats.total_orders,
          total_revenue_paise: stats.total_revenue_paise,
          active_listings_count: stats.active_listings_count,
          pending_fulfillment_count: stats.pending_fulfillment_count
        },
        recent_orders: recentOrders
      }
    });
  } catch (err) {
    console.error('Error fetching seller dashboard:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/seller/profile
router.get('/api/seller/profile', requireSeller, async (req, res) => {
  try {
    const seller = req.seller;
    const user = await db.prepare('SELECT avatar_url, full_name, email FROM users WHERE id = ?').get(seller.user_id);

    return res.status(200).json({
      success: true,
      data: {
        user_id: seller.user_id,
        full_name: user ? user.full_name : '',
        email: user ? user.email : '',
        avatar_url: user ? formatImg(user.avatar_url, req) : null,
        shop_name: seller.shop_name,
        shop_bio: seller.shop_bio,
        ships_in_days: seller.ships_in_days,
        instagram_handle: seller.instagram_handle,
        is_approved: seller.is_approved === 1
      }
    });
  } catch (err) {
    console.error('Error fetching seller profile:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// PUT /api/seller/profile
router.put('/api/seller/profile', requireSeller, async (req, res) => {
  const sellerId = req.seller.user_id;
  const { shop_name, shop_bio, ships_in_days, instagram_handle } = req.body;

  if (!shop_name || typeof shop_name !== 'string' || shop_name.trim().length < 2) {
    return res.status(400).json({ error: true, message: 'shop_name must be at least 2 characters', code: 'VALIDATION_ERROR' });
  }

  try {
    await db.prepare(`
      UPDATE seller_profiles
      SET shop_name = ?, shop_bio = ?, ships_in_days = ?, instagram_handle = ?
      WHERE user_id = ?
    `).run(
      shop_name.trim(),
      shop_bio ? shop_bio.trim() : null,
      ships_in_days && Number.isInteger(ships_in_days) ? ships_in_days : 3,
      instagram_handle ? instagram_handle.trim() : null,
      sellerId
    );

    return res.status(200).json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating seller profile:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/seller/catalog
const handleGetCatalog = async (req, res) => {
  const sellerId = req.seller.user_id;
  try {
    const products = await db.prepare(`
      SELECT 
        p.id, p.name, p.description, p.price_paise, p.stock_qty, p.ships_in_days, p.status, p.created_at,
        c.name AS category_name,
        COALESCE(
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
          (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1)
        ) AS image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = ? AND p.status != 'archived'
      ORDER BY p.created_at DESC
    `).all(sellerId);

    const formatted = products.map(p => ({
      ...p,
      image_url: getThumbnailUrl(p.image_url)
    }));

    return res.status(200).json({
      success: true,
      data: { products: formatted }
    });
  } catch (err) {
    console.error('Error fetching seller catalog:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
};

router.get('/api/seller/catalog', requireSeller, handleGetCatalog);
router.get('/api/seller/listings', requireSeller, handleGetCatalog);

module.exports = router;
