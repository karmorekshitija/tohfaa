'use strict';

const db = require('../src/db');

async function checkColumn(tableName, columnName) {
  const query = `
    SELECT column_name
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = ? 
      AND column_name = ?
  `;
  try {
    const result = await db.prepare(query).get(tableName, columnName);
    return !!result;
  } catch (err) {
    console.error(`Error checking column ${columnName} in ${tableName}:`, err.message);
    return false;
  }
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
  try {
    const result = await db.prepare(query).get(sourceTable, sourceColumn, targetTable, targetColumn);
    return !!result;
  } catch (err) {
    console.error(`Error checking foreign key from ${sourceTable}(${sourceColumn}) to ${targetTable}(${targetColumn}):`, err.message);
    return false;
  }
}

async function checkTable(tableName) {
  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = ?
  `;
  try {
    const result = await db.prepare(query).get(tableName);
    return !!result;
  } catch (err) {
    console.error(`Error checking table ${tableName}:`, err.message);
    return false;
  }
}

async function getTableRowCount(tableName) {
  try {
    const result = await db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    return result ? parseInt(result.count, 10) : 0;
  } catch (err) {
    console.error(`Error getting row count for ${tableName}:`, err.message);
    return 0;
  }
}

async function runAudit() {
  console.log('=== CATEGORY SCHEMA AUDIT START (Read-Only) ===\n');

  const missingList = [];
  
  // 1. Columns on categories
  const categoriesColumns = ['image_url', 'icon_url', 'banner_image_url'];
  console.log('--- Columns on `categories` ---');
  for (const col of categoriesColumns) {
    const exists = await checkColumn('categories', col);
    console.log(`${exists ? '✅' : '❌'} categories.${col} ${exists ? 'exists' : 'is MISSING'}`);
    if (!exists) missingList.push(`Column: categories.${col}`);
  }
  console.log('');

  // 2. Column on listings
  console.log('--- Column and Foreign Key on `listings` ---');
  const listingIdExists = await checkColumn('listings', 'category_id');
  console.log(`${listingIdExists ? '✅' : '❌'} listings.category_id ${listingIdExists ? 'exists' : 'is MISSING'}`);
  if (!listingIdExists) {
    missingList.push('Column: listings.category_id');
  } else {
    // If the column exists, check reference constraint
    const fkExists = await checkForeignKeyConstraint('listings', 'category_id', 'categories', 'id');
    console.log(`${fkExists ? '✅' : '❌'} listings.category_id references categories(id) ${fkExists ? 'verified' : 'is MISSING or incorrect'}`);
    if (!fkExists) missingList.push('Foreign Key Constraint: listings.category_id -> categories(id)');
  }
  console.log('');

  // 3. Tables
  const targetTables = ['subcategories', 'product_subcategories', 'listing_subcategories'];
  console.log('--- Tables ---');
  const tableStatus = {};
  for (const table of targetTables) {
    const exists = await checkTable(table);
    tableStatus[table] = exists;
    console.log(`${exists ? '✅' : '❌'} Table \`${table}\` ${exists ? 'exists' : 'is MISSING'}`);
    if (!exists) missingList.push(`Table: ${table}`);
  }
  console.log('');

  // 4. Row counts for subcategories, product_subcategories, listing_subcategories if they exist
  console.log('--- Row Counts for Target Tables (if exist) ---');
  for (const table of targetTables) {
    if (tableStatus[table]) {
      const count = await getTableRowCount(table);
      console.log(`- ${table}: ${count} rows`);
    } else {
      console.log(`- ${table}: (Table does not exist, skipped row count)`);
    }
  }
  console.log('');

  // 5. Count of listings rows where category_id IS NULL vs NOT NULL
  console.log('--- Listings Category ID Counts ---');
  if (listingIdExists) {
    try {
      const nullCountRes = await db.prepare('SELECT COUNT(*) as count FROM listings WHERE category_id IS NULL').get();
      const notNullCountRes = await db.prepare('SELECT COUNT(*) as count FROM listings WHERE category_id IS NOT NULL').get();
      console.log(`- listings.category_id IS NULL: ${nullCountRes.count}`);
      console.log(`- listings.category_id IS NOT NULL: ${notNullCountRes.count}`);
    } catch (err) {
      console.log('⚠️ Failed to query listings.category_id counts:', err.message);
    }
  } else {
    console.log('⚠️ listings.category_id column does not exist. Skipping row counts.');
  }
  console.log('');

  // 6. Count of categories rows total, and image_url details
  console.log('--- Categories Stats ---');
  try {
    const totalCatsRes = await db.prepare('SELECT COUNT(*) as count FROM categories').get();
    let nonNullImgCount = 0;
    if (await checkColumn('categories', 'image_url')) {
      const imgRes = await db.prepare('SELECT COUNT(*) as count FROM categories WHERE image_url IS NOT NULL').get();
      nonNullImgCount = imgRes.count;
    }
    console.log(`- Total categories: ${totalCatsRes.count}`);
    console.log(`- Categories with non-null image_url: ${nonNullImgCount}`);
  } catch (err) {
    console.log('⚠️ Failed to query categories stats:', err.message);
  }
  console.log('');

  // Plain English Summary
  console.log('=== AUDIT SUMMARY ===');
  if (missingList.length === 0) {
    console.log('Schema is fully up to date');
  } else {
    console.log('The following schema updates are MISSING:');
    for (const item of missingList) {
      console.log(`- ❌ ${item}`);
    }
  }
  console.log('\n=== CATEGORY SCHEMA AUDIT END ===');
  
  process.exit(0);
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
