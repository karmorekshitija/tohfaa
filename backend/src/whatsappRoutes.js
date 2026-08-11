const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('./db');
const whatsappService = require('./services/whatsappService');
const whatsappBotService = require('./services/whatsappBotService');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

// Authentication middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      error: true,
      message: "Authorization token required",
      code: "UNAUTHORIZED"
    });
  }
  
  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid or expired authorization token",
        code: "UNAUTHORIZED"
      });
    }
    
    // Check if user is active/banned
    const dbUser = await db.prepare('SELECT id, is_active, is_banned, role FROM users WHERE id = ?').get(user.user_id);
    if (!dbUser || dbUser.is_active !== 1 || dbUser.is_banned === 1) {
      return res.status(403).json({
        error: true,
        message: "User account is suspended or invalid",
        code: "FORBIDDEN"
      });
    }
    
    req.user = { ...user, role: dbUser.role };
    next();
  });
}

// Require Seller middleware
async function requireSeller(req, res, next) {
  await authenticateToken(req, res, async () => {
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        error: true,
        message: 'Seller access required',
        code: 'FORBIDDEN'
      });
    }
    const seller = await db.prepare('SELECT * FROM seller_profiles WHERE user_id = ?').get(req.user.user_id);
    if (!seller) {
      return res.status(403).json({
        error: true,
        message: 'Seller profile not found',
        code: 'NO_SELLER_PROFILE'
      });
    }
    req.seller = seller;
    next();
  });
}

/**
 * Format phone number to clean E.164-like format (e.g. +91XXXXXXXXXX)
 */
function formatPhoneNumber(num) {
  if (!num) return '';
  let formatted = num.replace(/[^\d+]/g, '');
  if (!formatted.startsWith('+')) {
    if (formatted.length === 10) {
      formatted = '+91' + formatted;
    } else {
      formatted = '+' + formatted;
    }
  }
  return formatted;
}

