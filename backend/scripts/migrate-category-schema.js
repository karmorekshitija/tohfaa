'use strict';

const db = require('../src/db');

// Re-use same check helper functions
async function checkColumn(tableName, columnName) {
  const query = `
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = ? 
      AND column_name = ?
  `;
  const result = await db.prepare(query).get(tableName, columnName);
  return !!result;
}

async function checkForeignKeyConstraint(sourceTable, sourceColumn, targetTable, targetColumn) {
  const query = `
    SELECT tc.constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = ?
      AND kcu.column_name = ?
      AND ccu.table_name = ?
      AND ccu.column_name = ?
  `;
  const result = await db.prepare(query).get(sourceTable, sourceColumn, targetTable, targetColumn);
  return !!result;
}

async function checkTable(tableName) {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = ?
  `;
  const result = await db.prepare(query).get(tableName);
  return !!result;
}

async function getTableRowCount(tableName) {
  try {
    const result = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    return result ? parseInt(result.count, 10) : 0;
  } catch (err) {
    return 0;
  }
}

async function runAuditReport() {
  const report = {
    columns: {},
    fk: false,
    tables: {},
    rowCounts: {},
    listingsCount: { nullCount: 0, notNullCount: 0 },
    categoriesCount: { total: 0, nonNullImg: 0 }
  };

  const categoriesColumns = ['image_url', 'icon_url', 'banner_image_url'];
  for (const col of categoriesColumns) {
    report.columns[`categories.${col}`] = await checkColumn('categories', col);
  }

  const listingIdExists = await checkColumn('listings', 'category_id');
  report.columns['listings.category_id'] = listingIdExists;
  if (listingIdExists) {
    report.fk = await checkForeignKeyConstraint('listings', 'category_id', 'categories', 'id');
  }

  const targetTables = ['subcategories', 'product_subcategories', 'listing_subcategories'];
  for (const table of targetTables) {
    const exists = await checkTable(table);
    report.tables[table] = exists;
    if (exists) {
      report.rowCounts[table] = await getTableRowCount(table);
    }
  }

  if (listingIdExists) {
    try {
      const nullCountRes = await db.prepare('SELECT COUNT(*) as count FROM listings WHERE category_id IS NULL').get();
      const notNullCountRes = await db.prepare('SELECT COUNT(*) as count FROM listings WHERE category_id IS NOT NULL').get();
      report.listingsCount.nullCount = nullCountRes.count;
      report.listingsCount.notNullCount = notNullCountRes.count;
    } catch (err) {
      // ignore
    }
  }

  try {
    const totalCatsRes = await db.prepare('SELECT COUNT(*) as count FROM categories').get();
    report.categoriesCount.total = totalCatsRes.count;
    if (report.columns['categories.image_url']) {
      const imgRes = await db.prepare('SELECT COUNT(*) as count FROM categories WHERE image_url IS NOT NULL').get();
      report.categoriesCount.nonNullImg = imgRes.count;
    }
  } catch (err) {
    // ignore
  }

  return report;
}

function printReport(title, report) {
  console.log(`--- ${title} ---`);
  console.log('Columns:');
  for (const [key, val] of Object.entries(report.columns)) {
    console.log(`  ${val ? '✅' : '❌'} ${key}`);
  }
  console.log(`  ${report.fk ? '✅' : '❌'} listings.category_id references categories(id)`);
  console.log('Tables:');
  for (const [key, val] of Object.entries(report.tables)) {
    console.log(`  ${val ? '✅' : '❌'} ${key} (Rows: ${val ? report.rowCounts[key] : 'N/A'})`);
  }
  console.log('Stats:');
  console.log(`  - listings category_id NULL/NOT NULL: ${report.listingsCount.nullCount} / ${report.listingsCount.notNullCount}`);
  console.log(`  - categories total / non-null image_url: ${report.categoriesCount.total} / ${report.categoriesCount.nonNullImg}`);
  console.log('');
}

async function performMigration() {
  console.log('=== CATEGORY SCHEMA MIGRATION START ===\n');

  // 1. Initial Audit
  const beforeReport = await runAuditReport();
  printReport('BEFORE MIGRATION STATE', beforeReport);

  // 2. Migration Execution inside a Single Transaction
  console.log('Applying migrations inside a transaction...');
  
  const migrationTx = db.transaction(async () => {
    // A. Columns on categories
    if (!beforeReport.columns['categories.image_url']) {
      await db.prepare('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL').run();
    }
    if (!beforeReport.columns['categories.icon_url']) {
      await db.prepare('ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_url TEXT DEFAULT NULL').run();
    }
    if (!beforeReport.columns['categories.banner_image_url']) {
      await db.prepare('ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_image_url TEXT DEFAULT NULL').run();
    }

    // B. Columns and Constraints on listings
    if (!beforeReport.columns['listings.category_id']) {
      await db.prepare('ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL').run();
    } else if (!beforeReport.fk) {
      await db.prepare('ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_category_id_fkey').run();
      await db.prepare('ALTER TABLE listings ADD CONSTRAINT listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL').run();
    }

    // C. Tables
    if (!beforeReport.tables['subcategories']) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS subcategories (
          id          SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          name        TEXT NOT NULL,
          slug        TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    }

    if (!beforeReport.tables['product_subcategories']) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS product_subcategories (
          product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
          PRIMARY KEY (product_id, subcategory_id)
        )
      `).run();
    }

    if (!beforeReport.tables['listing_subcategories']) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS listing_subcategories (
          listing_id     INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
          subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
          PRIMARY KEY (listing_id, subcategory_id)
        )
      `).run();
    }
  });

  await migrationTx();
  console.log('Transaction committed successfully.\n');

  // 3. Post-Migration Audit
  const afterReport = await runAuditReport();
  printReport('AFTER MIGRATION STATE', afterReport);

  // Before / After Comparison Summary
  console.log('=== BEFORE/AFTER COMPARISON SUMMARY ===');
  let changesMade = false;
  for (const [key, val] of Object.entries(afterReport.columns)) {
    if (beforeReport.columns[key] !== val) {
      console.log(`- ${key}: Added successfully`);
      changesMade = true;
    }
  }
  if (beforeReport.fk !== afterReport.fk) {
    console.log(`- listings.category_id references categories(id) foreign key constraint: Added successfully`);
    changesMade = true;
  }
  for (const [key, val] of Object.entries(afterReport.tables)) {
    if (beforeReport.tables[key] !== val) {
      console.log(`- Table ${key}: Created successfully`);
      changesMade = true;
    }
  }
  
  if (!changesMade) {
    console.log('All elements were already present in the database. No schema modifications were needed.');
  } else {
    console.log('Migration completed successfully.');
  }
  console.log('\n=== CATEGORY SCHEMA MIGRATION END ===');

  process.exit(0);
}

performMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
