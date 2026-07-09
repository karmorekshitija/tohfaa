const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_NO9T7eJADVKH@ep-snowy-glade-aoi6y0eb.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Starting migration on Neon database...");
    await client.query('BEGIN');

    // 1. Create product_variants table
    console.log("Creating product_variants table if not exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id                SERIAL PRIMARY KEY,
        product_id        INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        source_variant_id INTEGER DEFAULT NULL REFERENCES listing_variants(id) ON DELETE SET NULL,
        variant_name      TEXT    NOT NULL,
        price_paise       INTEGER DEFAULT NULL,
        stock_qty         INTEGER NOT NULL DEFAULT 0,
        sku               TEXT    DEFAULT NULL,
        created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add source_listing_id to products
    console.log("Adding source_listing_id to products if not exists...");
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS source_listing_id INTEGER DEFAULT NULL REFERENCES listings(id) ON DELETE SET NULL;
    `);

    // 3. Add variant_id to product_images
    console.log("Adding variant_id to product_images if not exists...");
    await client.query(`
      ALTER TABLE product_images 
      ADD COLUMN IF NOT EXISTS variant_id INTEGER DEFAULT NULL REFERENCES product_variants(id) ON DELETE CASCADE;
    `);

    // 4. Add variant_id to cart_items
    console.log("Adding variant_id to cart_items if not exists...");
    await client.query(`
      ALTER TABLE cart_items 
      ADD COLUMN IF NOT EXISTS variant_id INTEGER DEFAULT NULL REFERENCES product_variants(id) ON DELETE SET NULL;
    `);

    // 5. Update UNIQUE constraint on cart_items
    // Let's find any unique constraint on (user_id, product_id) and drop it, then add (user_id, product_id, variant_id)
    console.log("Checking unique constraints on cart_items...");
    const constraintsRes = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'cart_items'::regclass AND contype = 'u';
    `);
    const constraints = constraintsRes.rows.map(r => r.conname);
    console.log("Current unique constraints on cart_items:", constraints);

    // Drop the old UNIQUE(user_id, product_id) constraint. In Postgres, it's typically 'cart_items_user_id_product_id_key'
    if (constraints.includes('cart_items_user_id_product_id_key')) {
      console.log("Dropping old unique constraint 'cart_items_user_id_product_id_key'...");
      await client.query(`
        ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_product_id_key;
      `);
    }

    // Add the new unique constraint if it doesn't exist
    if (!constraints.includes('cart_items_user_id_product_id_variant_id_key')) {
      console.log("Adding new unique constraint 'cart_items_user_id_product_id_variant_id_key'...");
      await client.query(`
        ALTER TABLE cart_items 
        ADD CONSTRAINT cart_items_user_id_product_id_variant_id_key UNIQUE(user_id, product_id, variant_id);
      `);
    }

    // 6. Add variant_id to listing_photos
    console.log("Adding variant_id to listing_photos if not exists...");
    await client.query(`
      ALTER TABLE listing_photos 
      ADD COLUMN IF NOT EXISTS variant_id INTEGER DEFAULT NULL REFERENCES listing_variants(id) ON DELETE CASCADE;
    `);

    // 7. Add variant_id and variant_name to order_items
    console.log("Adding variant_id to order_items if not exists...");
    await client.query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS variant_id INTEGER DEFAULT NULL REFERENCES product_variants(id);
    `);
    console.log("Adding variant_name to order_items if not exists...");
    await client.query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS variant_name TEXT DEFAULT NULL;
    `);

    // 8. Create Indexes
    console.log("Creating indexes if they do not exist...");
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_products_source_listing_id ON products(source_listing_id) WHERE source_listing_id IS NOT NULL;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_listing_photos_variant_id ON listing_photos(variant_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_variant_id ON product_images(variant_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_source_variant_id ON product_variants(source_variant_id);
    `);

    await client.query('COMMIT');
    console.log("Migration completed successfully!");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration failed, rolled back.", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
