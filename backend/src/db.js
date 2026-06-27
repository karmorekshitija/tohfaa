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
    .replace(/INSERT OR IGNORE INTO follows\b/gi, 'INSERT INTO follows')
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
    if (sql.toLowerCase().includes('follows')) {
      cleanSql += ' ON CONFLICT (follower_id, following_id) DO NOTHING';
    } else if (sql.toLowerCase().includes('store_config')) {
      cleanSql += ' ON CONFLICT (seller_id) DO NOTHING';
    } else if (sql.toLowerCase().includes('admin_users')) {
      cleanSql += ' ON CONFLICT (username) DO NOTHING';
    }
  }

  // Auto-append RETURNING id for INSERT queries if not already present
  const isInsert = cleanSql.trim().toUpperCase().startsWith('INSERT');
  if (isInsert && !cleanSql.toUpperCase().includes('RETURNING')) {
    if (cleanSql.toLowerCase().includes('store_config') || cleanSql.toLowerCase().includes('review_request_settings')) {
      cleanSql = cleanSql.trim() + ' RETURNING seller_id';
    } else if (cleanSql.toLowerCase().includes('follows') || cleanSql.toLowerCase().includes('daily_order_tracking')) {
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
    
    // Seed default categories if empty
    const catCheck = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      console.log('PostgreSQL: Seeding default categories...');
      const seedCats = [
        ['Textile Arts', 'textile-arts', 'Crochet, knitting, weaving & loom work', '🧶'],
        ['Jewellery', 'jewellery', 'Handcrafted rings, necklaces & bangles', '💍'],
        ['Ceramics & Pottery', 'ceramics-pottery', 'Wheel-thrown stoneware & hand-built clay', '🏺'],
        ['Journals & Stationery', 'journals-stationery', 'Notebooks, journals & hand-pressed cards', '📓'],
        ['Candles & Fragrance', 'candles-fragrance', 'Soy candles, incense & botanical wax', '🕯️'],
        ['Paintings', 'paintings', 'Original artwork & hand-illustrated prints', '🖼️'],
        ['Customized Gifts', 'customized-gifts', 'Personalised & bespoke handmade pieces', '🎁'],
        ['Home Decor', 'home-decor', 'Hand-carved, woven & crafted home objects', '🏡']
      ];
      for (const cat of seedCats) {
        await pool.query(
          'INSERT INTO categories (name, slug, description, icon_emoji, item_count) VALUES ($1, $2, $3, $4, 0)',
          cat
        );
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

    // Add whatsapp fields to sellers table if not exists
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT UNIQUE');
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_otp TEXT');
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_otp_expires_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_otp_count INTEGER DEFAULT 0');
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_otp_count_reset_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_pending_number TEXT');
    await pool.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS whatsapp_pending_action TEXT');

    // Add whatsapp fields to seller_profiles table if not exists
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_number TEXT UNIQUE');
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_otp TEXT');
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_otp_expires_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_otp_count INTEGER DEFAULT 0');
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_otp_count_reset_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_pending_number TEXT');
    await pool.query('ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS whatsapp_pending_action TEXT');

    // Create chat_logs table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id SERIAL PRIMARY KEY,
        buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        session_id TEXT NOT NULL,
        message TEXT NOT NULL,
        intent TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create problem_reports table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS problem_reports (
        id SERIAL PRIMARY KEY,
        buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        session_id TEXT NOT NULL,
        category TEXT,
        description TEXT NOT NULL,
        related_order_id TEXT,
        related_product_id TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create trending_searches table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_searches (
        query TEXT PRIMARY KEY,
        search_count INTEGER DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ─── Phase 2: Pause/Resume fields on products ──────────────────────────────
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS pause_reason TEXT');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS resume_estimate_date DATE');
    await pool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS remake_eligible BOOLEAN DEFAULT FALSE');

    // ─── Phase 2: remake_eligible on listings ──────────────────────────────────
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS remake_eligible BOOLEAN DEFAULT FALSE');
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE');
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS pause_reason TEXT');
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS resume_estimate_date DATE');

    // ─── Phase 1: Index for similar-products query ────────────────────────────
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_cat_status_stock ON products(category_id, status, stock_qty)');

    // ─── Phase 4: checkout_contention_attempts table ──────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkout_contention_attempts (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','won','lost')),
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await pool.query('ALTER TABLE checkout_contention_attempts ADD COLUMN IF NOT EXISTS address_id INTEGER');
    await pool.query('ALTER TABLE checkout_contention_attempts ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT');
    await pool.query('ALTER TABLE checkout_contention_attempts ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_cca_product_status ON checkout_contention_attempts(product_id, status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_cca_buyer ON checkout_contention_attempts(buyer_id)');

    // ─── Phase 4: Index on orders(buyer_id, status) for tiebreak query ────────
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON orders(buyer_id, status)');

    // Categories and Subcategories Overhaul
    await pool.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL');
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id          SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        slug        TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_subcategories (
        product_id     INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, subcategory_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS listing_subcategories (
        listing_id     INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
        PRIMARY KEY (listing_id, subcategory_id)
      )
    `);

    // Concierge Chat alterations
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP');
    await pool.query('ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_sender_role_check');
    await pool.query("ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_sender_role_check CHECK(sender_role IN ('buyer','seller','bot','bot_as_seller'))");
    await pool.query('ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_message_type_check');
    await pool.query("ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_message_type_check CHECK(message_type IN ('text','photo','system','order_draft_card','system_notice','product_inquiry'))");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS custom_orders (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        qty INTEGER NOT NULL DEFAULT 1,
        customization_specs JSONB DEFAULT '{}',
        reference_images TEXT[] DEFAULT '{}',
        draft_price INTEGER DEFAULT NULL,
        final_price INTEGER DEFAULT NULL,
        delivery_days INTEGER DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'pending_seller_review',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query('CREATE INDEX IF NOT EXISTS idx_conversations_seller_status ON conversations(seller_id, status)');

  } catch (err) {
    console.error('PostgreSQL: Initialization error:', err.message);
  }
}

// Start database initialization
initDb();

module.exports = db;
