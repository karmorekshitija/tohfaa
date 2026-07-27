const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const sharp = require('sharp');
const db = require('../db');

const DEFAULT_DEV_JWT_SECRET = 'tohfa_default_jwt_secret_dev_key_2026';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET;

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: JWT_SECRET environment variable is missing in production deployment!');
  } else {
    console.warn('⚠️ WARNING: JWT_SECRET is not defined in process.env. Using development fallback secret.');
  }
}

function getJwtSecret() {
  return process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET;
}

const BCRYPT_SALT_ROUNDS = 12;

function getApiBaseUrl(req) {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  return `${req.protocol}://${req.get('host')}`;
}

function formatImg(url, req) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/img/')) {
    return url;
  }
  const base = getApiBaseUrl(req);
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

function normalizeImageUrl(rawImg, req) {
  if (!rawImg) return null;
  if (rawImg.startsWith('/img/')) return rawImg;
  if (rawImg.startsWith('http://') || rawImg.startsWith('https://')) return rawImg;
  if (rawImg.startsWith('/uploads/')) return `${getApiBaseUrl(req)}${rawImg}`;
  return rawImg.startsWith('/') ? rawImg : `/${rawImg}`;
}

async function generateThumbnail(filePath) {
  if (!filePath) return null;
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return null;
  }
  const thumbPath = filePath.replace(/(\.\w+)$/, '_thumb$1');
  try {
    let pipeline = sharp(filePath)
      .resize(480, 480, { fit: 'inside', withoutEnlargement: true });
    
    if (ext === '.png') {
      pipeline = pipeline.png({ quality: 75 });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: 75 });
    } else {
      pipeline = pipeline.jpeg({ quality: 75 });
    }
    
    await pipeline.toFile(thumbPath);
    return thumbPath;
  } catch (err) {
    console.error(`Error generating thumbnail for ${filePath}:`, err);
    return null;
  }
}

function getThumbnailUrl(originalUrl) {
  if (!originalUrl) return originalUrl;
  let relativePath = originalUrl;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    try {
      const urlObj = new URL(relativePath);
      relativePath = urlObj.pathname;
    } catch (e) {
      return originalUrl;
    }
  }
  
  if (!relativePath.startsWith('/uploads')) {
    return originalUrl;
  }
  
  const ext = relativePath.substring(relativePath.lastIndexOf('.')).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return originalUrl;
  }
  
  const thumbPath = relativePath.replace(/(\.\w+)$/, '_thumb$1');
  const fullFsPath = path.join(__dirname, '..', '..', thumbPath);
  const fs = require('fs');
  if (fs.existsSync(fullFsPath)) {
    return thumbPath;
  }
  return originalUrl;
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function parseDbDate(dateInput) {
  if (!dateInput) return new Date(0);
  if (dateInput instanceof Date) return dateInput;
  let str = String(dateInput);
  if (str.indexOf(' ') > 0 && str.indexOf('T') === -1) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (str.indexOf('Z') === -1 && !str.includes('+')) {
    str = str + 'Z';
  }
  return new Date(str);
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  let cleanDateStr = dateStr;
  if (dateStr.indexOf(' ') > 0 && dateStr.indexOf('T') === -1) {
    cleanDateStr = dateStr.replace(' ', 'T') + 'Z';
  } else if (dateStr.indexOf('Z') === -1) {
    cleanDateStr = dateStr + 'Z';
  }
  const date = new Date(cleanDateStr);
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return 'Just now';
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatMoney(paise) {
  const rupees = paise / 100;
  return '₹' + new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(rupees);
}

function safeToISOString(dateStr) {
  if (!dateStr) return new Date().toISOString();
  let clean = String(dateStr).trim();
  if (clean.endsWith('Z')) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (clean.indexOf(' ') > 0 && clean.indexOf('T') === -1) {
    clean = clean.replace(' ', 'T');
  }
  if (!clean.endsWith('Z') && !clean.includes('+') && !clean.match(/-\d{2}:\d{2}$/)) {
    clean = clean + 'Z';
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function generateTokens(user) {
  const secret = getJwtSecret();
  const accessToken = jwt.sign(
    { user_id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '15m' }
  );
  
  const plainRefreshToken = crypto.randomBytes(64).toString('hex');
  const hashedRefreshToken = crypto.createHash('sha256').update(plainRefreshToken).digest('hex');
  
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  await db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(user.id, hashedRefreshToken, expiresAt);
    
  return {
    accessToken,
    refreshToken: plainRefreshToken
  };
}

module.exports = {
  JWT_SECRET,
  getJwtSecret,
  BCRYPT_SALT_ROUNDS,
  getApiBaseUrl,
  formatImg,
  normalizeImageUrl,
  generateThumbnail,
  getThumbnailUrl,
  validateEmail,
  parseDbDate,
  formatTimeAgo,
  formatMoney,
  safeToISOString,
  generateTokens
};
