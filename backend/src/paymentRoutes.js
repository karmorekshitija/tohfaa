const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

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
        message: "Your account has been suspended",
        code: "USER_BANNED"
      });
    }
    req.user = user;
    next();
  });
}

async function requireSeller(req, res, next) {
  await authenticateToken(req, res, async () => {
    const seller = await db.prepare('SELECT * FROM seller_profiles WHERE user_id = ?').get(req.user.user_id);
    if (!seller) {
      return res.status(403).json({ error: true, message: 'Seller profile not found', code: 'NO_SELLER_PROFILE' });
    }
    req.seller = seller;
    next();
  });
}

// 1. GET /api/payments/receiving-details
router.get('/api/payments/receiving-details', requireSeller, async (req, res) => {
  try {
    const bankDetails = await db.prepare("SELECT * FROM seller_payout_accounts WHERE seller_id = ? AND method = 'BANK' ORDER BY id DESC LIMIT 1").get(req.seller.user_id);
    const upiDetails = await db.prepare("SELECT * FROM seller_payout_accounts WHERE seller_id = ? AND method = 'UPI' ORDER BY id DESC LIMIT 1").get(req.seller.user_id);
    
    return res.json({
      success: true,
      data: {
        bank: bankDetails ? {
          account_holder_name: bankDetails.account_holder_name,
          bank_name: bankDetails.bank_name || '',
          account_number: bankDetails.account_number,
          ifsc_code: bankDetails.ifsc_code
        } : null,
        upi: upiDetails ? {
          account_holder_name: upiDetails.account_holder_name,
          upi_id: upiDetails.upi_id
        } : null
      }
    });
  } catch (err) {
    console.error('GET /api/payments/receiving-details error:', err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// 2. POST/PUT /api/payments/receiving-details
const updateReceivingDetails = async (req, res) => {
  try {
    const { type, account_holder_name, bank_name, account_number, ifsc_code, upi_id } = req.body;
    if (type === 'BANK') {
      if (!account_holder_name || !account_number || !ifsc_code) {
        return res.status(400).json({ error: true, message: 'Missing bank details fields' });
      }
      const existing = await db.prepare("SELECT id FROM seller_payout_accounts WHERE seller_id = ? AND method = 'BANK'").get(req.seller.user_id);
      if (existing) {
        await db.prepare(`
          UPDATE seller_payout_accounts 
          SET account_holder_name = ?, bank_name = ?, account_number = ?, ifsc_code = ? 
          WHERE id = ?
        `).run(account_holder_name, bank_name || '', account_number, ifsc_code, existing.id);
      } else {
        await db.prepare(`
          INSERT INTO seller_payout_accounts (seller_id, method, account_holder_name, bank_name, account_number, ifsc_code, is_primary)
          VALUES (?, 'BANK', ?, ?, ?, ?, 1)
        `).run(req.seller.user_id, account_holder_name, bank_name || '', account_number, ifsc_code);
      }
    } else if (type === 'UPI') {
      if (!account_holder_name || !upi_id) {
        return res.status(400).json({ error: true, message: 'Missing UPI details fields' });
      }
      const existing = await db.prepare("SELECT id FROM seller_payout_accounts WHERE seller_id = ? AND method = 'UPI'").get(req.seller.user_id);
      if (existing) {
        await db.prepare(`
          UPDATE seller_payout_accounts 
          SET account_holder_name = ?, upi_id = ? 
          WHERE id = ?
        `).run(account_holder_name, upi_id, existing.id);
      } else {
        await db.prepare(`
          INSERT INTO seller_payout_accounts (seller_id, method, account_holder_name, upi_id, is_primary)
          VALUES (?, 'UPI', ?, ?, 1)
        `).run(req.seller.user_id, account_holder_name, upi_id);
      }
    } else {
      return res.status(400).json({ error: true, message: 'Invalid details type' });
    }
    
    return res.json({ success: true, message: 'Receiving details updated successfully' });
  } catch (err) {
    console.error('POST/PUT /api/payments/receiving-details error:', err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
};

router.post('/api/payments/receiving-details', requireSeller, updateReceivingDetails);
router.put('/api/payments/receiving-details', requireSeller, updateReceivingDetails);

// 3. GET /api/payments/history/all
router.get('/api/payments/history/all', requireSeller, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (req.query.format === 'csv') {
      const query = `
        SELECT 
          t.created_at as date,
          o.razorpay_payment_id,
          t.gross_amount as amount,
          t.buyer_name,
          t.order_id,
          o.listing_id as product_id,
          o.product_name
        FROM transactions t
        LEFT JOIN orders o ON t.order_id = o.id
        WHERE t.seller_id = ? AND t.type = 'SALE'
        ORDER BY t.created_at DESC
      `;
      const rows = await db.prepare(query).all(req.seller.user_id);
      let csv = 'Date & Time,Buyer Name,Product ID,Product Name,Payment Method,Gross Amount (INR)\n';
      rows.forEach(r => {
        const method = r.razorpay_payment_id ? 'Card/UPI/NetBanking' : 'Direct Settlement';
        const formattedDate = new Date(r.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        csv += `"${formattedDate}","${r.buyer_name}","${r.product_id || ''}","${r.product_name || 'Handcrafted Item'}","${method}",${r.amount / 100}\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="settlements.csv"');
      return res.send(csv);
    }

    const query = `
      SELECT 
        t.created_at as date,
        o.razorpay_payment_id,
        t.gross_amount as amount,
        t.buyer_name,
        t.order_id,
        o.listing_id as product_id,
        o.product_name
      FROM transactions t
      LEFT JOIN orders o ON t.order_id = o.id
      WHERE t.seller_id = ? AND t.type = 'SALE'
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const rows = await db.prepare(query).all(req.seller.user_id, limit, offset);

    const countRow = await db.prepare(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE seller_id = ? AND type = 'SALE'
    `).get(req.seller.user_id);
    const totalCount = countRow ? countRow.count : 0;

    const items = rows.map(r => ({
      date: r.date,
      method: r.razorpay_payment_id ? 'Card/UPI/NetBanking' : 'Direct Settlement',
      amount: r.amount / 100,
      buyer_name: r.buyer_name,
      product_id: r.product_id,
      product_name: r.product_name || 'Handcrafted Item',
      order_id: r.order_id
    }));

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (err) {
    console.error('GET /api/payments/history/all error:', err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// 4. GET /api/payments/disputes/all
router.get('/api/payments/disputes/all', requireSeller, async (req, res) => {
  try {
    const query = `
      SELECT 
        rd.id as dispute_id,
        rd.amount,
        rd.reason,
        rd.status,
        rd.seller_response,
        rd.created_at as date,
        o.order_ref,
        o.id as order_id,
        u.full_name as buyer_name
      FROM refund_disputes rd
      LEFT JOIN orders o ON rd.order_id = o.id
      LEFT JOIN users u ON o.buyer_id = u.id
      WHERE rd.seller_id = ?
      ORDER BY rd.created_at DESC
    `;
    const rows = await db.prepare(query).all(req.seller.user_id);

    const items = rows.map(r => ({
      id: r.dispute_id,
      amount: r.amount / 100,
      reason: r.reason,
      status: r.status,
      seller_response: r.seller_response,
      date: r.date,
      order_ref: r.order_ref,
      order_id: r.order_id,
      buyer_name: r.buyer_name || 'Valued Buyer'
    }));

    return res.json({
      success: true,
      data: items
    });
  } catch (err) {
    console.error('GET /api/payments/disputes/all error:', err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// 5. GET /api/payments/ledger/all
router.get('/api/payments/ledger/all', requireSeller, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { start_date, end_date, type } = req.query;

    let queryStr = `SELECT * FROM transactions WHERE seller_id = ?`;
    let countStr = `SELECT COUNT(*) as count FROM transactions WHERE seller_id = ?`;
    const params = [req.seller.user_id];

    if (start_date) {
      queryStr += ` AND created_at >= ?`;
      countStr += ` AND created_at >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      queryStr += ` AND created_at <= ?`;
      countStr += ` AND created_at <= ?`;
      params.push(end_date + ' 23:59:59');
    }
    if (type) {
      queryStr += ` AND type = ?`;
      countStr += ` AND type = ?`;
      params.push(type);
    }

    queryStr += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const rows = await db.prepare(queryStr).all(...params, limit, offset);

    const countRow = await db.prepare(countStr).get(...params);
    const totalCount = countRow ? countRow.count : 0;

    const items = rows.map(r => ({
      id: r.id,
      date: r.created_at,
      order_id: r.order_id,
      product_name: r.product_name,
      buyer_name: r.buyer_name,
      type: r.type,
      gross_amount: r.gross_amount / 100,
      platform_fee: r.platform_fee / 100,
      tax_amount: r.tax_amount / 100,
      net_amount: r.net_amount / 100,
      status: r.status
    }));

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (err) {
    console.error('GET /api/payments/ledger/all error:', err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// 6. GET /api/payments/invoices/all
router.get('/api/payments/invoices/all', requireSeller, async (req, res) => {
  try {
    const months = [
      { month_name: 'June 2026', key: '2026-06', statement_url: `/api/payments/invoices/statement/2026-06`, invoice_url: `/api/payments/invoices/statement/2026-06`, tds_url: `/api/payments/invoices/tds/2026-2027` },
      { month_name: 'May 2026', key: '2026-05', statement_url: `/api/payments/invoices/statement/2026-05`, invoice_url: `/api/payments/invoices/statement/2026-05`, tds_url: `/api/payments/invoices/tds/2026-2027` },
      { month_name: 'April 2026', key: '2026-04', statement_url: `/api/payments/invoices/statement/2026-04`, invoice_url: `/api/payments/invoices/statement/2026-04`, tds_url: `/api/payments/invoices/tds/2026-2027` },
      { month_name: 'March 2026', key: '2026-03', statement_url: `/api/payments/invoices/statement/2026-03`, invoice_url: `/api/payments/invoices/statement/2026-03`, tds_url: `/api/payments/invoices/tds/2025-2026` },
      { month_name: 'February 2026', key: '2026-02', statement_url: `/api/payments/invoices/statement/2026-02`, invoice_url: `/api/payments/invoices/statement/2026-02`, tds_url: `/api/payments/invoices/tds/2025-2026` },
      { month_name: 'January 2026', key: '2026-01', statement_url: `/api/payments/invoices/statement/2026-01`, invoice_url: `/api/payments/invoices/statement/2026-01`, tds_url: `/api/payments/invoices/tds/2025-2026` }
    ];
    return res.json({
      success: true,
      data: months
    });
  } catch (err) {
    console.error('GET /api/payments/invoices/all error:', err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// Earnings overview
router.get('/api/payments/earnings', requireSeller, async (req, res) => {
  try {
    const totalEarned = await db.prepare("SELECT COALESCE(SUM(net_amount), 0) as total FROM transactions WHERE seller_id = ? AND type = 'SALE'").get(req.seller.user_id);
    const monthEarned = await db.prepare("SELECT COALESCE(SUM(net_amount), 0) as total FROM transactions WHERE seller_id = ? AND type = 'SALE' AND created_at >= date('now', '-30 days')").get(req.seller.user_id);
    const weekEarned = await db.prepare("SELECT COALESCE(SUM(net_amount), 0) as total FROM transactions WHERE seller_id = ? AND type = 'SALE' AND created_at >= date('now', '-7 days')").get(req.seller.user_id);
    const onHold = await db.prepare("SELECT COALESCE(SUM(net_amount), 0) as total FROM transactions WHERE seller_id = ? AND type = 'SALE' AND status = 'PENDING'").get(req.seller.user_id);

    return res.json({
      success: true,
      data: {
        total_earned: totalEarned.total,
        this_month_earned: monthEarned.total,
        this_week_earned: weekEarned.total,
        pending_amount: 0,
        on_hold_amount: onHold.total
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

router.get('/api/payments/earnings/graph', requireSeller, async (req, res) => {
  try {
    const range = req.query.range || '7d';
    let days = 7;
    if (range === '30d') days = 30;
    else if (range === '3m') days = 90;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffString = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

    const query = `
      SELECT 
        date(created_at) as date,
        COALESCE(SUM(net_amount), 0) as amount
      FROM transactions
      WHERE seller_id = ? AND type = 'SALE' AND created_at >= ?
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC
    `;
    const rows = await db.prepare(query).all(req.seller.user_id, cutoffString);

    const formatted = rows.map(r => ({
      date: r.date,
      amount: r.amount / 100
    }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// Tax & GST Details
router.get('/api/payments/tax', requireSeller, async (req, res) => {
  try {
    const info = await db.prepare("SELECT * FROM seller_tax_info WHERE seller_id = ?").get(req.seller.user_id);
    return res.json({
      success: true,
      data: info || {
        is_gst_registered: 0,
        gstin: '',
        pan_number: '',
        tds_applicable: 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

router.post('/api/payments/tax', requireSeller, async (req, res) => {
  try {
    const { is_gst_registered, gstin, pan_number, tds_applicable } = req.body;
    const existing = await db.prepare("SELECT id FROM seller_tax_info WHERE seller_id = ?").get(req.seller.user_id);
    if (existing) {
      await db.prepare(`
        UPDATE seller_tax_info 
        SET is_gst_registered = ?, gstin = ?, pan_number = ?, tds_applicable = ?
        WHERE id = ?
      `).run(is_gst_registered ? 1 : 0, gstin || '', pan_number || '', tds_applicable ? 1 : 0, existing.id);
    } else {
      await db.prepare(`
        INSERT INTO seller_tax_info (seller_id, is_gst_registered, gstin, pan_number, tds_applicable, financial_year)
        VALUES (?, ?, ?, ?, ?, '2026-2027')
      `).run(req.seller.user_id, is_gst_registered ? 1 : 0, gstin || '', pan_number || '', tds_applicable ? 1 : 0);
    }
    return res.json({ success: true, message: 'Tax settings saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// Dispute mediation / contestation
router.post('/api/payments/refunds/:id/contest', requireSeller, async (req, res) => {
  try {
    const { response } = req.body;
    const disputeId = req.params.id;
    const dispute = await db.prepare("SELECT id FROM refund_disputes WHERE id = ? AND seller_id = ?").get(disputeId, req.seller.user_id);
    if (!dispute) {
      return res.status(404).json({ error: true, message: 'Dispute not found' });
    }
    await db.prepare("UPDATE refund_disputes SET status = 'CONTESTED', seller_response = ? WHERE id = ?").run(response, disputeId);
    return res.json({ success: true, message: 'Dispute contested successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: true, message: 'Internal server error' });
  }
});

// Downloads / Invoices
router.get('/api/payments/invoices/statement/:month', requireSeller, (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=statement-${req.params.month}.txt`);
  res.send(`Tohfa Seller Statement for ${req.params.month}\nSeller ID: ${req.seller.user_id}\n\nThis is a system generated statement summarizing direct settlements.`);
});

router.get('/api/payments/invoices/tds/:fy', requireSeller, (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=tds-${req.params.fy}.txt`);
  res.send(`Tohfa TDS Certificate for Financial Year ${req.params.fy}\nSeller ID: ${req.seller.user_id}\n\nStandard government TDS has been filed.`);
});

module.exports = router;
