const db = require('../src/db');

async function main() {
  try {
    const res = await db.prepare(`
      UPDATE categories 
      SET is_active = 0 
      WHERE slug IN ('textile-arts', 'ceramics-pottery', 'journals-stationery', 'candles-fragrance', 'paintings')
    `).run();
    console.log('Successfully deactivated old categories. Changes:', res.changes);
  } catch (err) {
    console.error('Failed to deactivate old categories:', err);
  }
  process.exit(0);
}

main();
