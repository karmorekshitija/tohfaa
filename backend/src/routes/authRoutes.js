const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const emailService = require('../services/emailService');
const {
  BCRYPT_SALT_ROUNDS,
  validateEmail,
  generateTokens,
  getJwtSecret
} = require('../utils/helpers');

function handleInternalError(res, label, err) {
  console.error(`Error in ${label}:`, err);
  const isDev = process.env.NODE_ENV !== 'production';
  return res.status(500).json({
    error: true,
    message: isDev ? `Internal server error: ${err.message}` : "Internal server error",
    code: "INTERNAL_SERVER_ERROR",
    ...(isDev && { details: err.message, stack: err.stack })
  });
}

// POST /api/auth/register/buyer
router.post('/api/auth/register/buyer', rateLimit(10), async (req, res) => {
  const { full_name, email, password } = req.body;
  
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2 ||
      !email || typeof email !== 'string' || !validateEmail(email) ||
      !password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      error: true,
      message: "Missing or invalid fields",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({
        error: true,
        message: "Email already registered",
        code: "EMAIL_EXISTS"
      });
    }
    
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    
    const info = await db.prepare(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
    ).run(email, passwordHash, full_name, 'buyer');
    
    const userId = info.lastInsertRowid;
    const user = {
      id: userId,
      email,
      full_name,
      role: 'buyer',
      avatar_url: null
    };
    
    const { accessToken, refreshToken } = await generateTokens(user);
    
    return res.status(201).json({
      success: true,
      data: {
        user,
        access_token: accessToken,
        refresh_token: refreshToken
      }
    });
  } catch (err) {
    return handleInternalError(res, 'buyer registration', err);
  }
});

