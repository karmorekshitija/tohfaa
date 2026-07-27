const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');

// GET /api/occasions
router.get('/api/occasions', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const occasions = await db.prepare(`
      SELECT id, title, occasion_type, date, reminder_days, notes, created_at
      FROM occasions
      WHERE user_id = ?
      ORDER BY date ASC
    `).all(userId);

    return res.status(200).json({
      success: true,
      data: {
        occasions,
        total: occasions.length
      }
    });
  } catch (err) {
    console.error('Error fetching occasions:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// GET /api/occasions/upcoming
router.get('/api/occasions/upcoming', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const windowDays = parseInt(req.query.days) || 30;
  try {
    const occasions = await db.prepare(`
      SELECT id, title, occasion_type, date, reminder_days, notes
      FROM occasions
      WHERE user_id = ?
      ORDER BY date ASC
    `).all(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = occasions.filter(occ => {
      const occDate = new Date(occ.date);
      const thisYear = today.getFullYear();
      const nextOcc = new Date(thisYear, occDate.getMonth(), occDate.getDate());
      if (nextOcc < today) {
        nextOcc.setFullYear(thisYear + 1);
      }
      const daysUntil = Math.round((nextOcc - today) / (1000 * 60 * 60 * 24));
      occ.days_until = daysUntil;
      occ.next_date = nextOcc.toISOString().split('T')[0];
      return daysUntil <= windowDays;
    });

    return res.status(200).json({
      success: true,
      data: { upcoming }
    });
  } catch (err) {
    console.error('Error fetching upcoming occasions:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// POST /api/occasions
router.post('/api/occasions', rateLimit(30), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { title, occasion_type, date, reminder_days, notes } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: true, message: 'title is required', code: 'VALIDATION_ERROR' });
  }
  if (!date || typeof date !== 'string' || date.trim() === '') {
    return res.status(400).json({ error: true, message: 'date is required (YYYY-MM-DD)', code: 'VALIDATION_ERROR' });
  }
  const validTypes = ['birthday', 'anniversary', 'wedding', 'festival', 'just_because', 'other'];
  const finalType = validTypes.includes(occasion_type) ? occasion_type : 'other';
  const finalReminderDays = Number.isInteger(reminder_days) ? reminder_days : 7;
  const finalNotes = notes && typeof notes === 'string' ? notes.trim() : null;

  try {
    const info = await db.prepare(`
      INSERT INTO occasions (user_id, title, occasion_type, date, reminder_days, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, title.trim(), finalType, date.trim(), finalReminderDays, finalNotes);

    return res.status(201).json({
      success: true,
      data: {
        id: info.lastInsertRowid,
        title: title.trim(),
        occasion_type: finalType,
        date: date.trim(),
        reminder_days: finalReminderDays,
        notes: finalNotes
      }
    });
  } catch (err) {
    console.error('Error creating occasion:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// PUT /api/occasions/:id
router.put('/api/occasions/:id', rateLimit(30), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { title, occasion_type, date, reminder_days, notes } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: true, message: 'title is required', code: 'VALIDATION_ERROR' });
  }
  if (!date || typeof date !== 'string' || date.trim() === '') {
    return res.status(400).json({ error: true, message: 'date is required (YYYY-MM-DD)', code: 'VALIDATION_ERROR' });
  }

  try {
    const existing = await db.prepare('SELECT user_id FROM occasions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Occasion not found', code: 'OCCASION_NOT_FOUND' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: true, message: 'Not your occasion', code: 'FORBIDDEN' });
    }

    const validTypes = ['birthday', 'anniversary', 'wedding', 'festival', 'just_because', 'other'];
    const finalType = validTypes.includes(occasion_type) ? occasion_type : 'other';
    const finalReminderDays = Number.isInteger(reminder_days) ? reminder_days : 7;
    const finalNotes = notes && typeof notes === 'string' ? notes.trim() : null;

    await db.prepare(`
      UPDATE occasions
      SET title = ?, occasion_type = ?, date = ?, reminder_days = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title.trim(), finalType, date.trim(), finalReminderDays, finalNotes, id);

    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        title: title.trim(),
        occasion_type: finalType,
        date: date.trim(),
        reminder_days: finalReminderDays,
        notes: finalNotes
      }
    });
  } catch (err) {
    console.error('Error updating occasion:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

// DELETE /api/occasions/:id
router.delete('/api/occasions/:id', rateLimit(30), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  try {
    const existing = await db.prepare('SELECT user_id FROM occasions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: true, message: 'Occasion not found', code: 'OCCASION_NOT_FOUND' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: true, message: 'Not your occasion', code: 'FORBIDDEN' });
    }

    await db.prepare('DELETE FROM occasions WHERE id = ?').run(id);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting occasion:', err);
    return res.status(500).json({ error: true, message: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
});

module.exports = router;
