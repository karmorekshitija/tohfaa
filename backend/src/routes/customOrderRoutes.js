const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireSeller } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');

// GET /api/seller/overflow-requests
router.get('/api/seller/overflow-requests', requireSeller, async (req, res) => {
  const sellerId = req.seller.user_id;

  try {
    const requests = await db.prepare(`
      SELECT 
        o.id, o.buyer_id, o.listing_id, o.quantity, o.original_price_paise, o.proposed_date, o.seller_notes, o.status, o.created_at,
        u.full_name AS buyer_name, u.avatar_url AS buyer_avatar,
        l.title AS listing_title,
        COALESCE(
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
          (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1)
        ) AS listing_image
      FROM overflow_requests o
      JOIN users u ON o.buyer_id = u.id
      JOIN listings l ON o.listing_id = l.id
      LEFT JOIN products p ON l.id = p.id OR l.title = p.name
      WHERE o.seller_id = ?
      ORDER BY o.created_at DESC
    `).all(sellerId);

    return res.status(200).json({
      success: true,
      data: { requests }
    });
  } catch (err) {
    console.error('Error fetching overflow requests:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// POST /api/seller/overflow-requests/:id/respond
router.post('/api/seller/overflow-requests/:id/respond', requireSeller, async (req, res) => {
  const sellerId = req.seller.user_id;
  const { id } = req.params;
  const { action, proposed_date, seller_notes } = req.body;

  if (!['accept', 'reschedule', 'decline'].includes(action)) {
    return res.status(400).json({ error: true, message: "action must be 'accept', 'reschedule', or 'decline'", code: 'VALIDATION_ERROR' });
  }

  try {
    const overflowReq = await db.prepare('SELECT * FROM overflow_requests WHERE id = ? AND seller_id = ?').get(id, sellerId);
    if (!overflowReq) {
      return res.status(404).json({ error: true, message: 'Overflow request not found', code: 'NOT_FOUND' });
    }

    const newStatus = action === 'accept' ? 'accepted' : (action === 'reschedule' ? 'rescheduled' : 'declined');

    await db.prepare(`
      UPDATE overflow_requests
      SET status = ?, proposed_date = ?, seller_notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, proposed_date || null, seller_notes ? seller_notes.trim() : null, id);

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        status: newStatus
      }
    });
  } catch (err) {
    console.error('Error responding to overflow request:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

module.exports = router;
