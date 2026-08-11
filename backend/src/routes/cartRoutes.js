const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimiter');

// GET /api/cart
router.get('/api/cart', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  
  try {
    const sql = `
      SELECT 
        ci.id, ci.product_id, ci.quantity,
        p.name, p.price_paise, p.stock_qty, p.ships_in_days, p.seller_id,
        p.status AS product_status,
        p.resume_estimate_date,
        COALESCE(
          (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1),
          (SELECT url FROM product_images WHERE product_id = p.id LIMIT 1)
        ) AS image_url,
        COALESCE(sp.shop_name, u.full_name) AS seller_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN users u ON p.seller_id = u.id
      LEFT JOIN seller_profiles sp ON u.id = sp.user_id
      WHERE ci.user_id = ? AND p.status != 'archived'
    `;
    
    const rawItems = await db.prepare(sql).all(userId);
    
    const items = rawItems.map(item => {
      let available = true;
      let unavailable_reason = null;

      if (item.product_status === 'paused') {
        available = false;
        unavailable_reason = 'paused';
      } else if (item.stock_qty < item.quantity) {
        available = false;
        unavailable_reason = 'out_of_stock';
      }

      return {
        ...item,
        available,
        unavailable_reason,
        quantity_warning: item.quantity > item.stock_qty
      };
    });

    const availableItems = items.filter(i => i.available);
    const subtotal_paise = availableItems.reduce((sum, item) => sum + item.price_paise * item.quantity, 0);
    const item_count = availableItems.reduce((sum, item) => sum + item.quantity, 0);
    const shipping_paise = (subtotal_paise === 0) ? 0 : (subtotal_paise < 50000 ? 12000 : 0);
    const total_paise = subtotal_paise + shipping_paise;
    
    return res.status(200).json({
      success: true,
      data: {
        items,
        item_count,
        subtotal_paise,
        shipping_paise,
        total_paise,
        has_unavailable: items.some(i => !i.available)
      }
    });
  } catch (err) {
    console.error('Error fetching cart:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// POST /api/cart/items
router.post('/api/cart/items', rateLimit(60), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { product_id, quantity } = req.body;
  
  if (product_id === undefined || product_id === null || !Number.isInteger(product_id)) {
    return res.status(400).json({
      error: true,
      message: "product_id must be an integer",
      code: "VALIDATION_ERROR"
    });
  }
  
  if (quantity === undefined || quantity === null || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      error: true,
      message: "quantity must be an integer >= 1",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const product = await db.prepare('SELECT status, stock_qty, seller_id FROM products WHERE id = ?').get(product_id);
    if (!product || product.status === 'archived' || product.status !== 'active') {
      return res.status(404).json({
        error: true,
        message: "Product not found or not active",
        code: "PRODUCT_NOT_FOUND"
      });
    }

    if (product.seller_id === userId) {
      return res.status(403).json({
        error: true,
        message: "Sellers cannot purchase their own products",
        code: "OWN_PRODUCT_FORBIDDEN"
      });
    }
    
    if (quantity > product.stock_qty) {
      return res.status(422).json({
        error: true,
        message: "Requested quantity exceeds stock",
        code: "INSUFFICIENT_STOCK"
      });
    }
    
    const existing = await db.prepare('SELECT id FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, product_id);
    if (existing) {
      return res.status(409).json({
        error: true,
        message: "Item already in cart — use PATCH to update quantity",
        code: "CART_ITEM_EXISTS"
      });
    }
    
    const info = await db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)')
      .run(userId, product_id, quantity);
      
    const cartItemId = info.lastInsertRowid;
    
    const itemCountRow = await db.prepare('SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?').get(userId);
    const itemCount = itemCountRow ? (itemCountRow.count || 0) : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        cart_item_id: cartItemId,
        item_count: itemCount
      }
    });
  } catch (err) {
    console.error('Error adding to cart:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// PATCH /api/cart/items/:id
router.patch('/api/cart/items/:id', rateLimit(120), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { quantity } = req.body;
  
  if (quantity === undefined || quantity === null || !Number.isInteger(quantity) || quantity < 1) {
    return res.status(400).json({
      error: true,
      message: "quantity must be an integer >= 1",
      code: "VALIDATION_ERROR"
    });
  }
  
  try {
    const cartItem = await db.prepare('SELECT * FROM cart_items WHERE id = ?').get(id);
    if (!cartItem) {
      return res.status(404).json({
        error: true,
        message: "Cart item not found",
        code: "CART_ITEM_NOT_FOUND"
      });
    }
    
    if (cartItem.user_id !== userId) {
      return res.status(403).json({
        error: true,
        message: "Not your cart item",
        code: "FORBIDDEN"
      });
    }
    
    const product = await db.prepare('SELECT stock_qty FROM products WHERE id = ?').get(cartItem.product_id);
    if (!product) {
      return res.status(404).json({
        error: true,
        message: "Product not found",
        code: "PRODUCT_NOT_FOUND"
      });
    }
    
    if (quantity > product.stock_qty) {
      return res.status(422).json({
        error: true,
        message: "Requested quantity exceeds stock",
        code: "INSUFFICIENT_STOCK"
      });
    }
    
    await db.prepare('UPDATE cart_items SET quantity = ?, added_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, id);
    
    return res.status(200).json({
      success: true,
      data: {
        id: parseInt(id),
        quantity
      }
    });
  } catch (err) {
    console.error('Error updating cart item:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

// DELETE /api/cart/items/:id
router.delete('/api/cart/items/:id', rateLimit(120), authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  
  try {
    const cartItem = await db.prepare('SELECT user_id FROM cart_items WHERE id = ?').get(id);
    if (!cartItem) {
      return res.status(404).json({
        error: true,
        message: "Cart item not found",
        code: "CART_ITEM_NOT_FOUND"
      });
    }
    
    if (cartItem.user_id !== userId) {
      return res.status(403).json({
        error: true,
        message: "Not your cart item",
        code: "FORBIDDEN"
      });
    }
    
    await db.prepare('DELETE FROM cart_items WHERE id = ?').run(id);
    
    const itemCountRow = await db.prepare('SELECT SUM(quantity) as count FROM cart_items WHERE user_id = ?').get(userId);
    const itemCount = itemCountRow ? (itemCountRow.count || 0) : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        item_count: itemCount
      }
    });
  } catch (err) {
    console.error('Error deleting cart item:', err);
    return res.status(500).json({
      error: true,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  }
});

module.exports = router;
