'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function runMigration() {
  const isCommit = process.argv.includes('--commit');
  const modeLabel = isCommit ? 'COMMIT MODE' : 'DRY RUN MODE';
  console.log(`=== CATEGORY HIERARCHY MIGRATION START (${modeLabel}) ===\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const proposalPath = path.join(__dirname, 'output', 'category-hierarchy-proposal.json');

  if (!fs.existsSync(proposalPath)) {
    console.error(`Error: Proposal file not found at ${proposalPath}. Please run propose-category-hierarchy.js first.`);
    process.exit(1);
  }

  // Load proposal
  const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
  const proposedChildren = proposal.proposed_children || [];

  if (proposedChildren.length === 0) {
    console.log('No children categories found in proposal to migrate.');
    process.exit(0);
  }

  const childIds = proposedChildren.map(c => c.child_id);

  // Step 0: Backup categories before any change
  console.log('Step 0: Generating categories backup...');
  // Since childIds can be large, retrieve them in batches or in a single query
  const placeholders = childIds.map(() => '?').join(',');
  const backupRows = await db.prepare(`
    SELECT * FROM categories WHERE id IN (${placeholders})
  `).all(childIds);

  const backupFilename = `categories-backup-${timestamp}.json`;
  const backupPath = path.join(__dirname, 'output', backupFilename);
  fs.writeFileSync(backupPath, JSON.stringify(backupRows, null, 2), 'utf8');
  console.log(`Backup of ${backupRows.length} rows written to: ${backupPath}\n`);

  // Step 1: Safety re-check and determine what to migrate
  console.log('Step 1: Running safety checks against live database...');
  const migrationQueue = [];
  const skippedList = [];
  let alreadyMigratedCount = 0;

  for (const child of proposedChildren) {
    // Check if it still exists in categories (if it was deleted previously, it's already migrated)
    const existsInCategories = await db.prepare('SELECT id FROM categories WHERE id = ?').get(child.child_id);
    if (!existsInCategories) {
      // Check if it already exists in subcategories
      const existsInSubcats = await db.prepare('SELECT id FROM subcategories WHERE slug = ?').get(child.child_slug);
      if (existsInSubcats) {
        alreadyMigratedCount++;
      }
      continue; // Skip because it doesn't exist in categories anymore
    }

    // Safety check: Count live products and listings
    const prodCountRes = await db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(child.child_id);
    const listCountRes = await db.prepare('SELECT COUNT(*) as count FROM listings WHERE category_id = ?').get(child.child_id);
    
    const prodCount = parseInt(prodCountRes.count, 10);
    const listCount = parseInt(listCountRes.count, 10);

    if (prodCount > 0 || listCount > 0) {
      console.log(`⚠️ SKIPPED - category ID ${child.child_id} ("${child.child_name}") has data attached since proposal (Products: ${prodCount}, Listings: ${listCount})`);
      skippedList.push({
        id: child.child_id,
        name: child.child_name,
        products: prodCount,
        listings: listCount
      });
    } else {
      migrationQueue.push(child);
    }
  }
  console.log(`Safety check complete. Queue length: ${migrationQueue.length}. Skipped due to data: ${skippedList.length}. Already migrated: ${alreadyMigratedCount}.\n`);

  // Step 2 & 3: Run Inserts and Deletes
  let newlyInserted = 0;
  let categoriesDeleted = 0;
  let idempotentSkips = 0;

  if (isCommit) {
    console.log('Step 2 & 3: Executing write operations inside a transaction...');
    const migrateTx = db.transaction(async () => {
      for (const item of migrationQueue) {
        // A. Check if already exists in subcategories
        const existingSub = await db.prepare('SELECT id FROM subcategories WHERE slug = ?').get(item.child_slug);
        
        if (!existingSub) {
          const desc = `Handmade ${item.child_name} under ${item.proposed_parent_name}.`;
          await db.prepare(`
            INSERT INTO subcategories (category_id, name, slug, description)
            VALUES (?, ?, ?, ?)
          `).run(item.proposed_parent_id, item.child_name, item.child_slug, desc);
          newlyInserted++;
        } else {
          idempotentSkips++;
        }

        // B. Delete from categories
        await db.prepare('DELETE FROM categories WHERE id = ?').run(item.child_id);
        categoriesDeleted++;
      }
    });

    await migrateTx();
    console.log('Transaction committed successfully.\n');
  } else {
    console.log('Step 2 & 3: Simulating write operations (DRY RUN)...');
    for (const item of migrationQueue) {
      const existingSub = await db.prepare('SELECT id FROM subcategories WHERE slug = ?').get(item.child_slug);
      if (!existingSub) {
        console.log(`[DRY RUN] Would insert subcategory: "${item.child_name}" (slug: "${item.child_slug}") under Parent ID ${item.proposed_parent_id}`);
        newlyInserted++;
      } else {
        idempotentSkips++;
      }
      console.log(`[DRY RUN] Would delete category ID ${item.child_id} ("${item.child_name}")`);
      categoriesDeleted++;
    }
    console.log('Dry run simulation complete.\n');
  }

  // Get final table counts
  const finalCatCountRes = await db.prepare('SELECT COUNT(*) as count FROM categories').get();
  const finalSubCountRes = await db.prepare('SELECT COUNT(*) as count FROM subcategories').get();
  const finalCatCount = parseInt(finalCatCountRes.count, 10);
  const finalSubCount = parseInt(finalSubCountRes.count, 10);

  // Step 5: Final report
  const report = {
    generated_at: new Date().toISOString(),
    mode: modeLabel,
    subcategories_newly_inserted: newlyInserted,
    categories_deleted: categoriesDeleted,
    skipped_due_to_safety_recheck: skippedList,
    already_migrated_previously: alreadyMigratedCount,
    idempotent_subcategory_skips: idempotentSkips,
    final_row_counts: {
      categories: finalCatCount,
      subcategories: finalSubCount
    }
  };

  const reportFilename = `migration-report-${timestamp}.json`;
  const reportPath = path.join(__dirname, 'output', reportFilename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('=== FINAL MIGRATION REPORT ===');
  console.log(`- Mode: ${report.mode}`);
  console.log(`- Subcategories inserted: ${report.subcategories_newly_inserted}`);
  console.log(`- Categories deleted: ${report.categories_deleted}`);
  console.log(`- Already migrated previously: ${report.already_migrated_previously}`);
  console.log(`- Idempotent skips (already existed in subcategories): ${report.idempotent_subcategory_skips}`);
  console.log(`- Skipped due to live safety checks: ${report.skipped_due_to_safety_recheck.length}`);
  console.log(`- Final Categories count: ${report.final_row_counts.categories}`);
  console.log(`- Final Subcategories count: ${report.final_row_counts.subcategories}`);
  console.log(`Report written to: ${reportPath}`);
  console.log('\n=== CATEGORY HIERARCHY MIGRATION END ===');

  process.exit(0);
}

runMigration().catch(err => {
  console.error('Fatal migration execution error:', err);
  process.exit(1);
});
