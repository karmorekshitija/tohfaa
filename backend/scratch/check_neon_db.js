const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NO9T7eJADVKH@ep-snowy-glade-aoi6y0eb.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  try {
    console.log("Connecting to Neon database...");
    const resTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_variants'
      );
    `);
    const tableExists = resTable.rows[0].exists;
    console.log("Table 'product_variants' exists:", tableExists);

    if (tableExists) {
      const resCols = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_variants';
      `);
      console.log("Columns of 'product_variants':", resCols.rows.map(r => r.column_name));
    }

    // Check for source_listing_id in products
    const resProd = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
        AND column_name = 'source_listing_id'
      );
    `);
    console.log("Column 'products.source_listing_id' exists:", resProd.rows[0].exists);

  } catch (err) {
    console.error("Error checking database:", err);
  } finally {
    await pool.end();
  }
}

main();
