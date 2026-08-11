const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateThumbnail } = require('../utils/helpers');

// Ensure upload directories exist
const uploadDirs = ['avatars', 'products', 'banners', 'categories', 'ui', 'spotlight', 'intake', 'chat'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', '..', 'uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storageAvatar = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    const userId = req.user ? req.user.user_id : 'user';
    cb(null, `avatar_${userId}_${Date.now()}${safeExt}`);
  }
});

const storageListing = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'products')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    const sellerId = req.seller ? req.seller.user_id : 'seller';
    cb(null, `prod_${sellerId}_${Date.now()}_${Math.floor(Math.random()*1000)}${safeExt}`);
  }
});

const storageSellerPhoto = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'avatars')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    const sellerId = req.seller ? req.seller.user_id : 'seller';
    cb(null, `seller_avatar_${sellerId}_${Date.now()}${safeExt}`);
  }
});

const storageSellerBanner = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'banners')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    const sellerId = req.seller ? req.seller.user_id : 'seller';
    cb(null, `seller_banner_${sellerId}_${Date.now()}${safeExt}`);
  }
});

const storageSellerAbout = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'banners')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    const sellerId = req.seller ? req.seller.user_id : 'seller';
    cb(null, `seller_about_${sellerId}_${Date.now()}${safeExt}`);
  }
});

const storageCategory = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'categories')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.svg', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `category_${Date.now()}_${Math.floor(Math.random()*1000)}${safeExt}`);
  }
});

const storageUiSettings = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'ui')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.svg', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `hero_${Date.now()}${safeExt}`);
  }
});

const storageSpotlight = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'spotlight')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `story_${Date.now()}${safeExt}`);
  }
});

const storageIntake = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'intake')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.png';
    cb(null, `intake_${Date.now()}_${Math.floor(Math.random()*1000)}${safeExt}`);
  }
});

const storageChat = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads', 'chat')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext) ? ext : '.png';
    cb(null, `chat_${Date.now()}_${Math.floor(Math.random()*1000)}${safeExt}`);
  }
});

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

const uploadAvatar = multer({ storage: storageAvatar, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadListingPhoto = multer({ storage: storageListing, fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadSellerPhoto = multer({ storage: storageSellerPhoto, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadSellerBanner = multer({ storage: storageSellerBanner, fileFilter: imageFileFilter, limits: { fileSize: 8 * 1024 * 1024 } });
const uploadSellerAboutImage = multer({ storage: storageSellerAbout, fileFilter: imageFileFilter, limits: { fileSize: 8 * 1024 * 1024 } });
const uploadCategory = multer({ storage: storageCategory, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadUiSettings = multer({ storage: storageUiSettings, fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadSpotlight = multer({ storage: storageSpotlight, fileFilter: imageFileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadIntake = multer({ storage: storageIntake, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadChat = multer({ storage: storageChat, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = {
  uploadAvatar,
  uploadListingPhoto,
  uploadSellerPhoto,
  uploadSellerBanner,
  uploadSellerAboutImage,
  uploadCategory,
  uploadUiSettings,
  uploadSpotlight,
  uploadIntake,
  uploadChat
};