// POST /api/auth/register/seller (Legacy direct route)
router.post('/api/auth/register/seller', rateLimit(10), async (req, res) => {
  const { full_name, email, password, shop_name, shop_bio, ships_in_days, instagram_handle } = req.body;
  
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2 ||
      !email || typeof email !== 'string' || !validateEmail(email) ||
      !password || typeof password !== 'string' || password.length < 8 ||
      !shop_name || typeof shop_name !== 'string' || shop_name.trim().length < 2) {
    return res.status(400).json({
      error: true,
      message: "Missing or invalid fields",
      code: "VALIDATION_ERROR"
    });
  }
  
  let finalShipsInDays = ships_in_days;
  if (finalShipsInDays === undefined || finalShipsInDays === null) {
    finalShipsInDays = 3;
  } else if (!Number.isInteger(finalShipsInDays) || finalShipsInDays < 1) {
    return res.status(400).json({
      error: true,
      message: "ships_in_days must be an integer >= 1",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({
        error: true,
        message: "Email already registered",
        code: "EMAIL_EXISTS"
      });
    }
    
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    
    const registerTransaction = db.transaction(async () => {
      const info = await db.prepare(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)'
      ).run(email, passwordHash, full_name, 'seller');
      
      const userId = info.lastInsertRowid;
      
      await db.prepare(`
        INSERT INTO seller_profiles (user_id, shop_name, shop_bio, ships_in_days, instagram_handle, is_approved)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(
        userId,
        shop_name.trim(),
        shop_bio ? shop_bio.trim() : null,
        finalShipsInDays,
        instagram_handle ? instagram_handle.trim() : null
      );
      
      return userId;
    });
    
    const userId = await registerTransaction();
    const user = {
      id: userId,
      email,
      full_name,
      role: 'seller',
      avatar_url: null,
      shop_name: shop_name.trim()
    };
    
    const { accessToken, refreshToken } = await generateTokens(user);
    
    return res.status(201).json({
      success: true,
      data: {
        user,
        access_token: accessToken,
        refresh_token: refreshToken
      }
    });
  } catch (err) {
    return handleInternalError(res, 'seller registration', err);
  }
});

// POST /api/auth/login
router.post('/api/auth/login', rateLimit(10), async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({
      error: true,
      message: "Email and password required",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({
        error: true,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }
    
    if (user.is_banned === 1) {
      return res.status(403).json({
        error: true,
        message: "Your account has been suspended",
        code: "ACCOUNT_BANNED"
      });
    }
    
    if (user.is_active === 0) {
      return res.status(403).json({
        error: true,
        message: "Your account is inactive",
        code: "ACCOUNT_INACTIVE"
      });
    }
    
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        error: true,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }
    
    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url
    };
    
    if (user.role === 'seller') {
      const sellerProfile = await db.prepare('SELECT shop_name, is_approved FROM seller_profiles WHERE user_id = ?').get(user.id);
      if (sellerProfile) {
        userData.shop_name = sellerProfile.shop_name;
        userData.is_approved = sellerProfile.is_approved === 1;
      }
    }
    
    const { accessToken, refreshToken } = await generateTokens(user);
    
    return res.status(200).json({
      success: true,
      data: {
        user: userData,
        access_token: accessToken,
        refresh_token: refreshToken
      }
    });
  } catch (err) {
    return handleInternalError(res, 'login', err);
  }
});

// POST /api/auth/logout
router.post('/api/auth/logout', authenticateToken, async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token || typeof refresh_token !== 'string') {
    return res.status(400).json({
      error: true,
      message: "Missing refresh token",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const hashedRefreshToken = crypto.createHash('sha256').update(refresh_token).digest('hex');
    
    await db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ? AND user_id = ?')
      .run(hashedRefreshToken, req.user.user_id);
      
    return res.status(200).json({
      success: true,
      data: {
        message: "Logged out successfully"
      }
    });
  } catch (err) {
    return handleInternalError(res, 'logout', err);
  }
});

// POST /api/auth/refresh
router.post('/api/auth/refresh', rateLimit(30), async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token || typeof refresh_token !== 'string') {
    return res.status(400).json({
      error: true,
      message: "Missing refresh_token",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const hashedRefreshToken = crypto.createHash('sha256').update(refresh_token).digest('hex');
    
    const storedToken = await db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(hashedRefreshToken);
    if (!storedToken) {
      return res.status(401).json({
        error: true,
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN"
      });
    }
    
    const now = new Date();
    const expiresAt = new Date(storedToken.expires_at);
    if (now > expiresAt) {
      await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(storedToken.id);
      return res.status(401).json({
        error: true,
        message: "Refresh token expired",
        code: "REFRESH_TOKEN_EXPIRED"
      });
    }
    
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(storedToken.user_id);
    if (!user || user.is_active === 0 || user.is_banned === 1) {
      await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(storedToken.user_id);
      return res.status(401).json({
        error: true,
        message: "User account inactive or suspended",
        code: "UNAUTHORIZED"
      });
    }
    
    await db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(storedToken.id);
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);
    
    return res.status(200).json({
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: newRefreshToken
      }
    });
  } catch (err) {
    return handleInternalError(res, 'token refresh', err);
  }
});

// POST /api/auth/forgot-password
router.post('/api/auth/forgot-password', rateLimit(5), async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !validateEmail(email)) {
    return res.status(400).json({
      error: true,
      message: "Valid email is required",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (user) {
      const plainToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
      await db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.id);
      await db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, hashedToken, expiresAt);
      
      await emailService.sendPasswordResetEmail({ email, token: plainToken });
    }
    
    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, we have sent a password reset link."
    });
  } catch (err) {
    console.error('Error in forgot-password:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// POST /api/auth/reset-password
router.post('/api/auth/reset-password', rateLimit(10), async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || typeof token !== 'string' || !new_password || typeof new_password !== 'string' || new_password.length < 8) {
    return res.status(400).json({
      error: true,
      message: "Token and new_password (min 8 chars) are required",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecord = await db.prepare('SELECT * FROM password_resets WHERE token_hash = ?').get(hashedToken);
    
    if (!resetRecord) {
      return res.status(400).json({
        error: true,
        message: "Invalid or expired reset token",
        code: "INVALID_RESET_TOKEN"
      });
    }
    
    if (new Date() > new Date(resetRecord.expires_at)) {
      await db.prepare('DELETE FROM password_resets WHERE id = ?').run(resetRecord.id);
      return res.status(400).json({
        error: true,
        message: "Invalid or expired reset token",
        code: "INVALID_RESET_TOKEN"
      });
    }
    
    const passwordHash = await bcrypt.hash(new_password, BCRYPT_SALT_ROUNDS);
    
    await db.transaction(async () => {
      await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, resetRecord.user_id);
      await db.prepare('DELETE FROM password_resets WHERE id = ?').run(resetRecord.id);
      await db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(resetRecord.user_id);
    })();
    
    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in with your new password."
    });
  } catch (err) {
    console.error('Error in reset-password:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// POST /api/auth/seller/login
router.post('/api/auth/seller/login', rateLimit(10), async (req, res) => {
  const { email, password } = req.body;
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({
      error: true,
      message: "Email and password required",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email, 'seller');
    if (!user) {
      return res.status(401).json({
        error: true,
        message: "Invalid email or password for seller account",
        code: "INVALID_CREDENTIALS"
      });
    }
    
    if (user.is_banned === 1) {
      return res.status(403).json({
        error: true,
        message: "Your seller account has been suspended",
        code: "ACCOUNT_BANNED"
      });
    }
    
    if (user.is_active === 0) {
      return res.status(403).json({
        error: true,
        message: "Your account is inactive",
        code: "ACCOUNT_INACTIVE"
      });
    }
    
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        error: true,
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS"
      });
    }
    
    const sellerProfile = await db.prepare('SELECT shop_name, is_approved FROM seller_profiles WHERE user_id = ?').get(user.id);
    
    const userData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: 'seller',
      shop_name: sellerProfile ? sellerProfile.shop_name : null,
      is_approved: sellerProfile ? sellerProfile.is_approved === 1 : false
    };
    
    const { accessToken, refreshToken } = await generateTokens(user);
    
    return res.status(200).json({
      success: true,
      data: {
        user: userData,
        access_token: accessToken,
        refresh_token: refreshToken
      }
    });
  } catch (err) {
    return handleInternalError(res, 'seller login', err);
  }
});

// POST /api/admin/login
router.post('/api/admin/login', rateLimit(5), async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: true, message: 'Email and password required', code: 'VALIDATION_ERROR' });
  }

  try {
    const admin = await db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);
    if (!admin) {
      return res.status(401).json({ error: true, message: 'Invalid admin credentials', code: 'INVALID_CREDENTIALS' });
    }

    if (admin.is_active === 0) {
      return res.status(403).json({ error: true, message: 'Admin account is inactive', code: 'ACCOUNT_INACTIVE' });
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      return res.status(401).json({ error: true, message: 'Invalid admin credentials', code: 'INVALID_CREDENTIALS' });
    }

    await db.prepare("UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?").run(admin.id);

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role, type: 'admin_access' },
      getJwtSecret(),
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role
      }
    });
  } catch (err) {
    return handleInternalError(res, 'admin login', err);
  }
});

module.exports = router;
