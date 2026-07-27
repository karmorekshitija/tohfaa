const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');

const pincodeCache = {};

function fetchPincodeDetails(pincode) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(`https://api.postalpincode.in/pincode/${pincode}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// GET /api/addresses/pincode/:pincode
router.get('/api/addresses/pincode/:pincode', rateLimit(120), async (req, res) => {
  const { pincode } = req.params;
  
  if (!/^\d{6}$/.test(pincode)) {
    return res.status(400).json({
      error: true,
      message: "PIN code must be a 6-digit number",
      code: "INVALID_PINCODE"
    });
  }
  
  if (pincodeCache[pincode]) {
    return res.status(200).json({
      success: true,
      data: pincodeCache[pincode]
    });
  }
  
  try {
    const responseData = await fetchPincodeDetails(pincode);
    if (responseData && responseData[0] && responseData[0].Status === "Success") {
      const postOffice = responseData[0].PostOffice;
      if (postOffice && postOffice.length > 0) {
        const info = postOffice[0];
        const result = {
          state: info.State,
          city: info.District || info.Region || info.Circle,
          district: info.District,
          region: info.Region,
          country: "India"
        };
        pincodeCache[pincode] = result;
        return res.status(200).json({
          success: true,
          data: result
        });
      }
    }
    
    return res.status(404).json({
      error: true,
      message: "Invalid PIN code or no details found",
      code: "PINCODE_NOT_FOUND"
    });
  } catch (err) {
    console.error('Error fetching pincode details:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error"
    });
  }
});

// GET /api/addresses
router.get('/api/addresses', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  
  try {
    const addresses = await db.prepare('SELECT id, full_name, line1, line2, city, state, pincode, phone, is_default FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(userId);
    
    return res.status(200).json({
      success: true,
      data: {
        addresses
      }
    });
  } catch (err) {
    console.error('Error fetching addresses:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// POST /api/addresses
router.post('/api/addresses', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { full_name, line1, line2, city, state, pincode, phone, is_default } = req.body;
  
  if (!full_name || typeof full_name !== 'string' || full_name.trim() === '' ||
      !line1 || typeof line1 !== 'string' || line1.trim() === '' ||
      !city || typeof city !== 'string' || city.trim() === '' ||
      !state || typeof state !== 'string' || state.trim() === '' ||
      !pincode || typeof pincode !== 'string' || pincode.trim() === '') {
    return res.status(400).json({
      error: true,
      message: "full_name, line1, city, state, and pincode are required",
      code: "VALIDATION_ERROR"
    });
  }
  
  const finalLine2 = (line2 && typeof line2 === 'string') ? line2 : null;
  const finalPhone = (phone && typeof phone === 'string') ? phone : null;
  const isDefaultVal = is_default ? 1 : 0;
  
  try {
    const insertTransaction = db.transaction(async () => {
      if (isDefaultVal === 1) {
        await db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
      }
      
      const info = await db.prepare(`
        INSERT INTO addresses (user_id, full_name, line1, line2, city, state, pincode, phone, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, full_name, line1, finalLine2, city, state, pincode, finalPhone, isDefaultVal);
      
      return info.lastInsertRowid;
    });
    
    const addressId = await insertTransaction();
    
    return res.status(201).json({
      success: true,
      data: {
        id: addressId,
        full_name,
        line1,
        line2: finalLine2,
        city,
        state,
        pincode,
        phone: finalPhone,
        is_default: isDefaultVal
      }
    });
  } catch (err) {
    console.error('Error creating address:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// PUT /api/addresses/:id
router.put('/api/addresses/:id', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { full_name, line1, line2, city, state, pincode, phone, is_default } = req.body;
  
  if (!full_name || typeof full_name !== 'string' || full_name.trim() === '' ||
      !line1 || typeof line1 !== 'string' || line1.trim() === '' ||
      !city || typeof city !== 'string' || city.trim() === '' ||
      !state || typeof state !== 'string' || state.trim() === '' ||
      !pincode || typeof pincode !== 'string' || pincode.trim() === '') {
    return res.status(400).json({
      error: true,
      message: "full_name, line1, city, state, and pincode are required",
      code: "VALIDATION_ERROR"
    });
  }
  
  const finalLine2 = (line2 && typeof line2 === 'string') ? line2 : null;
  const finalPhone = (phone && typeof phone === 'string') ? phone : null;
  const isDefaultVal = is_default ? 1 : 0;
  
  try {
    const address = await db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(id);
    if (!address) {
      return res.status(404).json({
        error: true,
        message: "Address not found",
        code: "ADDRESS_NOT_FOUND"
      });
    }
    
    if (address.user_id !== userId) {
      return res.status(403).json({
        error: true,
        message: "Not your address",
        code: "FORBIDDEN"
      });
    }
    
    const updateTransaction = db.transaction(async () => {
      if (isDefaultVal === 1) {
        await db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
      }
      
      await db.prepare(`
        UPDATE addresses 
        SET full_name = ?, line1 = ?, line2 = ?, city = ?, state = ?, pincode = ?, phone = ?, is_default = ?
        WHERE id = ?
      `).run(full_name, line1, finalLine2, city, state, pincode, finalPhone, isDefaultVal, id);
    });
    
    await updateTransaction();
    
    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        full_name,
        line1,
        line2: finalLine2,
        city,
        state,
        pincode,
        phone: finalPhone,
        is_default: isDefaultVal
      }
    });
  } catch (err) {
    console.error('Error updating address:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// DELETE /api/addresses/:id
router.delete('/api/addresses/:id', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  
  try {
    const address = await db.prepare('SELECT user_id FROM addresses WHERE id = ?').get(id);
    if (!address) {
      return res.status(404).json({
        error: true,
        message: "Address not found",
        code: "ADDRESS_NOT_FOUND"
      });
    }
    
    if (address.user_id !== userId) {
      return res.status(403).json({
        error: true,
        message: "Not your address",
        code: "FORBIDDEN"
      });
    }
    
    const deleteTransaction = db.transaction(async () => {
      await db.prepare('UPDATE orders SET address_id = NULL WHERE address_id = ?').run(id);
      await db.prepare('DELETE FROM addresses WHERE id = ?').run(id);
    });
    await deleteTransaction();
    
    return res.status(200).json({
      success: true
    });
  } catch (err) {
    console.error('Error deleting address:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

module.exports = router;
