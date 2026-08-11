const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateAdminToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const { uploadCategory, uploadUiSettings, uploadSpotlight } = require('../middleware/upload');
const { normalizeImageUrl, formatImg } = require('../utils/helpers');

// GET /api/admin/seller-applications
router.get('/api/admin/seller-applications', authenticateAdminToken, async (req, res) => {
  try {
    const applications = await db.prepare(`
      SELECT 
        sp.id, sp.user_id, sp.shop_name, sp.shop_bio, sp.ships_in_days, sp.instagram_handle, sp.is_approved, sp.created_at,
        u.email, u.full_name
      FROM seller_profiles sp
      JOIN users u ON sp.user_id = u.id
      ORDER BY sp.created_at DESC
    `).all();

    return res.status(200).json({
      success: true,
      data: { applications }
    });
  } catch (err) {
    console.error('Error fetching seller applications:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// POST /api/admin/seller-applications/:id/approve
router.post('/api/admin/seller-applications/:id/approve', authenticateAdminToken, async (req, res) => {
  const { id } = req.params;
  try {
    const profile = await db.prepare('SELECT user_id FROM seller_profiles WHERE id = ? OR user_id = ?').get(id, id);
    if (!profile) {
      return res.status(404).json({ error: true, message: 'Application not found', code: 'NOT_FOUND' });
    }

    await db.prepare('UPDATE seller_profiles SET is_approved = 1 WHERE user_id = ?').run(profile.user_id);
    await db.prepare("UPDATE users SET role = 'seller' WHERE id = ?").run(profile.user_id);

    return res.status(200).json({ success: true, message: 'Seller application approved' });
  } catch (err) {
    console.error('Error approving seller application:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/admin/sellers
router.get('/api/admin/sellers', authenticateAdminToken, async (req, res) => {
  try {
    const sellers = await db.prepare(`
      SELECT 
        u.id AS user_id, u.full_name, u.email, u.is_banned, u.is_active, u.created_at,
        sp.shop_name, sp.is_approved,
        (SELECT COUNT(*) FROM products WHERE seller_id = u.id AND status = 'active') AS active_products,
        (SELECT COUNT(*) FROM orders WHERE seller_id = u.id) AS total_orders
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE u.role = 'seller' OR sp.id IS NOT NULL
      ORDER BY u.created_at DESC
    `).all();

    return res.status(200).json({
      success: true,
      data: { sellers }
    });
  } catch (err) {
    console.error('Error fetching admin sellers list:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/admin/categories
router.get('/api/admin/categories', authenticateAdminToken, async (req, res) => {
  try {
    const categories = await db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM products WHERE category_id = c.id) AS product_count
      FROM categories c
      ORDER BY c.name ASC
    `).all();

    const formatted = categories.map(cat => ({
      ...cat,
      image_url: normalizeImageUrl(cat.image_url, req),
      banner_image_url: normalizeImageUrl(cat.banner_image_url, req)
    }));

    return res.status(200).json({
      success: true,
      data: { categories: formatted }
    });
  } catch (err) {
    console.error('Error fetching admin categories:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/admin/dashboard/summary
router.get('/api/admin/dashboard/summary', authenticateAdminToken, async (req, res) => {
  try {
    const totals = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'buyer') AS total_buyers,
        (SELECT COUNT(*) FROM users WHERE role = 'seller') AS total_sellers,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total_paise), 0) FROM orders WHERE status != 'Cancelled') AS gross_revenue_paise,
        (SELECT COUNT(*) FROM seller_profiles WHERE is_approved = 0) AS pending_seller_apps
    `).get();

    return res.status(200).json({
      success: true,
      data: totals
    });
  } catch (err) {
    console.error('Error fetching admin summary:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

module.exports = router;
