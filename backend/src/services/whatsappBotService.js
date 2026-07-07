const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');
const db = require('../db');
const geminiClient = require('./geminiClient');
const whatsappService = require('./whatsappService');
const { syncListingToProduct } = require('./listingSync');

const SYSTEM_INSTRUCTION = `
You are the Tohfa Seller Assistant AI. Analyze the user's message and categorize it into one of the following actions:
1. add_product: If the user wants to add, create, or list a new product. Extract parameters: name (string), price (number in rupees, e.g. 500), stock (number, default 10).
2. toggle_product: If the user wants to pause, resume, activate, deactivate, hide, or unhide an existing product. Extract parameters: product_name (string), status (string, either 'active' or 'paused').
3. order_status: If the user asks about orders, order status, list of orders, or today's sales. Extract parameters: query_type ('today', 'all').
4. pickup_schedule: If the user asks about shipping, pickup schedules, cutoff times, tomorrow's pickups. Extract parameters: query_type ('pickup', 'cutoff').
5. analytics: If the user asks for monthly summaries, reports, analytics, or PDF.
6. unclear: If the message does not match any of these actions, is ambiguous, or needs clarification. Provide a helpful clarifying_question.

Return ONLY a JSON object. Do not include markdown code blocks.
JSON Schema:
{
  "action": "add_product" | "toggle_product" | "order_status" | "pickup_schedule" | "analytics" | "unclear",
  "params": {
    "name": "string",
    "price": number,
    "stock": number,
    "product_name": "string",
    "status": "active" | "paused",
    "query_type": "today" | "all" | "pickup" | "cutoff"
  },
  "clarifying_question": "string"
}
`;

/**
 * Main parser entry point called on incoming WhatsApp message
 */
async function processMessage(messageText, sellerId, fromNumber) {
  const cleanMsg = messageText.trim().toLowerCase();

  // 1. Check if there is a pending action in progress
  const sellerProfile = await db.prepare('SELECT whatsapp_pending_action FROM seller_profiles WHERE user_id = ?').get(sellerId);
  
  if (sellerProfile && sellerProfile.whatsapp_pending_action) {
    let pending;
    try {
      pending = JSON.parse(sellerProfile.whatsapp_pending_action);
    } catch (e) {
      // Clear malformed state
      await clearPendingAction(sellerId);
    }

    if (pending) {
      return await handlePendingAction(cleanMsg, pending, sellerId, fromNumber);
    }
  }

  // 2. Classify intent via Gemini
  let result;
  try {
    result = await geminiClient.generateJson(
      `Message: "${messageText}"`,
      SYSTEM_INSTRUCTION
    );
  } catch (err) {
    console.error('Gemini intent classification failed:', err);
    return "I'm sorry, I had trouble understanding that. Could you please try again?";
  }

  // 3. Validate and Route
  if (!result || !result.action) {
    return "I didn't quite catch that. Could you please rephrase?";
  }

  switch (result.action) {
    case 'add_product':
      return await handleAddProductIntent(result.params, sellerId);
    case 'toggle_product':
      return await handleToggleProductIntent(result.params, sellerId);
    case 'order_status':
      return await handleOrderStatusIntent(result.params, sellerId);
    case 'pickup_schedule':
      return await handlePickupScheduleIntent(result.params, sellerId);
    case 'analytics':
      return await handleAnalyticsIntent(sellerId, fromNumber);
    case 'unclear':
    default:
      return result.clarifying_question || "I'm not sure how to help with that. You can ask me to list orders, pause products, or generate reports.";
  }
}

/**
 * Handle confirmation of a pending action
 */
