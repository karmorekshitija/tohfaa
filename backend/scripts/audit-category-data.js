'use strict';

const db = require('../src/db');

// Heuristic to check if two categories are similar
function areSimilar(cat1, cat2) {
  const name1 = (cat1.name || '').toLowerCase().trim();
  const name2 = (cat2.name || '').toLowerCase().trim();
  const disp1 = (cat1.display_name || '').toLowerCase().trim();
  const disp2 = (cat2.display_name || '').toLowerCase().trim();
  const slug1 = (cat1.slug || '').toLowerCase().trim();
  const slug2 = (cat2.slug || '').toLowerCase().trim();

  // 1. Direct substring match
  if (name1.length > 3 && name2.length > 3) {
    if (name1.includes(name2) || name2.includes(name1)) return true;
    if (disp1.includes(disp2) || disp2.includes(disp1)) return true;
    if (slug1.includes(slug2) || slug2.includes(slug1)) return true;
  }

  // Helper to split into word tokens and filter out short words/conjunctions
  const getTokens = (str) => {
    return str
      .replace(/[&,]/g, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 2 && t !== 'and' && t !== 'for' && t !== 'with');
  };

  const tokens1 = getTokens(name1).concat(getTokens(disp1));
  const tokens2 = getTokens(name2).concat(getTokens(disp2));

  // 2. Shared root words or exact token matches
  const roots = [
    ['jewel', 'jewelry', 'jewellery'],
    ['paint', 'painting', 'paintings', 'art', 'artwork', 'wall art'],
    ['decor', 'decoration', 'decorations', 'home'],
    ['gift', 'gifts', 'hampers', 'gifting'],
    ['ceramic', 'ceramics', 'pottery', 'clay'],
    ['fabric', 'fabrics', 'cloth', 'clothing', 'crochet', 'wool', 'yarn'],
    ['wedding', 'marriage', 'ritual', 'rituals', 'traditional']
  ];

  // Check if any token from cat1 and any token from cat2 belong to the same root group
  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1 === t2) return true;
      for (const group of roots) {
        if (group.some(r => t1.includes(r)) && group.some(r => t2.includes(r))) {
          return true;
        }
      }
    }
  }

  return false;
}

