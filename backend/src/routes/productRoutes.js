const express = require('express');
const router = express.Router();
const db = require('../db');
const { optionalAuthenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');
const { normalizeImageUrl, getThumbnailUrl, formatImg } = require('../utils/helpers');

// GET /api/hero-slides
router.get('/api/hero-slides', rateLimit(120), async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, p.name AS alt_text,
        COALESCE(
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
          (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1)
        ) AS image_url
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'active' AND u.is_banned = 0 AND u.is_active = 1
      ORDER BY RANDOM() LIMIT 6
    `;
    const rows = await db.prepare(query).all();
    
    let slides = [];
    if (rows && rows.length > 0) {
      slides = rows.map(r => ({
        id: r.id,
        product_id: r.id,
        image_url: r.image_url ? normalizeImageUrl(r.image_url, req) : null,
        alt_text: r.alt_text || 'Artisan Craft'
      })).filter(s => s.image_url !== null);
    }

    if (slides.length === 0) {
      slides = [
        { id: 1, product_id: 1, image_url: '/img/ceramic_bowls.jpg', alt_text: 'Handcrafted Ceramic Bowls' },
        { id: 2, product_id: 2, image_url: '/img/stoneware_vase.jpg', alt_text: 'Artisan Stoneware Vase' },
        { id: 3, product_id: 3, image_url: '/img/linen_journal.jpg', alt_text: 'Handmade Linen Journal' },
        { id: 4, product_id: 4, image_url: '/img/incense_holder.jpg', alt_text: 'Terracotta Incense Holder' }
      ];
    }

    return res.status(200).json({
      success: true,
      data: { slides }
    });
  } catch (err) {
    console.error('Error in hero slides:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error"
    });
  }
});

// GET /api/ui-settings/public
router.get('/api/ui-settings/public', rateLimit(120), async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT slot_name, slot_type, content_url, content_ref_id, label
      FROM ui_settings
      ORDER BY id ASC
    `).all();

    const data = {};

    for (const row of rows) {
      const normalizedUrl = normalizeImageUrl(row.content_url, req);
      let resolved_content = null;

      if (row.slot_type === 'featured_product_id' && row.content_ref_id) {
        try {
          const prod = await db.prepare(`
            SELECT 
              p.id, p.name, p.price_paise, p.seller_id, p.listing_type, p.type,
              s.shop_name AS seller_name,
              u.username AS seller_username,
              COALESCE(
                (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1),
                (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1)
              ) AS image_url,
              COALESCE((SELECT COUNT(*) FROM reviews WHERE listing_id = p.id), 0) AS review_count,
              COALESCE((SELECT AVG(rating) FROM reviews WHERE listing_id = p.id), 4.5) AS avg_rating
            FROM products p
            JOIN users u ON p.seller_id = u.id
            LEFT JOIN seller_profiles s ON s.user_id = u.id
            WHERE p.id = ? AND p.status = 'active' AND u.is_banned = 0 AND u.is_active = 1
          `).get(row.content_ref_id);

          if (prod) {
            resolved_content = {
              id: prod.id,
              name: prod.name,
              price_paise: prod.price_paise,
              image_url: normalizeImageUrl(prod.image_url, req),
              seller_id: prod.seller_id,
              seller_name: prod.seller_name || prod.seller_username || 'Artisan',
              review_count: Number(prod.review_count || 0),
              avg_rating: Number(prod.avg_rating || 4.5),
              listing_type: prod.listing_type || 'physical',
              type: prod.type || 'standard'
            };
          }
        } catch (e) {
          console.error(`Error resolving featured product for slot ${row.slot_name}:`, e);
        }
      } else if (row.slot_type === 'category_override' && row.content_ref_id) {
        try {
          const cat = await db.prepare(`
            SELECT c.id, c.display_name, c.slug, c.image_url,
              (
                COALESCE((SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active'), 0)
                +
                COALESCE((SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id AND l.status = 'active'), 0)
              ) AS product_count
            FROM categories c
            WHERE c.id = ? AND c.is_active = 1
          `).get(row.content_ref_id);

          if (cat) {
            resolved_content = {
              id: cat.id,
              display_name: cat.display_name,
              slug: cat.slug,
              image_url: normalizeImageUrl(cat.image_url, req),
              product_count: Number(cat.product_count || 0)
            };
          }
        } catch (e) {
          console.error(`Error resolving category override for slot ${row.slot_name}:`, e);
        }
      }

      data[row.slot_name] = {
        slot_name: row.slot_name,
        slot_type: row.slot_type,
        content_url: normalizedUrl,
        content_ref_id: row.content_ref_id,
        label: row.label,
        resolved_content
      };
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error('Error in public ui-settings:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error"
    });
  }
});