async function handlePendingAction(cleanMsg, pending, sellerId, fromNumber) {
  if (pending.action === 'add_product') {
    if (cleanMsg === 'yes' || cleanMsg === 'confirm') {
      const data = pending.data;
      const pricePaise = Math.round(data.price * 100);
      let listingId = null;
      try {
        // Insert new listing directly in active state
        const listingResult = await db.prepare(`
          INSERT INTO listings (
            seller_id, title, description, base_price, price_paise, listing_type,
            status, stock_count, ships_in_days, dispatch_sla_days
          ) VALUES (?, ?, ?, ?, ?, 'pre-made', 'active', ?, 7, 3)
        `).run(sellerId, data.name, 'Added via WhatsApp Assistant', pricePaise, pricePaise, data.stock || 10);
        listingId = Number(listingResult.lastInsertRowid);
      } catch (err) {
        console.error('[WhatsApp add_product] Error inserting listing:', err);
        await clearPendingAction(sellerId);
        return 'I was unable to save the product due to a database error. Please try again.';
      }

      // Sync the new listing into the buyer-visible products catalog
      let syncResult;
      try {
        syncResult = await syncListingToProduct(listingId);
      } catch (err) {
        // syncListingToProduct itself catches internally and returns a warning,
        // but guard here in case of an unexpected throw
        console.error('[WhatsApp add_product] Unexpected error in syncListingToProduct:', err);
        syncResult = { synced: false, productId: null, warning: err.message };
      }

      await clearPendingAction(sellerId);

      if (syncResult.synced) {
        return `Success! Product "${data.name}" has been added and published in your catalog with price ₹${data.price} and stock ${data.stock || 10}.`;
      } else {
        // Listing was saved but catalog publish failed — tell the seller honestly
        console.error(`[WhatsApp add_product] Sync failed for listing ${listingId}:`, syncResult.warning);
        return `Your product "${data.name}" was saved as a listing (id: ${listingId}), but couldn't be published to your buyer catalog yet. Please check your Seller Dashboard to complete the setup. Error: ${syncResult.warning || 'unknown error'}`;
      }
    } else if (cleanMsg === 'no' || cleanMsg === 'cancel') {
      await clearPendingAction(sellerId);
      return "Cancelled. The product was not added.";
    } else {
      return `I'm waiting for your confirmation to add the product "${pending.data.name}" (Price: ₹${pending.data.price}, Stock: ${pending.data.stock}). Please reply 'yes' or 'confirm' to proceed, or 'no' to cancel.`;
    }
  }

  if (pending.action === 'resolve_toggle') {
    const { matches, targetStatus } = pending.data;
    const choice = parseInt(cleanMsg, 10);
    
    if (cleanMsg === 'cancel') {
      await clearPendingAction(sellerId);
      return "Action cancelled.";
    }

    if (!isNaN(choice) && choice >= 1 && choice <= matches.length) {
      const product = matches[choice - 1];
      const newStatus = targetStatus === 'paused' ? 'paused' : 'active';
      try {
        await db.prepare('UPDATE listings SET status = ? WHERE id = ? AND seller_id = ?').run(newStatus, product.id, sellerId);
        await clearPendingAction(sellerId);
        return `Product "${product.title}" has been successfully ${newStatus === 'paused' ? 'paused and hidden from buyers' : 'resumed and is now active'}.`;
      } catch (err) {
        console.error('Error toggling product status:', err);
        await clearPendingAction(sellerId);
        return "Failed to update product status. Please try again.";
      }
    } else {
      return `Please reply with the number of the product you meant (1 to ${matches.length}), or reply 'cancel'.`;
    }
  }

  // Fallback
  await clearPendingAction(sellerId);
  return "I cleared your pending actions. How can I help you today?";
}

/**
 * Handle Add Product intent
 */
async function handleAddProductIntent(params, sellerId) {
  const { name, price, stock = 10 } = params || {};
  if (!name || isNaN(price) || price <= 0) {
    return "I understood you want to add a product, but could you please specify both a name and a positive price? For example: 'Add product: Wooden Mug, price: 650, stock: 12'.";
  }

  // Set pending action
  const pendingAction = {
    action: 'add_product',
    data: { name, price, stock }
  };

  await savePendingAction(sellerId, pendingAction);

  return `Would you like to add the product "${name}" with price ₹${price} and stock ${stock}? Reply "yes" or "confirm" to proceed, or "no" to cancel.`;
}

/**
 * Handle Pause/Resume product intent
 */
