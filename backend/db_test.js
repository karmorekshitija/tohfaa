const db = require('./src/db.js');

async function main() {
  try {
    const totalTransactions = await db.prepare("SELECT COUNT(*) AS count FROM transactions").get();
    console.log('Total transactions:', totalTransactions);

    const types = await db.prepare("SELECT type, COUNT(*) AS count FROM transactions GROUP BY type").all();
    console.log('Transaction types:', types);

    const sample = await db.prepare("SELECT created_at, seller_id, type, net_amount FROM transactions LIMIT 5").all();
    console.log('Sample transactions:', sample);

    const nowQuery = await db.prepare("SELECT date('now', '-7 days') AS date_val").get();
    console.log('date(now, -7 days):', nowQuery);

    const testGraphQuery = await db.prepare(`
      SELECT 
        date(created_at) as date,
        COALESCE(SUM(net_amount), 0) as amount
      FROM transactions
      WHERE type = 'SALE' AND created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
    `).all();
    console.log('Test Graph Query results:', testGraphQuery);

  } catch (err) {
    console.error(err);
  }
}

main();