// GET /api/categories
router.get('/api/categories', rateLimit(120), async (req, res) => {
  try {
    const categories = await db.prepare(`
      SELECT 
        c.id, c.name, c.display_name, c.slug, c.description, c.image_url, c.banner_image_url, c.icon_emoji, c.emoji_icon, c.is_active, c.created_at,
        (
          COALESCE((SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active'), 0)
          +
          COALESCE((SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id AND l.status = 'active'), 0)
        ) AS product_count
      FROM categories c
      WHERE c.is_active = 1
      ORDER BY c.name ASC
    `).all();

    const formattedCategories = categories.map(cat => ({
      ...cat,
      image_url: normalizeImageUrl(cat.image_url, req),
      banner_image_url: normalizeImageUrl(cat.banner_image_url, req),
      emoji_icon: cat.emoji_icon || cat.icon_emoji || '🏷️'
    }));

    return res.status(200).json({
      success: true,
      data: {
        categories: formattedCategories
      }
    });
  } catch (err) {
    console.error('Error in categories API:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error"
    });
  }
});

// GET /api/products/search-suggestions
router.get('/api/products/search-suggestions', rateLimit(120), async (req, res) => {
  const q = req.query.q;
  if (!q || typeof q !== 'string' || q.trim() === '') {
    return res.status(200).json({
      success: true,
      data: {
        suggestions: [],
        sellers: [],
        categories: []
      }
    });
  }
  
  try {
    const suggestions = (await db.prepare(`
      SELECT DISTINCT p.name FROM products p
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE p.status = 'active' AND COALESCE(sp.is_approved, 0) = 1 AND u.is_banned = 0 AND u.is_active = 1 AND (p.name LIKE ? OR p.description LIKE ?)
      LIMIT 7
    `).all(`%${q}%`, `%${q}%`)).map(row => row.name);
    
    const sellers = await db.prepare(`
      SELECT u.id, COALESCE(sp.shop_name, u.full_name) AS shop_name, u.avatar_url,
        ROUND((SELECT AVG(p.avg_rating) FROM products p WHERE p.seller_id = u.id AND p.status = 'active' AND p.avg_rating > 0), 1) AS rating,
        (SELECT COUNT(*) FROM products p WHERE p.seller_id = u.id AND p.status = 'active' AND p.review_count > 0) AS reviewed_products
      FROM users u
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE u.role = 'seller' AND u.is_active = 1 AND u.is_banned = 0 AND COALESCE(sp.is_approved, 0) = 1
        AND (u.full_name LIKE ? OR sp.shop_name LIKE ?)
      LIMIT 5
    `).all(`%${q}%`, `%${q}%`);
    
    const categories = await db.prepare(`
      SELECT id, name, COALESCE(display_name, name) AS display_name, slug, COALESCE(emoji_icon, icon_emoji, '🏷️') AS emoji
      FROM categories
      WHERE (name LIKE ? OR COALESCE(display_name, name) LIKE ? OR slug LIKE ?)
      LIMIT 5
    `).all(`%${q}%`, `%${q}%`, `%${q}%`);
    
    return res.status(200).json({
      success: true,
      data: {
        suggestions,
        sellers,
        categories
      }
    });
  } catch (err) {
    console.error('Error in search suggestions:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// GET /api/products/trending-searches
router.get('/api/products/trending-searches', rateLimit(120), async (req, res) => {
  try {
    const trending = await db.prepare(`
      SELECT query FROM trending_searches 
      ORDER BY search_count DESC, updated_at DESC 
      LIMIT 24
    `).all();

    const dbTags = trending.map(t => t.query);
    const fallbacks = [
      'resin art', 'organic soap', 'pottery', 'knitted wear', 'handwoven bags',
      'terracotta', 'clay earrings', 'pressed flowers', 'wall art', 'personalized cups',
      'crochet toys', 'scented wax', 'handmade cards', 'leather wallet', 'wooden spoons',
      'handmade candles', 'ceramics', 'wildflower jewelry', 'leather journal', 'woodworking',
      'custom portrait'
    ];

    const combined = Array.from(new Set([...dbTags, ...fallbacks]));

    return res.status(200).json({
      success: true,
      data: combined
    });
  } catch (err) {
    console.error('Error fetching trending searches:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error"
    });
  }
});

module.exports = router;