async function handleToggleProductIntent(params, sellerId) {
  const { product_name, status } = params || {};
  if (!product_name) {
    return "Could you please specify which product you would like to pause or resume? For example: 'pause Ceramic Bowl'.";
  }

  const cleanStatus = status === 'active' ? 'active' : 'paused';

  // Find matches (only within seller's own catalog)
  const matches = await db.prepare(
    "SELECT id, title, status FROM listings WHERE seller_id = ? AND title ILIKE ? AND status != 'deleted'"
  ).all(sellerId, `%${product_name}%`);

  if (matches.length === 0) {
    return `I couldn't find any product matching "${product_name}" in your catalog.`;
  }

  if (matches.length === 1) {
    const product = matches[0];
    const newStatus = cleanStatus === 'paused' ? 'paused' : 'active';
    await db.prepare('UPDATE listings SET status = ? WHERE id = ? AND seller_id = ?').run(newStatus, product.id, sellerId);
    return `Product "${product.title}" has been successfully ${newStatus === 'paused' ? 'paused and hidden from buyers' : 'resumed and is now active'}.`;
  }

  // Ambiguous, resolve first
  const pendingAction = {
    action: 'resolve_toggle',
    data: { matches, targetStatus: cleanStatus }
  };

  await savePendingAction(sellerId, pendingAction);

  let msg = `I found multiple products matching "${product_name}":\n`;
  matches.forEach((m, i) => {
    msg += `${i + 1}. ${m.title} (Currently: ${m.status})\n`;
  });
  msg += `\nWhich one did you mean? Please reply with the option number (1 to ${matches.length}) or reply 'cancel'.`;
  return msg;
}

/**
 * Handle Order Status queries
 */
async function handleOrderStatusIntent(params, sellerId) {
  const { query_type = 'today' } = params || {};

  if (query_type === 'today') {
    // Orders received in the last 24 hours
    const orders = await db.prepare(`
      SELECT order_ref, total_amount, status, created_at 
      FROM orders 
      WHERE seller_id = ? AND created_at >= CURRENT_DATE
      ORDER BY created_at DESC
    `).all(sellerId);

    if (orders.length === 0) {
      return "You haven't received any orders yet today. Keep up the great work!";
    }

    let summary = `*Today's Orders Summary* (${orders.length} orders):\n\n`;
    orders.forEach(o => {
      summary += `- *${o.order_ref}*: ₹${(o.total_amount / 100).toFixed(2)} (${o.status})\n`;
    });
    return summary;
  } else {
    // Active processing/packed orders
    const orders = await db.prepare(`
      SELECT order_ref, total_amount, status, created_at 
      FROM orders 
      WHERE seller_id = ? AND status IN ('processing', 'in_production', 'packed')
      ORDER BY created_at ASC
    `).all(sellerId);

    if (orders.length === 0) {
      return "You have no active pending orders.";
    }

    let summary = `*Pending Orders Summary* (${orders.length} orders):\n\n`;
    orders.forEach(o => {
      const date = o.created_at ? o.created_at.substring(0, 10) : '';
      summary += `- *${o.order_ref}* (Recv: ${date}): ₹${(o.total_amount / 100).toFixed(2)} [${o.status}]\n`;
    });
    return summary;
  }
}

/**
 * Handle Pickup Schedule and Cutoff queries
 */
async function handlePickupScheduleIntent(params, sellerId) {
  const { query_type = 'pickup' } = params || {};

  if (query_type === 'cutoff') {
    const config = await db.prepare('SELECT festive_cutoff FROM store_config WHERE seller_id = ?').get(sellerId);
    
    // STRICT RULE: If no daily cutoff exists in schema, flag back to user
    return `Daily courier pickup cutoff times are not configured in the database. Only seasonal/festive cutoffs are currently supported (Festive Cutoff: ${config?.festive_cutoff || 'Not set'}). Defaulting to standard 6:00 PM cutoff window.`;
  }

  // Get orders ready for pickup (packed or processing)
  const orders = await db.prepare(`
    SELECT order_ref, status, total_amount 
    FROM orders 
    WHERE seller_id = ? AND status IN ('processing', 'packed')
  `).all(sellerId);

  if (orders.length === 0) {
    return "You have no orders currently scheduled or ready for tomorrow's courier pickup.";
  }

  let summary = `*Tomorrow's Scheduled Pickups* (${orders.length} orders):\n\n`;
  orders.forEach(o => {
    summary += `- *${o.order_ref}* (${o.status === 'packed' ? 'Ready' : 'Pending Pack'})\n`;
  });
  summary += `\n*Note:* Actual Delhivery/Shiprocket courier pickup windows and cutoff guidelines are determined by individual dispatch SLA configurations. Please package all orders before the standard daily cutoff.`;
  return summary;
}

