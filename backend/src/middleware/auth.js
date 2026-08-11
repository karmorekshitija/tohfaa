const jwt = require('jsonwebtoken');
const db = require('../db');

const { getJwtSecret } = require('../utils/helpers');

function resolveJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return process.env.JWT_SECRET;
}

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
  
  jwt.verify(token, resolveJwtSecret(), async (err, user) => {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid or expired authorization token",
        code: "UNAUTHORIZED"
      });
    }
    
    // Check if user is active/banned
    const dbUser = await db.prepare('SELECT is_active, is_banned FROM users WHERE id = ?').get(user.user_id);
    if (!dbUser) {
      return res.status(401).json({
        error: true,
        message: "User not found",
        code: "UNAUTHORIZED"
      });
    }
    
    if (dbUser.is_banned === 1) {
      return res.status(403).json({
        error: true,
        message: "Account banned",
        code: "ACCOUNT_BANNED"
      });
    }
    
    if (dbUser.is_active === 0) {
      return res.status(403).json({
        error: true,
        message: "Account inactive",
        code: "ACCOUNT_INACTIVE"
      });
    }
    
    req.user = user;
    next();
  });
}

async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, resolveJwtSecret(), async (err, user) => {
    if (err) {
      req.user = null;
      return next();
    }
    
    const dbUser = await db.prepare('SELECT is_active, is_banned FROM users WHERE id = ?').get(user.user_id);
    if (dbUser && dbUser.is_banned === 0 && dbUser.is_active === 1) {
      req.user = user;
    } else {
      req.user = null;
    }
    next();
  });
}

async function requireSeller(req, res, next) {
  await authenticateToken(req, res, async () => {
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

function authorizeAdminRoute(req, res, next) {
  const path = req.path;
  const role = req.admin.role;

  if (role === 'super_admin') {
    return next();
  }

  const rolePermissions = {
    ops_lead: ['/api/admin/seller-applications', '/api/admin/sellers', '/api/admin/products', '/api/admin/orders', '/api/admin/categories', '/api/admin/subcategories'],
    support_rep: ['/api/admin/orders', '/api/admin/sellers'],
    finance_manager: ['/api/admin/reports', '/api/admin/payments/ledger/all', '/api/admin/payment-health', '/api/admin/orders'],
    category_manager: ['/api/admin/categories', '/api/admin/subcategories', '/api/admin/products', '/api/admin/our-story', '/api/admin/ui-settings']
  };

  const allowedRoutes = rolePermissions[role] || [];
  const isAllowed = allowedRoutes.some(route => path.startsWith(route));

  if (!isAllowed) {
    return res.status(403).json({
      error: true,
      message: "Insufficient permissions for this admin route",
      code: "FORBIDDEN"
    });
  }

  next();
}

async function authenticateAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      error: true,
      message: "Authorization token required",
      code: "UNAUTHORIZED"
    });
  }
  
  jwt.verify(token, resolveJwtSecret(), async (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: true,
        message: "Invalid or expired authorization token",
        code: "UNAUTHORIZED"
      });
    }
    
    if (decoded.type !== 'admin_access') {
      return res.status(403).json({
        error: true,
        message: "Forbidden",
        code: "FORBIDDEN"
      });
    }

    if (decoded.role !== 'admin' && decoded.role !== 'super_admin' && decoded.role !== 'ops_lead' && decoded.role !== 'support_rep' && decoded.role !== 'finance_manager' && decoded.role !== 'category_manager') {
      return res.status(403).json({
        error: true,
        message: "Forbidden",
        code: "FORBIDDEN"
      });
    }
    
    const adminUser = await db.prepare('SELECT * FROM admin_users WHERE id = ?').get(decoded.sub);
    if (!adminUser) {
      return res.status(401).json({
        error: true,
        message: "Admin not found",
        code: "UNAUTHORIZED"
      });
    }
    
    if (adminUser.is_active === 0) {
      return res.status(403).json({
        error: true,
        message: "Account inactive",
        code: "ACCOUNT_INACTIVE"
      });
    }
    
    req.admin = adminUser;
    authorizeAdminRoute(req, res, next);
  });
}

module.exports = {
  authenticateToken,
  optionalAuthenticateToken,
  requireSeller,
  authenticateAdminToken
};
