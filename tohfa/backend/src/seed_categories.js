const db = require('./db');

const categoriesData = [
  {
    name: "Customized Gifts",
    slug: "customized-gifts",
    emoji_icon: "🎁",
    subcategories: [
      "Spotify Plaques", "Polaroid Sets", "Frames", "Name Lamps", "Keychains",
      "QR Code Gifts", "Personalized Bottles", "Name Plates", "Coasters",
      "Phone Covers", "Memory Books", "Scrapbooks", "Letters"
    ]
  },
  {
    name: "Jewellery",
    slug: "jewellery",
    emoji_icon: "💍",
    subcategories: [
      "Necklaces", "Pendants", "Earrings", "Rings", "Anklets", "Hair Accessories",
      "Resin Jewellery", "Beaded Jewellery", "Crochet Jewellery", "Personalized Jewellery",
      "Clay Jewellery", "Couple Jewellery"
    ]
  },
  {
    name: "Hampers",
    slug: "hampers",
    emoji_icon: "🧺",
    subcategories: [
      "Wedding Hampers", "Birthday Hampers", "Couple Hampers", "Anniversary Hampers",
      "Rakhi Hampers", "Diwali Hampers", "Holi Hampers", "Valentine Hampers",
      "Baby Shower Hampers", "Farewell Hampers", "Corporate Hampers", "Chocolate Hampers",
      "Sweet Hampers", "Anime Hampers", "Bridesmaid Hampers", "Groom Gang Hampers",
      "Skincare Hampers", "Period Comfort Hampers", "Friendship Hampers"
    ]
  },
  {
    name: "Wedding & Rituals",
    slug: "wedding-rituals",
    emoji_icon: "🔱",
    subcategories: [
      "Shagun Envelopes", "Wedding Hampers", "Mehendi Essentials", "Haldi Essentials",
      "Wedding Decor", "Return Gifts", "Wedding Nameplates"
    ]
  },
  {
    name: "Crochet",
    slug: "crochet",
    emoji_icon: "🧶",
    subcategories: [
      "Sunflowers", "Roses", "Flower Bouquets", "Other Flowers", "Bags",
      "Plushies", "Phone Cases", "Keychains"
    ]
  },
  {
    name: "Fabric Crafts",
    slug: "fabric-crafts",
    emoji_icon: "👜",
    subcategories: [
      "Tote Bags", "Knitted Items", "Embroidery"
    ]
  },
  {
    name: "Festivals",
    slug: "festivals",
    emoji_icon: "🎉",
    subcategories: [
      "Rakhi", "Diwali", "Navratri", "Holi", "Christmas", "Eid", "Karwa Chauth"
    ]
  },
  {
    name: "Couples",
    slug: "couples",
    emoji_icon: "👩‍❤️‍👨",
    subcategories: [
      "Hampers", "Customized Gifts", "Jewellery", "Portraits", "Scrapbooks & Memory Books",
      "Letters & Cards", "Flowers", "Lamps", "Keychains", "Home Decor", "Candles",
      "Proposal Gifts", "Anniversary Gifts", "Matching Accessories"
    ]
  },
  {
    name: "Home Decor",
    slug: "home-decor",
    emoji_icon: "🏡",
    subcategories: [
      "Candles", "Wall Art", "Clay Articles", "Resin Decor", "Name Boards",
      "Decorative Frames", "Planters"
    ]
  },
  {
    name: "Art & Portraits",
    slug: "art-portraits",
    emoji_icon: "🎨",
    subcategories: [
      "Digital Portraits", "Couple Portraits", "Family Portraits", "Pet Portraits",
      "Paintings", "Sketches", "Caricatures"
    ]
  }
];

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

async function run() {
  console.log("Starting Category Seeding...");
  
  // Wait a small bit to let PostgreSQL pool initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  for (let i = 0; i < categoriesData.length; i++) {
    const cat = categoriesData[i];
    console.log(`Processing Category: ${cat.name}`);
    
    // Check if category exists
    let catRow = await db.prepare('SELECT id FROM categories WHERE slug = ?').get(cat.slug);
    let categoryId;
    
    if (!catRow) {
      // Insert new category
      const desc = `${cat.name} handcrafted gifts and items.`;
      const result = await db.prepare(`
        INSERT INTO categories (name, display_name, slug, emoji_icon, icon_emoji, description, sort_order, is_active, item_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
      `).run(cat.name, cat.name, cat.slug, cat.emoji_icon, cat.emoji_icon, desc, i * 10);
      
      categoryId = result.lastInsertRowid;
      console.log(`-> Inserted new Category: ${cat.name} with ID: ${categoryId}`);
    } else {
      categoryId = catRow.id;
      console.log(`-> Category exists with ID: ${categoryId}`);
    }
    
    // Process subcategories
    for (const subName of cat.subcategories) {
      const subSlugBase = slugify(subName);
      const subSlug = `${cat.slug}-${subSlugBase}`;
      
      // Check if subcategory exists
      let subRow = await db.prepare('SELECT id FROM subcategories WHERE slug = ?').get(subSlug);
      
      if (!subRow) {
        // Insert new subcategory
        const subDesc = `Handmade ${subName} under ${cat.name}.`;
        const subResult = await db.prepare(`
          INSERT INTO subcategories (category_id, name, slug, description)
          VALUES (?, ?, ?, ?)
        `).run(categoryId, subName, subSlug, subDesc);
        
        console.log(`   + Inserted Subcategory: ${subName} (slug: ${subSlug})`);
      } else {
        // Update category association if it changed
        await db.prepare('UPDATE subcategories SET category_id = ? WHERE id = ?').run(categoryId, subRow.id);
        console.log(`   = Subcategory exists: ${subName} (ID: ${subRow.id})`);
      }
    }
  }
  
  console.log("Category Seeding completed successfully!");
  process.exit(0);
}

run().catch(err => {
  console.error("Error in Category Seeding:", err);
  process.exit(1);
});