/**
 * Compile monthly analytics PDF and send it via WhatsApp media message
 */
async function handleAnalyticsIntent(sellerId, fromNumber) {
  // Let seller know we are preparing the report
  await whatsappService.sendWhatsAppTextMessage(fromNumber, "Compiling your monthly analytics and generating the PDF report. Please wait a moment...");

  const tempPath = path.join(os.tmpdir(), `analytics_${sellerId}_${Date.now()}.pdf`);

  try {
    // 1. Gather analytics data (last 30 days)
    const statsRow = await db.prepare(`
      SELECT 
        COALESCE(SUM(total_paise), 0) as total_revenue,
        COUNT(*) as total_orders
      FROM orders
      WHERE seller_id = ? AND LOWER(status) != 'cancelled' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    `).get(sellerId);

    const statusGroup = await db.prepare(`
      SELECT status, COUNT(*) as c
      FROM orders
      WHERE seller_id = ? AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY status
    `).all(sellerId);

    const topProducts = await db.prepare(`
      SELECT l.title as name, SUM(o.quantity) as units_sold, SUM(o.total_amount) as revenue
      FROM orders o
      JOIN listings l ON o.listing_id = l.id
      WHERE o.seller_id = ? AND LOWER(o.status) != 'cancelled' AND o.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY l.title
      ORDER BY units_sold DESC
      LIMIT 5
    `).all(sellerId);

    // 2. Generate PDF
    await generateAnalyticsPDF(tempPath, statsRow, statusGroup, topProducts);

    // 3. Upload & Send PDF
    const filename = `Tohfa_Monthly_Report_${new Date().toISOString().substring(0, 7)}.pdf`;
    await whatsappService.sendWhatsAppDocument(fromNumber, tempPath, filename, "Here is your Monthly Analytics PDF report.");

  } catch (err) {
    console.error('Error generating or sending monthly PDF report:', err);
    await whatsappService.sendWhatsAppTextMessage(fromNumber, "I encountered an error while generating your analytics PDF report. Please try again later.");
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }
  }

  return null; // Response already handled asynchronously
}

/**
 * Generate PDF Report using pdfkit
 */
