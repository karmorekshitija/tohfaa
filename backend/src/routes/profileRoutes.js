const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const { uploadAvatar } = require('../middleware/upload');
const { formatImg } = require('../utils/helpers');

// GET /api/profile/me
router.get('/api/profile/me', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const user = await db.prepare('SELECT id, email, full_name, role, avatar_url, is_active FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    let sellerProfile = null;
    if (user.role === 'seller') {
      sellerProfile = await db.prepare('SELECT shop_name, shop_bio, is_approved FROM seller_profiles WHERE user_id = ?').get(userId);
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: formatImg(user.avatar_url, req),
        seller_profile: sellerProfile
      }
    });
  } catch (err) {
    console.error('Error in GET /api/profile/me:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// PUT /api/profile/me
router.put('/api/profile/me', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { full_name } = req.body;

  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
    return res.status(400).json({ error: true, message: 'full_name must be at least 2 characters', code: 'VALIDATION_ERROR' });
  }

  try {
    await db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(full_name.trim(), userId);
    const updatedUser = await db.prepare('SELECT id, email, full_name, role, avatar_url FROM users WHERE id = ?').get(userId);

    return res.status(200).json({
      success: true,
      data: {
        ...updatedUser,
        avatar_url: formatImg(updatedUser.avatar_url, req)
      }
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// POST /api/profile/avatar
router.post('/api/profile/avatar', rateLimit(30), authenticateToken, (req, res, next) => {
  uploadAvatar.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: true, message: 'Invalid file type', code: 'INVALID_FILE_TYPE' });
      }
      return res.status(400).json({ error: true, message: err.message || 'Upload error', code: 'UPLOAD_ERROR' });
    }
    next();
  });
}, async (req, res) => {
  const userId = req.user.user_id;
  if (!req.file) {
    return res.status(400).json({ error: true, message: 'No file uploaded', code: 'NO_FILE' });
  }

  try {
    const relativePath = `/uploads/avatars/${req.file.filename}`;
    await db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(relativePath, userId);

    return res.status(200).json({
      success: true,
      data: {
        avatar_url: formatImg(relativePath, req)
      }
    });
  } catch (err) {
    console.error('Error setting avatar:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/wishlist
router.get('/api/wishlist', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const items = await db.prepare(`
      SELECT 
        p.id, p.name, p.price_paise, p.ships_in_days, p.status,
        COALESCE(
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
          (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1)
        ) AS image_url,
        COALESCE(sp.shop_name, u.full_name) AS seller_name
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE w.user_id = ? AND p.status != 'archived'
      ORDER BY w.created_at DESC
    `).all(userId);

    return res.status(200).json({
      success: true,
      data: { items }
    });
  } catch (err) {
    console.error('Error fetching wishlist:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// POST /api/wishlist/toggle
router.post('/api/wishlist/toggle', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { product_id } = req.body;

  if (!product_id || !Number.isInteger(product_id)) {
    return res.status(400).json({ error: true, message: 'product_id integer required', code: 'VALIDATION_ERROR' });
  }

  try {
    const existing = await db.prepare('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?').get(userId, product_id);

    if (existing) {
      await db.prepare('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?').run(userId, product_id);
      return res.status(200).json({ success: true, data: { is_wishlisted: false } });
    } else {
      await db.prepare('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)').run(userId, product_id);
      return res.status(200).json({ success: true, data: { is_wishlisted: true } });
    }
  } catch (err) {
    console.error('Error toggling wishlist:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/notifications
router.get('/api/notifications', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const notifications = await db.prepare(`
      SELECT id, type, message, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(userId);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount
      }
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// POST /api/notifications/read-all
router.post('/api/notifications/read-all', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error marking notifications as read:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

module.exports = router;
