require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { AsyncLocalStorage } = require('async_hooks');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const dbStorage = new AsyncLocalStorage();

const getQueryExecutor = () => {
  const activeClient = dbStorage.getStore();
  return activeClient || pool;
};

// SQL Dialect Translator
function translateSql(sql) {
  if (!sql) return '';
  
  let cleanSql = sql
    // Replace datetime('now')
    .replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP')
    // Replace datetime('now', '-X days/hours')
    .replace(/datetime\('now',\s*'-(\d+)\s+days?'\)/gi, "CURRENT_TIMESTAMP - INTERVAL '$1 days'")
    .replace(/datetime\('now',\s*'-(\d+)\s+hours?'\)/gi, "CURRENT_TIMESTAMP - INTERVAL '$1 hours'")
    // Replace date('now', '-X days/hours')
    .replace(/date\('now',\s*'-(\d+)\s+days?'\)/gi, "(CURRENT_DATE - INTERVAL '$1 days')")
    .replace(/date\('now',\s*'-(\d+)\s+hours?'\)/gi, "(CURRENT_DATE - INTERVAL '$1 hours')")
    // Replace date('now')
    .replace(/date\('now'\)/gi, "CURRENT_DATE")
    // Replace date(...) when it is not 'now'
    .replace(/date\((?!'now')([^)]+)\)/gi, "CAST($1 AS date)")
    // Replace INSERT OR IGNORE for specific tables
    .replace(/INSERT OR IGNORE INTO reel_product_links\b/gi, 'INSERT INTO reel_product_links')
    .replace(/INSERT OR IGNORE INTO follows\b/gi, 'INSERT INTO follows')
    .replace(/INSERT OR IGNORE INTO reel_listing_links\b/gi, 'INSERT INTO reel_listing_links')
    .replace(/INSERT OR IGNORE INTO store_config\b/gi, 'INSERT INTO store_config')
    .replace(/INSERT OR IGNORE INTO admin_users\b/gi, 'INSERT INTO admin_users')
    // Replace INSERT OR REPLACE INTO zai_mode_state
    .replace(/INSERT OR REPLACE INTO zai_mode_state\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, cols, vals) => {
       return `INSERT INTO zai_mode_state (${cols}) VALUES (${vals}) ON CONFLICT (seller_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = EXCLUDED.updated_at`;
    })
    // Replace INSERT OR REPLACE INTO sponsored_products
    .replace(/INSERT OR REPLACE INTO sponsored_products\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi, (match, cols, vals) => {
       return `INSERT INTO sponsored_products (${cols}) VALUES (${vals}) ON CONFLICT (product_id) DO UPDATE SET is_sponsored = EXCLUDED.is_sponsored, sponsored_at = EXCLUDED.sponsored_at, sponsored_by = EXCLUDED.sponsored_by, updated_at = EXCLUDED.updated_at`;
    })
    // Replace strftime
    .replace(/strftime\('%Y',\s*([^)]+)\)/gi, "TO_CHAR($1, 'YYYY')")
    // Replace LIKE with ILIKE for case-insensitive search
    .replace(/\bLIKE\b/g, 'ILIKE');

  // ON CONFLICT DO NOTHING for INSERT OR IGNORE
  if (sql.toUpperCase().includes('INSERT OR IGNORE')) {
    if (sql.toLowerCase().includes('reel_product_links')) {
      cleanSql += ' ON CONFLICT (reel_id, product_id) DO NOTHING';
    } else if (sql.toLowerCase().includes('follows')) {
      cleanSql += ' ON CONFLICT (follower_id, following_id) DO NOTHING';
    } else if (sql.toLowerCase().includes('reel_listing_links')) {
      cleanSql += ' ON CONFLICT (reel_id, listing_id) DO NOTHING';
    } else if (sql.toLowerCase().includes('store_config')) {
      cleanSql += ' ON CONFLICT (seller_id) DO NOTHING';
    } else if (sql.toLowerCase().includes('admin_users')) {
      cleanSql += ' ON CONFLICT (username) DO NOTHING';
    }
  }

  // Auto-append RETURNING id for INSERT queries if not already present
  const isInsert = cleanSql.trim().toUpperCase().startsWith('INSERT');
  if (isInsert && !cleanSql.toUpperCase().includes('RETURNING')) {
    if (cleanSql.toLowerCase().includes('store_config')) {
      cleanSql = cleanSql.trim() + ' RETURNING seller_id';
    } else if (cleanSql.toLowerCase().includes('follows') || cleanSql.toLowerCase().includes('reel_listing_links') || cleanSql.toLowerCase().includes('reel_product_links')) {
      // No single auto-increment id column
    } else {
      cleanSql = cleanSql.trim() + ' RETURNING id';
    }
  }

  // Convert ? to $1, $2, $3, etc.
  let index = 1;
  cleanSql = cleanSql.replace(/\?/g, () => `$${index++}`);

  return cleanSql;
}

