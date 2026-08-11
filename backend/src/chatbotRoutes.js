const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('./db');
const chatbotService = require('./services/chatbotService');

const JWT_SECRET = process.env.JWT_SECRET;

// Optional Authentication Middleware
async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      req.user = null;
      return next();
    }
    
    try {
      const dbUser = await db.prepare('SELECT is_active, is_banned FROM users WHERE id = ?').get(user.user_id);
      if (dbUser && dbUser.is_banned === 0 && dbUser.is_active === 1) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (e) {
      req.user = null;
    }
    next();
  });
}

// POST /api/chatbot/message
router.post('/chatbot/message', optionalAuthenticateToken, async (req, res) => {
  try {
    const { message, session_id } = req.body;
    
    if (!message || !session_id) {
      return res.status(400).json({
        error: true,
        message: "Message and session_id are required",
        code: "VALIDATION_ERROR"
      });
    }

    const buyerId = req.user ? req.user.user_id : null;
    
    const reply = await chatbotService.processMessage(message, buyerId, session_id);
    
    return res.status(200).json({
      success: true,
      data: reply
    });
  } catch (err) {
    console.error("Chatbot route error:", err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// TEMPORARY DEBUG ENDPOINT - DO NOT LEAVE IN PRODUCTION LONG-TERM
router.get('/chatbot/debug-env', (req, res) => {
  const key = process.env.GEMINI_API_KEY || "";
  return res.status(200).json({
    hasKey: !!key,
    keyLength: key.length,
    prefix: key ? key.substring(0, 4) : "",
    suffix: key ? key.substring(key.length - 4) : ""
  });
});

module.exports = router;
