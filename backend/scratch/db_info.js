const db = require('../src/db.js');

async function main() {
  // Wait 1.5 seconds for async database init to complete
  await new Promise(resolve => setTimeout(resolve, 1500));
  try {
    const res = await db.prepare(`
      SELECT 
        conname AS constraint_name, 
        pg_get_constraintdef(c.oid) AS constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'orders'::regclass
    `).all();
    console.log("Constraints on 'orders':", res);
  } catch (err) {
    console.error(err);
  }
}

main();