function formatSqliteDateTime(date) {
  const pad = (num) => String(num).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

function convertDatesToStrings(obj) {
  if (!obj) return obj;
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToStrings);
  }
  if (obj instanceof Date) {
    return formatSqliteDateTime(obj);
  }
  if (typeof obj === 'object') {
    const newObj = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = convertDatesToStrings(obj[key]);
    }
    return newObj;
  }
  return obj;
}

const db = {
  prepare: (sql) => {
    const pgSql = translateSql(sql);
    let pluckEnabled = false;
    const stmt = {
      pluck: (enabled = true) => {
        pluckEnabled = enabled;
        return stmt;
      },
      get: (...args) => {
        const executor = getQueryExecutor();
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const promise = executor.query(pgSql, flatArgs).then(res => {
          const row = convertDatesToStrings(res.rows[0]) || null;
          if (row && pluckEnabled) {
            const keys = Object.keys(row);
            return keys.length > 0 ? row[keys[0]] : null;
          }
          return row;
        });
        return new Proxy(promise, {
          get(target, prop, receiver) {
            if (prop in target) {
              const val = Reflect.get(target, prop, receiver);
              return typeof val === 'function' ? val.bind(target) : val;
            }
            return promise.then(row => row ? row[prop] : undefined);
          }
        });
      },
      all: (...args) => {
        const executor = getQueryExecutor();
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const promise = executor.query(pgSql, flatArgs).then(res => {
          const rows = convertDatesToStrings(res.rows) || [];
          if (pluckEnabled) {
            return rows.map(row => {
              if (!row) return null;
              const keys = Object.keys(row);
              return keys.length > 0 ? row[keys[0]] : null;
            });
          }
          return rows;
        });
        return new Proxy(promise, {
          get(target, prop, receiver) {
            if (prop in target) {
              const val = Reflect.get(target, prop, receiver);
              return typeof val === 'function' ? val.bind(target) : val;
            }
            const arrayMethods = ['map', 'filter', 'some', 'every', 'find', 'findIndex', 'forEach', 'reduce', 'slice', 'splice', 'push', 'pop', 'shift', 'unshift', 'sort', 'reverse', 'join', 'concat', 'includes', 'indexOf', 'lastIndexOf'];
            if (arrayMethods.includes(prop)) {
              return (...methodArgs) => promise.then(rows => {
                const arrayMethod = rows[prop];
                if (typeof arrayMethod === 'function') {
                  return arrayMethod.apply(rows, methodArgs);
                }
                return undefined;
              });
            }
            return promise.then(rows => rows ? rows[prop] : undefined);
          }
        });
      },
      run: async (...args) => {
        const executor = getQueryExecutor();
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await executor.query(pgSql, flatArgs);
        return {
          changes: res.rowCount,
          lastInsertRowid: res.rows[0]?.id || null
        };
      }
    };
    return stmt;
  },
  exec: async (sql) => {
    try {
      const executor = getQueryExecutor();
      return await executor.query(sql);
    } catch (err) {
      console.log(`db.exec ignored error: ${err.message}`);
    }
  },
  transaction: (fn) => {
    return async (...args) => {
      const existingClient = dbStorage.getStore();
      if (existingClient) {
        return await fn(...args);
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await dbStorage.run(client, async () => {
          return await fn(...args);
        });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    };
  },
  pragma: () => {
    // Stub for SQLite pragmas
  }
};

// Database Initialization
async function initDb() {
  try {
    // Check if users table exists
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const tableExists = res.rows[0]?.exists;
    if (!tableExists) {
      console.log('PostgreSQL: Initializing schemas from schema_postgres.sql...');
      const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'schema_postgres.sql'), 'utf8');
      
      // Split schema queries by ;\n or ;\r\n
      const statements = schemaSql.split(/;\r?\n/);
      for (let stmt of statements) {
        stmt = stmt.trim();
        if (stmt) {
          await pool.query(stmt);
        }
      }
      console.log('PostgreSQL: Schema initialization complete!');
    } else {
      console.log('PostgreSQL: Database tables already exist.');
    }
    
    // Ensure parent_id exists and unique name constraint is dropped
    await pool.query('ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key');
    await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE');

    // Seed default categories if empty
    const catCheck = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      console.log('PostgreSQL: Seeding default categories and subcategories...');
      const seeds = [
        {
          name: 'Customized Gifts', icon: '🎁', description: 'Personalised & bespoke handmade pieces',
          subs: ['Spotify Plaques', 'Polaroid Sets', 'Frames', 'Name Lamps', 'Keychains', 'QR Code Gifts', 'Personalized Bottles', 'Name Plates', 'Coasters', 'Phone Covers', 'Memory Books', 'Scrapbooks', 'Letters']
        },
        {
          name: 'Jewellery', icon: '💍', description: 'Handcrafted rings, necklaces & bangles',
          subs: ['Necklaces', 'Pendants', 'Earrings', 'Rings', 'Anklets', 'Hair Accessories', 'Resin Jewellery', 'Beaded Jewellery', 'Crochet Jewellery', 'Personalized Jewellery', 'Clay Jewellery', 'Couple Jewellery']
        },
        {
          name: 'Hampers', icon: '🧺', description: 'Curated gift hampers for all occasions',
          subs: ['Wedding Hampers', 'Birthday Hampers', 'Couple Hampers', 'Anniversary Hampers', 'Rakhi Hampers', 'Diwali Hampers', 'Holi Hampers', 'Valentine Hampers', 'Baby Shower Hampers', 'Farewell Hampers', 'Corporate Hampers', 'Chocolate Hampers', 'Sweet Hampers', 'Anime Hampers', 'Bridesmaid Hampers', 'Groom Gang Hampers', 'Skincare Hampers', 'Period Comfort Hampers', 'Friendship Hampers']
        },
        {
          name: 'Wedding & Rituals', icon: '✨', description: 'Essentials and hampers for weddings and rituals',
          subs: ['Shagun Envelopes', 'Wedding Hampers', 'Mehendi Essentials', 'Haldi Essentials', 'Wedding Decor', 'Return Gifts', 'Wedding Nameplates']
        },
        {
          name: 'Crochet', icon: '🧶', description: 'Beautiful handcrafted crochet items',
          subs: ['Sunflowers', 'Roses', 'Flower Bouquets', 'Other Flowers', 'Bags', 'Plushies', 'Phone Cases', 'Keychains']
        },
        {
          name: 'Fabric Crafts', icon: '🧵', description: 'Tote bags, embroidery, and knitted items',
          subs: ['Tote Bags', 'Knitted Items', 'Embroidery']
        },
        {
          name: 'Festivals', icon: '🎉', description: 'Festival gifts and decorations',
          subs: ['Rakhi', 'Diwali', 'Navratri', 'Holi', 'Christmas', 'Eid', 'Karwa Chauth']
        },
        {
          name: 'Couples', icon: '💖', description: 'Gifts and accessories for couples',
          subs: ['Hampers', 'Customized Gifts', 'Jewellery', 'Portraits', 'Scrapbooks & Memory Books', 'Letters & Cards', 'Flowers', 'Lamps', 'Keychains', 'Home Decor', 'Candles', 'Proposal Gifts', 'Anniversary Gifts', 'Matching Accessories']
        },
        {
          name: 'Home Decor', icon: '🏡', description: 'Handmade decor items for home',
          subs: ['Candles', 'Wall Art', 'Clay Articles', 'Resin Decor', 'Name Boards', 'Decorative Frames', 'Planters']
        },
        {
          name: 'Art & Portraits', icon: '🖼️', description: 'Paintings, sketches, and digital portraits',
          subs: ['Digital Portraits', 'Couple Portraits', 'Family Portraits', 'Pet Portraits', 'Paintings', 'Sketches', 'Caricatures']
        }
      ];

      let sortOrder = 1;
      for (const item of seeds) {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const res = await pool.query(
          `INSERT INTO categories (name, display_name, slug, description, emoji_icon, icon_emoji, sort_order, is_active, product_count)
           VALUES ($1, $1, $2, $3, $4, $4, $5, 1, 0) RETURNING id`,
          [item.name, slug, item.description, item.icon, sortOrder++]
        );
        const parentId = res.rows[0].id;
        
        let subSortOrder = 1;
        for (const sub of item.subs) {
          const subSlug = `${slug}-${sub.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
          await pool.query(
            `INSERT INTO categories (name, display_name, slug, description, emoji_icon, icon_emoji, sort_order, is_active, product_count, parent_id)
             VALUES ($1, $1, $2, $3, '🏷️', '🏷️', $4, 1, 0, $5)`,
            [sub, subSlug, `${sub} subcategory of ${item.name}`, subSortOrder++, parentId]
          );
        }
      }
    }

    // Seed default admin users if empty
    const adminCheck = await pool.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminCheck.rows[0].count) === 0) {
      console.log('PostgreSQL: Seeding default admin users...');
      await pool.query(`
        INSERT INTO admin_users (username, email, password_hash, display_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin', 'admin@tohfa.in', '$2b$10$CnAUCQOxmhfKawrSsoEVzOvCUZgTLtNilYIFo.K8dJwfrfV8Uk5Ue', 'Tohfa Admin', 'super_admin']);
      
      await pool.query(`
        INSERT INTO admin_users (username, email, password_hash, display_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin_test', 'admin_test@test.com', '$2b$10$U7GcNaYTwYCjRMDTI7zry.HggpIuapr2ngadFYHnh1iucqbTTlIb2', 'Test Admin', 'super_admin']);
    }

    // Seed default UI settings slots if empty
    const uiCheck = await pool.query('SELECT COUNT(*) FROM ui_settings');
    if (parseInt(uiCheck.rows[0].count) === 0) {
      console.log('PostgreSQL: Seeding default UI settings slots...');
      const seedSlots = [
        ['home_hero_primary', 'hero_image', 'Hero Primary Banner', 'Primary background image for buyer home page hero.'],
        ['home_hero_secondary', 'hero_image', 'Hero Secondary Banner', 'Overlay or secondary image for buyer home page hero.'],
        ['home_seasonal_banner', 'banner', 'Home Seasonal Banner', 'Active seasonal highlight banner on homepage.'],
        ['home_featured_product_1', 'featured_product_id', 'Featured Product 1', 'Featured product slot 1.'],
        ['home_featured_product_2', 'featured_product_id', 'Featured Product 2', 'Featured product slot 2.'],
        ['home_featured_product_3', 'featured_product_id', 'Featured Product 3', 'Featured product slot 3.'],
        ['home_featured_product_4', 'featured_product_id', 'Featured Product 4', 'Featured product slot 4.'],
        ['home_featured_product_5', 'featured_product_id', 'Featured Product 5', 'Featured product slot 5.'],
        ['home_featured_product_6', 'featured_product_id', 'Featured Product 6', 'Featured product slot 6.'],
        ['home_category_spotlight_1', 'category_override', 'Category Spotlight 1', 'Category Highlight 1.'],
        ['home_category_spotlight_2', 'category_override', 'Category Spotlight 2', 'Category Highlight 2.'],
        ['home_category_spotlight_3', 'category_override', 'Category Spotlight 3', 'Category Highlight 3.'],
        ['home_category_spotlight_4', 'category_override', 'Category Spotlight 4', 'Category Highlight 4.'],
        ['rakhi_banner', 'banner', 'Rakhi Banner (Preset)', 'Seasonal preset for Raksha Bandhan.'],
        ['diwali_banner', 'banner', 'Diwali Banner (Preset)', 'Seasonal preset for Diwali festival.'],
        ['christmas_banner', 'banner', 'Christmas Banner (Preset)', 'Seasonal preset for Christmas.']
      ];
      for (const slot of seedSlots) {
        await pool.query(
          'INSERT INTO ui_settings (slot_name, slot_type, label, description) VALUES ($1, $2, $3, $4)',
          slot
        );
      }
    }

    // Add bank_name to seller_payout_accounts if not exists
    await pool.query('ALTER TABLE seller_payout_accounts ADD COLUMN IF NOT EXISTS bank_name TEXT');

    // Create sub_orders table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sub_orders (
        id SERIAL PRIMARY KEY,
        parent_order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subtotal_paise INTEGER NOT NULL,
        platform_commission_paise INTEGER NOT NULL DEFAULT 0,
        seller_payout_paise INTEGER NOT NULL,
        delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending', 'packed', 'shipped', 'delivered', 'cancelled')),
        tracking_number TEXT DEFAULT NULL,
        courier_name TEXT DEFAULT NULL,
        estimated_delivery TEXT DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add sub_order_id to order_items if not exists
    await pool.query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS sub_order_id INTEGER REFERENCES sub_orders(id) ON DELETE CASCADE');

    // Create seller_settlements table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seller_settlements (
        id SERIAL PRIMARY KEY,
        seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sub_order_id INTEGER REFERENCES sub_orders(id) ON DELETE CASCADE,
        amount_paise INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
        settled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create product_bans table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_bans (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        banned_by INTEGER NOT NULL REFERENCES admin_users(id),
        ban_reason TEXT NOT NULL,
        banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        unbanned_at TIMESTAMP WITH TIME ZONE,
        unbanned_by INTEGER REFERENCES admin_users(id)
      )
    `);

    // Create product_bans index
    await pool.query('CREATE INDEX IF NOT EXISTS idx_product_bans_product_id ON product_bans(product_id)');
  } catch (err) {
    console.error('PostgreSQL: Initialization error:', err.message);
  }
}

// Start database initialization
initDb();

module.exports = db;