async function runDataAudit() {
  console.log('=== CATEGORY & LISTING DATA CONTENT AUDIT START (Read-Only) ===\n');

  let totalIssues = {
    sec2: 0,
    sec3: 0,
    sec4: 0,
    sec5: 0
  };

  // --- SECTION 1: Full category listing ---
  console.log('=== SECTION 1: Full Category Listing ===');
  const categories = await db.prepare(`
    SELECT id, name, display_name, slug, is_active, sort_order, image_url, product_count 
    FROM categories 
    ORDER BY id ASC
  `).all();

  console.log(String('id').padEnd(6) + ' | ' + 
              String('name').padEnd(25) + ' | ' + 
              String('display_name').padEnd(25) + ' | ' + 
              String('slug').padEnd(25) + ' | ' + 
              String('active').padEnd(6) + ' | ' + 
              String('sort').padEnd(5) + ' | ' + 
              String('image_url').padEnd(20) + ' | ' + 
              String('stored_prod_cnt'));
  console.log('-'.repeat(130));

  for (const cat of categories) {
    console.log(
      String(cat.id).padEnd(6) + ' | ' + 
      String(cat.name || '').padEnd(25).substring(0, 25) + ' | ' + 
      String(cat.display_name || '').padEnd(25).substring(0, 25) + ' | ' + 
      String(cat.slug || '').padEnd(25).substring(0, 25) + ' | ' + 
      String(cat.is_active).padEnd(6) + ' | ' + 
      String(cat.sort_order).padEnd(5) + ' | ' + 
      String(cat.image_url || 'NULL').padEnd(20).substring(0, 20) + ' | ' + 
      String(cat.product_count)
    );
  }
  console.log('\n');

  // --- SECTION 2: Live vs stored product counts ---
  console.log('=== SECTION 2: Live vs Stored Product Counts ===');
  console.log(String('Category Name').padEnd(25) + ' | ' + 
              String('Stored Count').padEnd(12) + ' | ' + 
              String('Real Products').padEnd(13) + ' | ' + 
              String('Real Active Listings').padEnd(20) + ' | ' + 
              String('Status'));
  console.log('-'.repeat(85));

  const catCounts = [];
  for (const cat of categories) {
    const realProdRes = await db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(cat.id);
    const realListRes = await db.prepare("SELECT COUNT(*) as count FROM listings WHERE category_id = ? AND status = 'active'").get(cat.id);
    
    const realProdCount = parseInt(realProdRes.count, 10);
    const realListCount = parseInt(realListRes.count, 10);
    const storedCount = parseInt(cat.product_count, 10);

    const isMatch = storedCount === realProdCount;
    if (!isMatch) {
      totalIssues.sec2++;
    }

    catCounts.push({
      id: cat.id,
      name: cat.name,
      storedCount,
      realProdCount,
      realListCount,
      isMatch
    });

    console.log(
      String(cat.name || '').padEnd(25).substring(0, 25) + ' | ' + 
      String(storedCount).padEnd(12) + ' | ' + 
      String(realProdCount).padEnd(13) + ' | ' + 
      String(realListCount).padEnd(20) + ' | ' + 
      (isMatch ? '✅ MATCH' : '❌ MISMATCH')
    );
  }
  console.log('\n');

  // --- SECTION 3: Likely duplicate categories ---
  console.log('=== SECTION 3: Likely Duplicate Categories ===');
  const duplicatePairs = [];
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      if (areSimilar(categories[i], categories[j])) {
        duplicatePairs.push([categories[i], categories[j]]);
      }
    }
  }

  if (duplicatePairs.length === 0) {
    console.log('No likely duplicate categories identified.');
  } else {
    totalIssues.sec3 = duplicatePairs.length;
    for (const [c1, c2] of duplicatePairs) {
      const cnt1 = catCounts.find(c => c.id === c1.id);
      const cnt2 = catCounts.find(c => c.id === c2.id);

      console.log(`Suspected Duplicate Pair:`);
      console.log(`  [Category A] ID: ${c1.id} | Name: "${c1.name}" | Display: "${c1.display_name}" | Slug: "${c1.slug}" | Active: ${c1.is_active} | Real Prods: ${cnt1.realProdCount} | Active Listings: ${cnt1.realListCount}`);
      console.log(`  [Category B] ID: ${c2.id} | Name: "${c2.name}" | Display: "${c2.display_name}" | Slug: "${c2.slug}" | Active: ${c2.is_active} | Real Prods: ${cnt2.realProdCount} | Active Listings: ${cnt2.realListCount}`);
      console.log('-'.repeat(80));
    }
  }
  console.log('\n');

  // --- SECTION 4: Orphaned / mismatched listings.category text field ---
  console.log('=== SECTION 4: Orphaned / Mismatched listings.category Text Field ===');
  const orphanedTextListings = await db.prepare(`
    SELECT id, title, seller_id, category, category_id 
    FROM listings 
    WHERE category_id IS NULL AND category IS NOT NULL AND category != ''
  `).all();

  const mismatchedTextListings = [];
  const listingsWithCatId = await db.prepare(`
    SELECT id, title, seller_id, category, category_id 
    FROM listings 
    WHERE category_id IS NOT NULL
  `).all();

  for (const lst of listingsWithCatId) {
    const matchedCat = categories.find(c => c.id === lst.category_id);
    const catName = matchedCat ? matchedCat.name : null;
    const catSlug = matchedCat ? matchedCat.slug : null;

    if (lst.category && catName && catSlug) {
      const textVal = lst.category.trim().toLowerCase();
      const normName = catName.trim().toLowerCase();
      const normSlug = catSlug.trim().toLowerCase();

      if (textVal !== normName && textVal !== normSlug) {
        mismatchedTextListings.push({
          ...lst,
          resolvedName: catName
        });
      }
    }
  }

  totalIssues.sec4 = orphanedTextListings.length + mismatchedTextListings.length;

  console.log(`- Listings with category_id NULL but text category NOT NULL: ${orphanedTextListings.length}`);
  for (const lst of orphanedTextListings) {
    console.log(`  ⚠️ ID: ${lst.id} | Title: "${lst.title}" | Seller: ${lst.seller_id} | Text Category: "${lst.category}"`);
  }

  console.log(`- Listings with mismatched category_id vs text category: ${mismatchedTextListings.length}`);
  for (const lst of mismatchedTextListings) {
    console.log(`  ⚠️ ID: ${lst.id} | Title: "${lst.title}" | Seller: ${lst.seller_id} | Text Category: "${lst.category}" | Ref ID: ${lst.category_id} (resolves to "${lst.resolvedName}")`);
  }
  console.log('\n');

  // --- SECTION 5: Subcategory sanity check ---
  console.log('=== SECTION 5: Subcategory Sanity Check ===');
  
  // Count of subcategories rows per category_id
  const subcats = await db.prepare('SELECT id, category_id, name, slug FROM subcategories').all();
  const subcatCountPerCat = {};
  for (const sc of subcats) {
    subcatCountPerCat[sc.category_id] = (subcatCountPerCat[sc.category_id] || 0) + 1;
  }

  console.log('Subcategories per Category:');
  for (const cat of categories) {
    const count = subcatCountPerCat[cat.id] || 0;
    console.log(`  - "${cat.name}": ${count} subcategories`);
  }

  // Count of subcategories whose category_id doesn't match any row in categories
  let orphanedSubcatsCount = 0;
  for (const sc of subcats) {
    if (!categories.some(c => c.id === sc.category_id)) {
      orphanedSubcatsCount++;
    }
  }
  console.log(`\n- Orphaned subcategories (no matching category_id): ${orphanedSubcatsCount}`);

  // Count of product_subcategories pointing to non-existent subcategory_id
  const prodSubRes = await db.prepare('SELECT DISTINCT subcategory_id FROM product_subcategories').all();
  let orphanedProdSubCount = 0;
  for (const ps of prodSubRes) {
    if (!subcats.some(sc => sc.id === ps.subcategory_id)) {
      orphanedProdSubCount++;
    }
  }
  console.log(`- Product subcategory relations pointing to non-existent subcategories: ${orphanedProdSubCount}`);

  // Count of listing_subcategories pointing to non-existent subcategory_id
  const listSubRes = await db.prepare('SELECT DISTINCT subcategory_id FROM listing_subcategories').all();
  let orphanedListSubCount = 0;
  for (const ls of listSubRes) {
    if (!subcats.some(sc => sc.id === ls.subcategory_id)) {
      orphanedListSubCount++;
    }
  }
  console.log(`- Listing subcategory relations pointing to non-existent subcategories: ${orphanedListSubCount}`);

  totalIssues.sec5 = orphanedSubcatsCount + orphanedProdSubCount + orphanedListSubCount;
  console.log('\n');

  // --- SECTION 6: Summary ---
  console.log('=== SECTION 6: Summary of Issues Found ===');
  console.log(`- Section 2 (Live vs Stored Count Mismatches): ${totalIssues.sec2} issues`);
  console.log(`- Section 3 (Suspected Duplicate Categories): ${totalIssues.sec3} similar pair(s)`);
  console.log(`- Section 4 (Orphaned / Mismatched text categories): ${totalIssues.sec4} listing(s)`);
  console.log(`- Section 5 (Orphaned Subcategories/Relations): ${totalIssues.sec5} issue(s)`);
  console.log('\n=== CATEGORY & LISTING DATA CONTENT AUDIT END ===');

  process.exit(0);
}

runDataAudit().catch(err => {
  console.error('Fatal data audit error:', err);
  process.exit(1);
});
