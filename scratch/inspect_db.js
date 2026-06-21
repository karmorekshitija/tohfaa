const db = require('c:/Users/ACER/OneDrive/Desktop/antigravity_workspace/TohfaHub_project-1/backend/src/db.js');

async function inspect() {
  try {
    const joined = await db.prepare(`
      SELECT p.id as p_id, l.id as l_id, p.name, p.seller_id
      FROM products p
      JOIN listings l ON p.name = l.title AND p.seller_id = l.seller_id
    `).all();
    
    console.log(`Joined rows count: ${joined.length}`);
    console.log(`Sample joined rows:`);
    console.log(JSON.stringify(joined.slice(0, 5), null, 2));

    // Check if any product has no matching listing
    const orphanedProducts = await db.prepare(`
      SELECT p.id, p.name, p.seller_id FROM products p
      LEFT JOIN listings l ON p.name = l.title AND p.seller_id = l.seller_id
      WHERE l.id IS NULL
    `).all();
    console.log(`Orphaned products (no matching listing by name+seller): ${orphanedProducts.length}`);
    console.log(JSON.stringify(orphanedProducts, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Inspection failed:', err);
    process.exit(1);
  }
}

inspect();