function generateAnalyticsPDF(filePath, stats, statusBreakdown, topProducts) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Header styling - Forest Green (#3D6B4F)
    doc.rect(0, 0, 612, 100).fill('#3D6B4F');
    doc.fillColor('#FFFFFF')
       .font('Times-Roman')
       .fontSize(24)
       .text('Tohfa Artisan Studio', 50, 30);
    
    // Subtitle - Gold (#C8973A)
    doc.fillColor('#C8973A')
       .font('Helvetica-Bold')
       .fontSize(12)
       .text('MONTHLY SELLER PERFORMANCE REPORT', 50, 60);

    // Body styling
    doc.fillColor('#211B11').font('Helvetica');
    
    // Report Period
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    doc.fontSize(10)
       .fillColor('#414942')
       .text(`Report Generated On: ${new Date().toLocaleDateString()}`, 400, 120, { align: 'right' })
       .text(`Reporting Period: Trailing 30 Days (${dateStr})`, 400, 135, { align: 'right' });

    // Section 1: Overview Cards
    doc.moveDown(2);
    doc.fillColor('#3D6B4F').font('Times-Roman').fontSize(16).text('Performance Summary', 50, 170);
    doc.strokeColor('#8FAF82').lineWidth(1).moveTo(50, 190).lineTo(562, 190).stroke();

    // Stats Grid
    const revenueVal = (stats.total_revenue / 100).toFixed(2);
    const avgOrderVal = stats.total_orders > 0 ? (stats.total_revenue / stats.total_orders / 100).toFixed(2) : '0.00';

    doc.fillColor('#211B11').font('Helvetica-Bold').fontSize(12).text('Total Revenue', 60, 210);
    doc.font('Helvetica').fontSize(16).fillColor('#3D6B4F').text(`INR ${revenueVal}`, 60, 225);

    doc.fillColor('#211B11').font('Helvetica-Bold').fontSize(12).text('Total Orders', 220, 210);
    doc.font('Helvetica').fontSize(16).fillColor('#3D6B4F').text(`${stats.total_orders}`, 220, 225);

    doc.fillColor('#211B11').font('Helvetica-Bold').fontSize(12).text('Avg Order Value', 380, 210);
    doc.font('Helvetica').fontSize(16).fillColor('#3D6B4F').text(`INR ${avgOrderVal}`, 380, 225);

    // Section 2: Product Performance
    doc.moveDown(4);
    doc.fillColor('#3D6B4F').font('Times-Roman').fontSize(16).text('Top Selling Products', 50, 280);
    doc.strokeColor('#8FAF82').lineWidth(1).moveTo(50, 300).lineTo(562, 300).stroke();

    let y = 320;
    doc.fillColor('#211B11').font('Helvetica-Bold').fontSize(10);
    doc.text('Product Name', 60, y);
    doc.text('Units Sold', 300, y);
    doc.text('Revenue (INR)', 450, y);

    doc.strokeColor('#F7F3EC').lineWidth(1).moveTo(50, y + 15).lineTo(562, y + 15).stroke();
    y += 25;

    doc.font('Helvetica').fontSize(10);
    if (topProducts.length === 0) {
      doc.text('No sales recorded during this period.', 60, y);
      y += 20;
    } else {
      topProducts.forEach(p => {
        doc.text(p.name, 60, y, { width: 220, height: 15, lineBreak: false });
        doc.text(p.units_sold.toString(), 300, y);
        doc.text(`INR ${(p.revenue / 100).toFixed(2)}`, 450, y);
        y += 20;
      });
    }

    // Section 3: Orders Status Breakdown
    y += 15;
    doc.fillColor('#3D6B4F').font('Times-Roman').fontSize(16).text('Orders Status Breakdown', 50, y);
    doc.strokeColor('#8FAF82').lineWidth(1).moveTo(50, y + 20).lineTo(562, y + 20).stroke();
    y += 35;

    doc.fillColor('#211B11').font('Helvetica-Bold').fontSize(10);
    doc.text('Order Status', 60, y);
    doc.text('Count', 300, y);
    doc.strokeColor('#F7F3EC').lineWidth(1).moveTo(50, y + 15).lineTo(562, y + 15).stroke();
    y += 25;

    doc.font('Helvetica').fontSize(10);
    if (statusBreakdown.length === 0) {
      doc.text('No active orders found.', 60, y);
    } else {
      statusBreakdown.forEach(s => {
        doc.text(s.status.toUpperCase(), 60, y);
        doc.text(s.c.toString(), 300, y);
        y += 20;
      });
    }

    // Footer
    doc.strokeColor('#8FAF82').lineWidth(1).moveTo(50, 700).lineTo(562, 700).stroke();
    doc.fillColor('#414942')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('© 2026 Tohfa Artisan Studio. Proudly supporting local handmade craft.', 50, 715, { align: 'center' });

    doc.end();

    writeStream.on('finish', () => resolve(true));
    writeStream.on('error', (err) => reject(err));
  });
}

/**
 * State Management Helpers
 */
async function savePendingAction(sellerId, pendingAction) {
  const pendingStr = JSON.stringify(pendingAction);
  await db.prepare('UPDATE seller_profiles SET whatsapp_pending_action = ? WHERE user_id = ?').run(pendingStr, sellerId);
  await db.prepare('UPDATE sellers SET whatsapp_pending_action = ? WHERE user_id = ?').run(pendingStr, sellerId);
}

async function clearPendingAction(sellerId) {
  await db.prepare('UPDATE seller_profiles SET whatsapp_pending_action = NULL WHERE user_id = ?').run(sellerId);
  await db.prepare('UPDATE sellers SET whatsapp_pending_action = NULL WHERE user_id = ?').run(sellerId);
}

module.exports = {
  processMessage
};
