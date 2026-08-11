'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function runProposal() {
  console.log('=== CATEGORY HIERARCHY MAPPING PROPOSAL START (Read-Only) ===\n');

  // 1. Fetch all categories
  const categories = await db.prepare(`
    SELECT id, name, display_name, slug, is_active, sort_order, product_count 
    FROM categories 
    ORDER BY id ASC
  `).all();

  console.log(`Loaded ${categories.length} categories from the database.`);

  const trueParents = [];
  const proposedChildren = [];
  const ambiguous = [];

  let childrenWithItemsAttached = 0;

  // 2. Classify each category
  for (const catB of categories) {
    const slugB = catB.slug;
    
    // Find all rows catA where catB's slug starts with catA's slug + '-'
    const candidates = [];
    for (const catA of categories) {
      if (catA.id !== catB.id && slugB.startsWith(catA.slug + '-')) {
        candidates.push(catA);
      }
    }

    if (candidates.length === 0) {
      // No parent candidates -> TRUE_PARENT
      trueParents.push({
        id: catB.id,
        name: catB.name,
        slug: catB.slug
      });
    } else {
      // Find the longest prefix candidate
      let maxLength = 0;
      candidates.forEach(c => {
        if (c.slug.length > maxLength) {
          maxLength = c.slug.length;
        }
      });

      const bestCandidates = candidates.filter(c => c.slug.length === maxLength);

      if (bestCandidates.length === 1) {
        const parent = bestCandidates[0];
        
        // Count products and listings pointing here
        const prodCountRes = await db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(catB.id);
        const listCountRes = await db.prepare('SELECT COUNT(*) as count FROM listings WHERE category_id = ?').get(catB.id);
        
        const productsCount = parseInt(prodCountRes.count, 10);
        const listingsCount = parseInt(listCountRes.count, 10);

        if (productsCount > 0 || listingsCount > 0) {
          childrenWithItemsAttached++;
        }

        proposedChildren.push({
          child_id: catB.id,
          child_name: catB.name,
          child_slug: catB.slug,
          proposed_parent_id: parent.id,
          proposed_parent_name: parent.name,
          products_pointing_here: productsCount,
          listings_pointing_here: listingsCount
        });
      } else {
        // Ambiguous match (multiple parents with equal prefix length)
        ambiguous.push({
          id: catB.id,
          slug: catB.slug,
          candidate_parent_ids: bestCandidates.map(c => c.id)
        });
      }
    }
  }

  // Ensure scripts/output directory exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const proposalPath = path.join(outputDir, 'category-hierarchy-proposal.json');

  const summary = {
    total_categories: categories.length,
    true_parent_count: trueParents.length,
    proposed_child_count: proposedChildren.length,
    ambiguous_count: ambiguous.length,
    children_with_products_or_listings_attached: childrenWithItemsAttached
  };

  const outputPayload = {
    generated_at: new Date().toISOString(),
    true_parents: trueParents,
    proposed_children: proposedChildren,
    ambiguous,
    summary
  };

  fs.writeFileSync(proposalPath, JSON.stringify(outputPayload, null, 2), 'utf8');

  // Human-readable console report
  console.log('\n=== TRUE PARENTS (Top-Level Categories) ===');
  trueParents.forEach(p => {
    console.log(`- ID: ${p.id} | Name: "${p.name}" | Slug: "${p.slug}"`);
  });

  console.log('\n=== PROPOSED CHILDREN (Subcategories) SAMPLE (First 15) ===');
  proposedChildren.slice(0, 15).forEach(c => {
    console.log(`- ID: ${c.child_id} "${c.child_name}" (Slug: "${c.child_slug}") -> Parent ID: ${c.proposed_parent_id} "${c.proposed_parent_name}" | Prods: ${c.products_pointing_here} | Listings: ${c.listings_pointing_here}`);
  });
  if (proposedChildren.length > 15) {
    console.log(`... and ${proposedChildren.length - 15} more children.`);
  }

  if (ambiguous.length > 0) {
    console.log('\n=== AMBIGUOUS CATEGORIES ===');
    ambiguous.forEach(a => {
      console.log(`- ID: ${a.id} | Slug: "${a.slug}" | Candidates: ${JSON.stringify(a.candidate_parent_ids)}`);
    });
  } else {
    console.log('\nNo ambiguous categories found.');
  }

  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));

  console.log(`\nProposal JSON written to: ${proposalPath}`);
  console.log('\n=== CATEGORY HIERARCHY MAPPING PROPOSAL END ===');

  process.exit(0);
}

runProposal().catch(err => {
  console.error('Fatal proposal error:', err);
  process.exit(1);
});