// POST /api/seller/whatsapp/link — request OTP
router.post('/seller/whatsapp/link', requireSeller, async (req, res) => {
  try {
    const { phone_number } = req.body;
    if (!phone_number) {
      return res.status(400).json({ error: true, message: 'Phone number is required' });
    }

    const formatted = formatPhoneNumber(phone_number);
    if (formatted.length < 8) {
      return res.status(400).json({ error: true, message: 'Invalid phone number format' });
    }

    // Check if number is verified & linked to a DIFFERENT seller
    const otherSeller = await db.prepare(
      'SELECT id, user_id FROM seller_profiles WHERE whatsapp_number = ? AND whatsapp_verified_at IS NOT NULL'
    ).get(formatted);

    if (otherSeller && otherSeller.user_id !== req.seller.user_id) {
      return res.status(400).json({
        error: true,
        message: 'This WhatsApp number is already linked to another seller account'
      });
    }

    // Rate Limiting (max 5 OTPs per hour)
    const now = new Date();
    let otpCount = req.seller.whatsapp_otp_count || 0;
    let resetTime = req.seller.whatsapp_otp_count_reset_at ? new Date(req.seller.whatsapp_otp_count_reset_at) : null;

    if (!resetTime || now > resetTime) {
      // Reset rate limit window
      otpCount = 1;
      resetTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    } else {
      if (otpCount >= 5) {
        return res.status(429).json({
          error: true,
          message: 'Too many OTP requests. Maximum 5 per hour. Please wait before trying again.'
        });
      }
      otpCount += 1;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Save state on both tables
    const resetTimeStr = resetTime.toISOString();
    const expiresAtStr = expiresAt.toISOString();

    await db.prepare(`
      UPDATE seller_profiles 
      SET whatsapp_pending_number = ?, 
          whatsapp_otp = ?, 
          whatsapp_otp_expires_at = ?, 
          whatsapp_otp_count = ?, 
          whatsapp_otp_count_reset_at = ?
      WHERE user_id = ?
    `).run(formatted, otp, expiresAtStr, otpCount, resetTimeStr, req.seller.user_id);

    await db.prepare(`
      UPDATE sellers 
      SET whatsapp_pending_number = ?, 
          whatsapp_otp = ?, 
          whatsapp_otp_expires_at = ?, 
          whatsapp_otp_count = ?, 
          whatsapp_otp_count_reset_at = ?
      WHERE user_id = ?
    `).run(formatted, otp, expiresAtStr, otpCount, resetTimeStr, req.seller.user_id);

    // Dispatch OTP
    await whatsappService.sendWhatsAppOTP(formatted, otp);

    return res.status(200).json({
      success: true,
      message: 'Verification OTP sent successfully via WhatsApp'
    });
  } catch (err) {
    console.error('POST /api/seller/whatsapp/link error:', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// POST /api/seller/whatsapp/verify — verify OTP
router.post('/seller/whatsapp/verify', requireSeller, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: true, message: 'Verification OTP is required' });
    }

    const seller = await db.prepare('SELECT * FROM seller_profiles WHERE user_id = ?').get(req.seller.user_id);
    const pendingNum = seller.whatsapp_pending_number;
    const dbOtp = seller.whatsapp_otp;
    const expiresAt = seller.whatsapp_otp_expires_at ? new Date(seller.whatsapp_otp_expires_at) : null;

    if (!pendingNum || !dbOtp || !expiresAt) {
      return res.status(400).json({ error: true, message: 'No active WhatsApp linking request found' });
    }

    if (new Date() > expiresAt) {
      return res.status(400).json({ error: true, message: 'OTP code has expired. Please request a new one.' });
    }

    if (otp.toString().trim() !== dbOtp.toString().trim()) {
      return res.status(400).json({ error: true, message: 'Invalid verification OTP code' });
    }

    // Success! Link phone number
    const verifiedAtStr = new Date().toISOString();

    await db.prepare(`
      UPDATE seller_profiles
      SET whatsapp_number = ?,
          whatsapp_verified_at = ?,
          whatsapp_pending_number = NULL,
          whatsapp_otp = NULL,
          whatsapp_otp_expires_at = NULL
      WHERE user_id = ?
    `).run(pendingNum, verifiedAtStr, seller.user_id);

    await db.prepare(`
      UPDATE sellers
      SET whatsapp_number = ?,
          whatsapp_verified_at = ?,
          whatsapp_pending_number = NULL,
          whatsapp_otp = NULL,
          whatsapp_otp_expires_at = NULL
      WHERE user_id = ?
    `).run(pendingNum, verifiedAtStr, seller.user_id);

    // Send confirmation message to the verified number
    await whatsappService.sendWhatsAppTextMessage(
      pendingNum,
      'Your WhatsApp number has been successfully linked to your Tohfa Seller Studio! You can now query order updates, pause/resume products, and receive daily summaries directly here.'
    );

    return res.status(200).json({
      success: true,
      message: 'WhatsApp number linked and verified successfully',
      whatsapp_number: pendingNum
    });
  } catch (err) {
    console.error('POST /api/seller/whatsapp/verify error:', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// POST /api/seller/whatsapp/unlink — unlink number
router.post('/seller/whatsapp/unlink', requireSeller, async (req, res) => {
  try {
    await db.prepare(`
      UPDATE seller_profiles
      SET whatsapp_number = NULL,
          whatsapp_verified_at = NULL,
          whatsapp_pending_number = NULL,
          whatsapp_otp = NULL,
          whatsapp_otp_expires_at = NULL,
          whatsapp_otp_count = 0,
          whatsapp_otp_count_reset_at = NULL
      WHERE user_id = ?
    `).run(req.seller.user_id);

    await db.prepare(`
      UPDATE sellers
      SET whatsapp_number = NULL,
          whatsapp_verified_at = NULL,
          whatsapp_pending_number = NULL,
          whatsapp_otp = NULL,
          whatsapp_otp_expires_at = NULL,
          whatsapp_otp_count = 0,
          whatsapp_otp_count_reset_at = NULL
      WHERE user_id = ?
    `).run(req.seller.user_id);

    return res.status(200).json({
      success: true,
      message: 'WhatsApp number unlinked successfully'
    });
  } catch (err) {
    console.error('POST /api/seller/whatsapp/unlink error:', err);
    return res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// GET /api/whatsapp/webhook — Meta handshake verification
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (!process.env.META_WHATSAPP_VERIFY_TOKEN) {
    console.error('CRITICAL: META_WHATSAPP_VERIFY_TOKEN environment variable is missing!');
    return res.status(500).send('Server configuration error: META_WHATSAPP_VERIFY_TOKEN missing');
  }

  const localVerifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === localVerifyToken) {
    console.log('WhatsApp Webhook Handshake verified successfully.');
    return res.status(200).send(challenge);
  } else {
    console.warn('WhatsApp Webhook Handshake failed token validation.');
    return res.sendStatus(403);
  }
});

// POST /api/whatsapp/webhook — Handle incoming messages
router.post('/whatsapp/webhook', async (req, res) => {
  try {
    const entry = req.body.entry;
    if (!entry || !entry[0] || !entry[0].changes || !entry[0].changes[0]) {
      return res.sendStatus(200); // Acknowledge Meta but do nothing
    }

    const changeValue = entry[0].changes[0].value;
    if (!changeValue || !changeValue.messages || !changeValue.messages[0]) {
      return res.sendStatus(200); // Not a message event
    }

    const messageObj = changeValue.messages[0];
    const rawFrom = messageObj.from; // Sender number, e.g. "919876543210"
    
    // Normalize format
    const formattedFrom = formatPhoneNumber(rawFrom);

    // Look up seller_id (users.id) by whatsapp_number
    const seller = await db.prepare(
      'SELECT user_id FROM seller_profiles WHERE whatsapp_number = ? AND whatsapp_verified_at IS NOT NULL'
    ).get(formattedFrom);

    if (!seller) {
      // Not linked, send prompt to link
      await whatsappService.sendWhatsAppTextMessage(
        formattedFrom,
        "This number isn't linked to a Tohfa seller account yet. Please link it from your seller dashboard settings."
      );
      return res.sendStatus(200); // Done, fail safe
    }

    const sellerId = seller.user_id; // Resolved user_id for data scoping
    let messageText = '';

    if (messageObj.type === 'text' && messageObj.text) {
      messageText = messageObj.text.body;
    } else if (messageObj.type === 'button' && messageObj.button) {
      messageText = messageObj.button.text;
    } else {
      // Non-text message, fail safe
      await whatsappService.sendWhatsAppTextMessage(
        formattedFrom,
        "Tohfa Assistant currently only accepts text messages. Try typing a command like 'pause Blue Mug' or 'show today's orders'."
      );
      return res.sendStatus(200);
    }

    // Process using Gemini Bot parser
    const botResponseText = await whatsappBotService.processMessage(messageText, sellerId, formattedFrom);
    
    // Send response
    if (botResponseText) {
      await whatsappService.sendWhatsAppTextMessage(formattedFrom, botResponseText);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('POST /api/whatsapp/webhook error:', err);
    return res.sendStatus(200); // Keep Meta happy, prevent infinite retries
  }
});

module.exports = router;
