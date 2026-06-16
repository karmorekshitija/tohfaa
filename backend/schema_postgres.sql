CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer','seller','admin')),
      avatar_url TEXT DEFAULT NULL,
      is_active INTEGER DEFAULT 1,
      is_banned INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    , display_name TEXT, bio TEXT, location TEXT, ships_in_days INTEGER DEFAULT 3, instagram_handle TEXT, phone TEXT);

CREATE TABLE refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE seller_profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      shop_name TEXT NOT NULL,
      shop_bio TEXT DEFAULT NULL,
      ships_in_days INTEGER DEFAULT 7,
      instagram_handle TEXT DEFAULT NULL,
      is_approved INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    , display_name TEXT, handle TEXT, bio TEXT, location TEXT, website TEXT, artisan_story TEXT, avatar_url TEXT, store_slug TEXT, platform_fee_pct INTEGER DEFAULT 8, is_accepting_orders INTEGER DEFAULT 1, zai_mode_enabled INTEGER DEFAULT 0, default_language TEXT DEFAULT 'en', store_currency TEXT DEFAULT 'INR', onboarding_step INTEGER DEFAULT 0, seller_rank TEXT, total_reviews INTEGER DEFAULT 0, avg_rating REAL DEFAULT 0.0, total_sales INTEGER DEFAULT 0, weekly_production_capacity INTEGER DEFAULT NULL, daily_order_limit INTEGER DEFAULT NULL);

CREATE TABLE password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE categories (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      slug        TEXT NOT NULL UNIQUE,
      description TEXT,
      icon_emoji  TEXT,
      item_count  INTEGER DEFAULT 0,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    , display_name TEXT, emoji_icon TEXT DEFAULT '🏷️', sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, product_count INTEGER DEFAULT 0, updated_at TIMESTAMP WITH TIME ZONE, icon_url TEXT DEFAULT NULL, banner_image_url TEXT DEFAULT NULL);

CREATE TABLE products (
      id              SERIAL PRIMARY KEY,
      seller_id       INTEGER NOT NULL REFERENCES users(id),
      category_id     INTEGER REFERENCES categories(id),
      name            TEXT NOT NULL,
      description     TEXT,
      price_paise     INTEGER NOT NULL,
      stock_qty       INTEGER DEFAULT 0,
      ships_in_days   INTEGER DEFAULT 3,
      status          TEXT DEFAULT 'active',
      avg_rating      REAL DEFAULT 0,
      review_count    INTEGER DEFAULT 0,
      created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    , ready_to_ship INTEGER DEFAULT 0, discount_percentage INTEGER DEFAULT NULL, discounted_price INTEGER DEFAULT NULL, discount_active INTEGER DEFAULT 0, is_best_seller INTEGER DEFAULT 0);

CREATE TABLE product_images (
      id          SERIAL PRIMARY KEY,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      url         TEXT NOT NULL,
      is_primary  INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0
    );

CREATE TABLE cart_items (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity    INTEGER NOT NULL DEFAULT 1,
      added_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );

CREATE TABLE addresses (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name     TEXT NOT NULL,
      line1         TEXT NOT NULL,
      line2         TEXT,
      city          TEXT NOT NULL,
      state         TEXT NOT NULL,
      pincode       TEXT NOT NULL,
      phone         TEXT,
      tag           TEXT,
      is_default    INTEGER DEFAULT 0,
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE wishlists (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      added_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    );

CREATE TABLE follows (
      id           SERIAL PRIMARY KEY,
      follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      followed_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id)
    );

CREATE TABLE notifications (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      message    TEXT NOT NULL,
      icon       TEXT DEFAULT 'notifications',
      link_url   TEXT,
      is_read    INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    , conversation_id INTEGER, offer_id INTEGER, order_code TEXT);

CREATE TABLE seller_announcements (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      icon        TEXT DEFAULT 'local_florist',
      is_active   INTEGER DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      display_name TEXT NOT NULL DEFAULT 'Tohfa Admin',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE audit_logs (
      id SERIAL PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor_id INTEGER NOT NULL,
      actor_name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      target_label TEXT,
      before_json TEXT,
      after_json TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE sponsored_products (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
      is_sponsored INTEGER NOT NULL DEFAULT 0,
      sponsored_at TEXT,
      sponsored_by INTEGER REFERENCES admin_users(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE order_flags (
      id SERIAL PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      flag_type TEXT NOT NULL DEFAULT 'refund_review',
      flagged_by INTEGER NOT NULL REFERENCES admin_users(id),
      flagged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      notes TEXT
    );

CREATE TABLE payment_health_logs (
      id SERIAL PRIMARY KEY,
      check_type TEXT NOT NULL DEFAULT 'auto',
      status TEXT NOT NULL,
      api_response_ms INTEGER,
      webhook_status TEXT,
      last_webhook_at TEXT,
      last_txn_id TEXT,
      last_txn_status TEXT,
      region TEXT DEFAULT 'India (South)',
      raw_payload TEXT,
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE seller_bans (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      banned_by INTEGER NOT NULL REFERENCES admin_users(id),
      ban_reason TEXT NOT NULL,
      banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      unbanned_at TIMESTAMP WITH TIME ZONE,
      unbanned_by INTEGER REFERENCES admin_users(id)
    );

CREATE TABLE listings (
      id                    SERIAL PRIMARY KEY,
      seller_id             INTEGER  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title                 TEXT     NOT NULL,
      primary_name          TEXT     DEFAULT NULL,
      primary_medium        TEXT     DEFAULT NULL,
      description           TEXT     DEFAULT NULL,
      story                 TEXT     DEFAULT NULL,
      base_price            INTEGER  NOT NULL DEFAULT 0,   -- in paise
      price_paise           INTEGER  NOT NULL DEFAULT 0,   -- in paise, compatibility
      listing_type          TEXT     NOT NULL DEFAULT 'pre-made' CHECK(listing_type IN ('pre-made','custom')),
      status                TEXT     NOT NULL DEFAULT 'draft' CHECK(status IN ('active','paused','draft','deleted')),
      ships_in_days         INTEGER  NOT NULL DEFAULT 3,
      dispatch_sla_days     INTEGER  NOT NULL DEFAULT 1,
      daily_max_slots       INTEGER  DEFAULT NULL,
      weekly_cap            INTEGER  DEFAULT NULL,
      monthly_ceiling       INTEGER  DEFAULT NULL,
      allow_prebooking      INTEGER  DEFAULT 0,
      prebooking_window     TEXT     DEFAULT NULL,
      min_order_qty         INTEGER  DEFAULT 1,
      max_order_qty         INTEGER  DEFAULT NULL,
      weight_g              INTEGER  DEFAULT NULL,
      weight_grams          INTEGER  DEFAULT NULL,
      length_cm             REAL     DEFAULT NULL,
      width_cm              REAL     DEFAULT NULL,
      height_cm             REAL     DEFAULT NULL,
      shipping_method       TEXT     DEFAULT 'courier' CHECK(shipping_method IN ('courier','local','pickup')),
      packaging_type        TEXT     DEFAULT 'standard' CHECK(packaging_type IN ('standard','branded','eco','fragile')),
      return_policy         TEXT     DEFAULT 'no-returns' CHECK(return_policy IN ('no-returns','7-day','15-day')),
      is_eco_friendly       INTEGER  DEFAULT 0,
      festive_tags          TEXT     DEFAULT NULL,   -- JSON array of strings e.g. '["Diwali","Wedding"]'
      category              TEXT     DEFAULT NULL,
      tags                  TEXT     DEFAULT NULL,
      badges                TEXT     DEFAULT NULL,
      published_at          TEXT     DEFAULT NULL,
      stock_count           INTEGER  NOT NULL DEFAULT 0,
      sku                   TEXT     DEFAULT NULL,
      processing_time       TEXT     DEFAULT NULL,
      gift_wrap_available   INTEGER  DEFAULT 0,
      gift_wrap_price_paise INTEGER  DEFAULT 0,
      handwritten_note      INTEGER  DEFAULT 0,
      shipping_profile_id   INTEGER  DEFAULT NULL,
      listing_score         INTEGER  DEFAULT 0,
      view_count            INTEGER  DEFAULT 0,
      sale_count            INTEGER  DEFAULT 0,
      cover_photo_url       TEXT     DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE     DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE     DEFAULT CURRENT_TIMESTAMP
    , customization_config TEXT DEFAULT NULL, product_tag TEXT DEFAULT NULL, daily_product_cap INTEGER DEFAULT NULL, pickup_address_type TEXT DEFAULT NULL, carrier_preference TEXT DEFAULT NULL, compare_price REAL DEFAULT NULL, compare_at_price REAL DEFAULT NULL, discount_percentage INTEGER DEFAULT NULL, discounted_price INTEGER DEFAULT NULL, discount_active INTEGER DEFAULT 0);

CREATE TABLE listing_variants (
      id            SERIAL PRIMARY KEY,
      listing_id    INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      variant_name  TEXT    NOT NULL,   -- e.g. "Crimson Red", "Medium 10x10"
      price_paise   INTEGER DEFAULT NULL,   -- if NULL, inherits listing.base_price
      stock_count   INTEGER NOT NULL DEFAULT 0,
      sku           TEXT    DEFAULT NULL,
      material_cost INTEGER DEFAULT 0,   -- in paise
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE review_request_settings (
      seller_id           INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled             INTEGER NOT NULL DEFAULT 1,   -- send automated requests
      delay_days_after_del INTEGER NOT NULL DEFAULT 3,
      custom_subject      TEXT    DEFAULT NULL,
      custom_message      TEXT    DEFAULT NULL,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE store_workspace_photos (
      id          SERIAL PRIMARY KEY,
      seller_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      photo_url   TEXT    NOT NULL,
      caption     TEXT    DEFAULT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE orders (
      id                  SERIAL PRIMARY KEY,
      order_ref           TEXT     NOT NULL UNIQUE,   -- e.g. TF-0042
      buyer_id            INTEGER  NOT NULL REFERENCES users(id),
      seller_id           INTEGER  REFERENCES users(id),
      listing_id          INTEGER  REFERENCES listings(id),
      variant_id          INTEGER  DEFAULT NULL REFERENCES listing_variants(id),
      quantity            INTEGER  NOT NULL DEFAULT 1,
      unit_price          INTEGER,   -- in paise, price at time of order
      total_amount        INTEGER,   -- in paise
      platform_fee        INTEGER,   -- 8% in paise
      seller_payout       INTEGER,   -- total_amount - platform_fee
      order_type          TEXT     NOT NULL DEFAULT 'pre-made' CHECK(order_type IN ('pre-made','custom')),
      status              TEXT     NOT NULL DEFAULT 'awaiting_payment'
                                   CHECK(status IN (
                                     'awaiting_payment','processing','in_production',
                                     'packed','dispatched','delivered','cancelled','rto',
                                     'Awaiting Payment','Processing','Dispatched','Delivered','Cancelled',
                                     'in_transit','on_hold'
                                   )),
      payment_status      TEXT     NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','refunded')),
      customization       TEXT     DEFAULT NULL,   -- JSON blob of custom instructions
      tracking_id         TEXT     DEFAULT NULL,
      courier             TEXT     DEFAULT NULL,
      deadline_at         TEXT     DEFAULT NULL,
      dispatched_at       TEXT     DEFAULT NULL,
      delivered_at        TEXT     DEFAULT NULL,
      cancel_reason       TEXT     DEFAULT NULL,
      cancelled_at        TEXT     DEFAULT NULL,
      studio_notes        TEXT     DEFAULT NULL,   -- JSON array of note objects {ts, text}
      total_paise         INTEGER  DEFAULT 0,
      subtotal_paise      INTEGER  DEFAULT 0,
      shipping_paise      INTEGER  DEFAULT 0,
      address_id          INTEGER  DEFAULT NULL,
      razorpay_order_id   TEXT     DEFAULT NULL,
      razorpay_payment_id TEXT     DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE     DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE     DEFAULT CURRENT_TIMESTAMP
    , conversation_id INTEGER, offer_id INTEGER, product_name TEXT, customization_summary TEXT, amount_paid INTEGER, delivery_date TEXT, tracking_url TEXT);

CREATE TABLE message_threads (
        id          SERIAL PRIMARY KEY,
        seller_id   INTEGER NOT NULL REFERENCES users(id),
        buyer_id    INTEGER NOT NULL REFERENCES users(id),
        order_id    INTEGER DEFAULT NULL REFERENCES orders(id),
        last_msg_at TEXT    DEFAULT CURRENT_TIMESTAMP,
        has_unread  INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE messages (
        id          SERIAL PRIMARY KEY,
        thread_id   INTEGER NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
        sender_id   INTEGER NOT NULL REFERENCES users(id),
        body        TEXT    NOT NULL,
        is_quick_reply INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
      );

CREATE TABLE payout_history (
      id              SERIAL PRIMARY KEY,
      seller_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      txn_ref         TEXT    NOT NULL UNIQUE,   -- e.g. TXN-10042
      amount_paise    INTEGER NOT NULL,
      status          TEXT    NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','settled','completed','failed')),
      payout_method   TEXT    NOT NULL DEFAULT 'bank_transfer',
      scheduled_at    TEXT    DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE listing_images (
      id          SERIAL PRIMARY KEY,
      listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      image_url   TEXT    NOT NULL,
      is_cover    INTEGER NOT NULL DEFAULT 0,   -- 1 = main cover photo
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE listing_photos (
      id          SERIAL PRIMARY KEY,
      listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      url         TEXT    NOT NULL,
      is_cover    INTEGER DEFAULT 0,
      is_video    INTEGER DEFAULT 0,
      sort_order  INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE seller_team_members (
      id         SERIAL PRIMARY KEY,
      seller_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      role       TEXT    NOT NULL CHECK(role IN ('owner','admin','editor','viewer')),
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE zai_mode_state (
      seller_id  INTEGER PRIMARY KEY REFERENCES seller_profiles(id) ON DELETE CASCADE,
      enabled    INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE inventory_materials (
      id             SERIAL PRIMARY KEY,
      seller_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      material_name  TEXT    NOT NULL,   -- e.g. "Merino Wool (Mustard)", "10\" Clay Pot"
      quantity_g_pcs REAL    NOT NULL DEFAULT 0.0,   -- weight in grams or piece count
      unit           TEXT    NOT NULL CHECK(unit IN ('grams','pcs')),
      cost_per_unit  INTEGER NOT NULL DEFAULT 0,   -- in paise
      low_stock_threshold REAL DEFAULT 0.0,
      stock_qty      REAL    DEFAULT 0.0,
      min_threshold  REAL    DEFAULT 0.0,
      supplier_name  TEXT    DEFAULT NULL,
      supplier_phone TEXT    DEFAULT NULL,
      last_restocked TEXT    DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE store_config (
      seller_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      accept_orders     INTEGER NOT NULL DEFAULT 1,
      vacation_mode     INTEGER NOT NULL DEFAULT 0,
      vacation_note     TEXT    DEFAULT NULL,
      estimated_dispatch_sla_days INTEGER NOT NULL DEFAULT 2,
      packaging_fee_paise INTEGER NOT NULL DEFAULT 0,
      wrap_fee_paise      INTEGER NOT NULL DEFAULT 0,
      zai_mode_enabled  INTEGER NOT NULL DEFAULT 0,
      banner_url        TEXT    DEFAULT NULL,
      about_headline    TEXT    DEFAULT NULL,
      artisan_story     TEXT    DEFAULT NULL,
      current_balance_paise INTEGER NOT NULL DEFAULT 0,   -- updated on payouts or completed sales
      tagline           TEXT    DEFAULT NULL,
      artist_bio        TEXT    DEFAULT NULL,
      whatsapp_business TEXT    DEFAULT NULL,
      city              TEXT    DEFAULT NULL,
      specializations   TEXT    DEFAULT NULL,   -- JSON array of strings
      bank_account_holder TEXT  DEFAULT NULL,
      bank_name         TEXT    DEFAULT NULL,
      bank_account_number TEXT  DEFAULT NULL,
      gstin             TEXT    DEFAULT NULL,
      gstin_verified    INTEGER DEFAULT 0,
      notif_new_order_email   INTEGER DEFAULT 1,
      notif_new_order_wa      INTEGER DEFAULT 1,
      notif_new_order_inapp   INTEGER DEFAULT 1,
      notif_cancelled_email   INTEGER DEFAULT 1,
      notif_cancelled_wa      INTEGER DEFAULT 1,
      notif_cancelled_inapp   INTEGER DEFAULT 1,
      notif_stock_warn_email  INTEGER DEFAULT 1,
      notif_stock_warn_wa     INTEGER DEFAULT 1,
      notif_stock_warn_inapp  INTEGER DEFAULT 1,
      notif_payout_email      INTEGER DEFAULT 1,
      notif_payout_wa         INTEGER DEFAULT 1,
      notif_payout_inapp      INTEGER DEFAULT 1,
      default_shipping_method  TEXT    DEFAULT 'courier',
      default_packaging_type   TEXT    DEFAULT 'standard',
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    , away_dates TEXT DEFAULT NULL, festive_cutoff TEXT DEFAULT NULL, ifsc_code TEXT DEFAULT NULL);

CREATE TABLE occasions (
      id            SERIAL PRIMARY KEY,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title         TEXT NOT NULL,
      occasion_type TEXT NOT NULL DEFAULT 'other' CHECK(occasion_type IN ('birthday','anniversary','wedding','festival','just_because','other')),
      date          TEXT NOT NULL,
      reminder_days INTEGER DEFAULT 7,
      notes         TEXT DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE reviews (
      id              SERIAL PRIMARY KEY,
      order_id        INTEGER REFERENCES orders(id),
      buyer_id        INTEGER REFERENCES users(id),
      seller_id       INTEGER REFERENCES users(id),
      listing_id      INTEGER REFERENCES listings(id),
      product_id      INTEGER REFERENCES products(id),
      reviewer_id     INTEGER REFERENCES users(id),
      rating          INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      body            TEXT,
      comment_text    TEXT    DEFAULT NULL,
      reply_text      TEXT    DEFAULT NULL,   -- seller reply
      replied_at      TEXT    DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE reels (
      id            SERIAL PRIMARY KEY,
      seller_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id    INTEGER REFERENCES products(id),
      title         TEXT,
      caption       TEXT    DEFAULT NULL,
      video_url     TEXT    NOT NULL,
      thumbnail_url TEXT    DEFAULT NULL,
      duration_secs INTEGER DEFAULT NULL,
      share_to_instagram INTEGER DEFAULT 0,
      reel_type     TEXT    DEFAULT NULL CHECK(reel_type IN ('process','behind_the_scenes','storytime','qa','tutorial','other','showcase')),
      seasonal_tag  TEXT    DEFAULT NULL,
      visibility    TEXT    DEFAULT 'draft' CHECK(visibility IN ('public','store-only','draft')),
      ig_reminder   INTEGER DEFAULT 0,
      view_count    INTEGER DEFAULT 0,
      like_count    INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      save_count    INTEGER DEFAULT 0,
      status        TEXT    DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE reel_likes (
      id        SERIAL PRIMARY KEY,
      reel_id   INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      liked_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reel_id, user_id)
    );

CREATE TABLE reel_comments (
      id            SERIAL PRIMARY KEY,
      reel_id       INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
      user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body          TEXT NOT NULL,
      created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE saved_reels (
      id        SERIAL PRIMARY KEY,
      reel_id   INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      saved_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reel_id, user_id)
    );

CREATE TABLE reel_listing_links (
      id         SERIAL PRIMARY KEY,
      reel_id    INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reel_id, listing_id)
    );

CREATE TABLE seller_order_meta (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      seller_id INTEGER,
      fulfillment_status TEXT DEFAULT 'pending',
      tracking_number TEXT,
      dispatch_note TEXT,
      gift_wrap_requested INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE order_tracking_events (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      status TEXT,
      occurred_at TEXT DEFAULT CURRENT_TIMESTAMP,
      note TEXT
    );

CREATE TABLE order_items (
      id          SERIAL PRIMARY KEY,
      order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      unit_price_paise INTEGER NOT NULL,
      quantity    INTEGER NOT NULL DEFAULT 1,
      image_url   TEXT
    );

CREATE TABLE conversations (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id),
      buyer_id INTEGER NOT NULL REFERENCES users(id),
      listing_id INTEGER NOT NULL REFERENCES listings(id),
      status TEXT NOT NULL DEFAULT 'intake_in_progress',
      intake_complete INTEGER NOT NULL DEFAULT 0,
      intake_summary TEXT DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    , product_type_tag TEXT);

CREATE TABLE intake_question_templates (
      id SERIAL PRIMARY KEY,
      product_type_tag TEXT NOT NULL,
      question_text TEXT NOT NULL,
      answer_type TEXT NOT NULL CHECK(answer_type IN ('free_text','photo_upload','single_choice','number','date_picker','long_text')),
      options TEXT DEFAULT NULL,
      is_tohfa_default INTEGER NOT NULL DEFAULT 1,
      seller_id INTEGER DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE intake_responses (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES intake_question_templates(id),
      question_text TEXT NOT NULL,
      answer_type TEXT NOT NULL,
      answer_value TEXT,
      answered_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE custom_offers (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      seller_id INTEGER NOT NULL REFERENCES users(id),
      buyer_id INTEGER NOT NULL REFERENCES users(id),
      price INTEGER NOT NULL CHECK(price > 0),
      delivery_date TEXT NOT NULL,
      seller_notes TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','expired')),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE conversation_messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id),
      sender_role TEXT CHECK(sender_role IN ('buyer','seller','bot')),
      message_type TEXT CHECK(message_type IN ('text','photo','system')),
      content TEXT,
      image_url TEXT DEFAULT NULL,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      is_read INTEGER DEFAULT 0
    );

CREATE TABLE sellers (
      id                  SERIAL PRIMARY KEY,
      user_id             INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      shop_name           TEXT    NOT NULL DEFAULT '',
      handle              TEXT    UNIQUE,
      city                TEXT    DEFAULT NULL,
      bio                 TEXT    DEFAULT NULL,
      photo_url           TEXT    DEFAULT NULL,
      banner_url          TEXT    DEFAULT NULL,
      about_headline      TEXT    DEFAULT NULL,
      about_description   TEXT    DEFAULT NULL,
      about_video_url     TEXT    DEFAULT NULL,
      working_on_label    TEXT    DEFAULT NULL,
      badges              TEXT    DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE    DEFAULT NULL
    );

CREATE TABLE seller_addresses (
      id            SERIAL PRIMARY KEY,
      seller_id     INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      label         TEXT    NOT NULL DEFAULT 'Home',
      address_line  TEXT    NOT NULL,
      city          TEXT    NOT NULL,
      state         TEXT    NOT NULL,
      pincode       TEXT    NOT NULL,
      phone         TEXT    NOT NULL,
      is_default    INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE seller_settings (
      id                  SERIAL PRIMARY KEY,
      seller_id           INTEGER NOT NULL UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
      daily_limit         INTEGER NOT NULL DEFAULT 50,
      weekly_limit        INTEGER NOT NULL DEFAULT 200,
      daily_sold_count    INTEGER NOT NULL DEFAULT 0,
      weekly_sold_count   INTEGER NOT NULL DEFAULT 0,
      last_daily_reset    TEXT    DEFAULT CURRENT_TIMESTAMP,
      last_weekly_reset   TEXT    DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE daily_order_tracking (
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      total_units_ordered INTEGER DEFAULT 0,
      PRIMARY KEY (seller_id, date)
    );

CREATE TABLE overflow_requests (
      id SERIAL PRIMARY KEY,
      buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      variant_id INTEGER REFERENCES listing_variants(id) ON DELETE SET NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      original_price_paise INTEGER NOT NULL,
      seller_proposed_date TEXT DEFAULT NULL,
      seller_notes TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'declined', 'confirmed', 'cancelled', 'expired')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    , order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL);

CREATE TABLE seller_earnings (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      total_earned INTEGER NOT NULL DEFAULT 0,
      pending_amount INTEGER NOT NULL DEFAULT 0,
      on_hold_amount INTEGER NOT NULL DEFAULT 0,
      this_month_earned INTEGER NOT NULL DEFAULT 0,
      this_week_earned INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE seller_payout_accounts (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      method TEXT NOT NULL CHECK(method IN ('BANK', 'UPI')),
      account_holder_name TEXT NOT NULL,
      account_number TEXT DEFAULT NULL,
      ifsc_code TEXT DEFAULT NULL,
      upi_id TEXT DEFAULT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE payouts (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('BANK', 'UPI')),
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED')),
      initiated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT DEFAULT NULL,
      failure_reason TEXT DEFAULT NULL,
      reference_id TEXT DEFAULT NULL
    );

CREATE TABLE transactions (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('SALE', 'REFUND', 'PAYOUT', 'FEE', 'ADJUSTMENT')),
      gross_amount INTEGER NOT NULL,
      platform_fee INTEGER NOT NULL DEFAULT 0,
      tax_amount INTEGER NOT NULL DEFAULT 0,
      net_amount INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('COMPLETED', 'PENDING', 'FAILED')),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE seller_tax_info (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      is_gst_registered INTEGER NOT NULL DEFAULT 0 CHECK(is_gst_registered IN (0, 1)),
      gstin TEXT DEFAULT NULL,
      pan_number TEXT DEFAULT NULL,
      tds_applicable INTEGER NOT NULL DEFAULT 0 CHECK(tds_applicable IN (0, 1)),
      financial_year TEXT NOT NULL
    );

CREATE TABLE refund_disputes (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'ACCEPTED', 'CONTESTED', 'RESOLVED')),
      seller_response TEXT DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT DEFAULT NULL
    );

CREATE TABLE seller_payment_preferences (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      preferred_method TEXT NOT NULL CHECK(preferred_method IN ('BANK', 'UPI')),
      auto_payout_enabled INTEGER NOT NULL DEFAULT 0 CHECK(auto_payout_enabled IN (0, 1)),
      auto_payout_threshold INTEGER NOT NULL DEFAULT 50000,
      notify_on_payout INTEGER NOT NULL DEFAULT 1 CHECK(notify_on_payout IN (0, 1))
    );

CREATE TABLE reel_product_links (
      id          SERIAL PRIMARY KEY,
      reel_id     INTEGER NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(reel_id, product_id)
    );

CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_rt_user_id ON refresh_tokens(user_id);

CREATE INDEX idx_rt_token_hash ON refresh_tokens(token_hash);

CREATE INDEX idx_sp_user_id ON seller_profiles(user_id);

CREATE INDEX idx_categories_slug ON categories(slug);

CREATE INDEX idx_products_seller ON products(seller_id);

CREATE INDEX idx_products_category ON products(category_id);

CREATE INDEX idx_products_status ON products(status);

CREATE INDEX idx_product_images_product ON product_images(product_id);

CREATE INDEX idx_cart_user ON cart_items(user_id);

CREATE INDEX idx_addresses_user ON addresses(user_id);

CREATE INDEX idx_wishlist_user ON wishlists(user_id);

CREATE INDEX idx_follows_follower  ON follows(follower_id);

CREATE INDEX idx_follows_following ON follows(following_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);

CREATE UNIQUE INDEX idx_sp4_handle ON seller_profiles(handle) WHERE handle IS NOT NULL;

CREATE UNIQUE INDEX idx_sp4_store_slug ON seller_profiles(store_slug) WHERE store_slug IS NOT NULL;

CREATE UNIQUE INDEX idx_admin_users_email ON admin_users(email);

CREATE UNIQUE INDEX idx_admin_users_username ON admin_users(username);

CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE UNIQUE INDEX idx_sponsored_product_id ON sponsored_products(product_id);

CREATE INDEX idx_sponsored_is_sponsored ON sponsored_products(is_sponsored);

CREATE UNIQUE INDEX idx_order_flags_order_id ON order_flags(order_id);

CREATE INDEX idx_order_flags_flag_type ON order_flags(flag_type);

CREATE INDEX idx_seller_bans_seller_id ON seller_bans(seller_id);

CREATE INDEX idx_variants_listing_id ON listing_variants(listing_id);

CREATE INDEX idx_swp_seller ON store_workspace_photos(seller_id);

CREATE INDEX idx_payouts_seller ON payout_history(seller_id);

CREATE INDEX idx_listings_seller_id ON listings(seller_id);

CREATE INDEX idx_listings_status    ON listings(status);

CREATE INDEX idx_images_listing_id ON listing_images(listing_id);

CREATE INDEX idx_photos_listing_id ON listing_photos(listing_id);

CREATE INDEX idx_stm_seller ON seller_team_members(seller_id);

CREATE INDEX idx_materials_seller ON inventory_materials(seller_id);

CREATE INDEX idx_occasions_user ON occasions(user_id);

CREATE INDEX idx_occasions_date  ON occasions(date);

CREATE INDEX idx_reviews_seller ON reviews(seller_id);

CREATE INDEX idx_reviews_listing ON reviews(listing_id);

CREATE INDEX idx_reel_likes_reel ON reel_likes(reel_id);

CREATE INDEX idx_reel_comments_reel ON reel_comments(reel_id);

CREATE INDEX idx_saved_reels_user ON saved_reels(user_id);

CREATE INDEX idx_reels_seller ON reels(seller_id);

CREATE INDEX idx_rll_reel ON reel_listing_links(reel_id);

CREATE INDEX idx_som_order_id ON seller_order_meta(order_id);

CREATE INDEX idx_ote_order ON order_tracking_events(order_id);

CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE INDEX idx_order_items_product ON order_items(product_id);

CREATE INDEX idx_orders_seller ON orders(seller_id);

CREATE INDEX idx_orders_status ON orders(status);

CREATE INDEX idx_sellers_user_id ON sellers(user_id);

CREATE UNIQUE INDEX idx_sellers_handle ON sellers(handle);

CREATE INDEX idx_seller_addresses_seller ON seller_addresses(seller_id);

CREATE INDEX idx_seller_settings_seller ON seller_settings(seller_id);

CREATE INDEX idx_dot_seller_date ON daily_order_tracking(seller_id, date);

CREATE INDEX idx_or_buyer_id ON overflow_requests(buyer_id);

CREATE INDEX idx_or_seller_id ON overflow_requests(seller_id);

CREATE INDEX idx_or_status ON overflow_requests(status);

CREATE INDEX idx_se_seller ON seller_earnings(seller_id);

CREATE INDEX idx_spa_seller ON seller_payout_accounts(seller_id);

CREATE INDEX idx_payouts_new_seller ON payouts(seller_id);

CREATE INDEX idx_payouts_new_status ON payouts(status);

CREATE INDEX idx_tx_seller ON transactions(seller_id);

CREATE INDEX idx_tx_order ON transactions(order_id);

CREATE INDEX idx_tx_type ON transactions(type);

CREATE INDEX idx_sti_seller ON seller_tax_info(seller_id);

CREATE INDEX idx_rd_seller ON refund_disputes(seller_id);

CREATE INDEX idx_rd_order ON refund_disputes(order_id);

CREATE INDEX idx_spp_seller ON seller_payment_preferences(seller_id);

CREATE INDEX idx_rpl_reel ON reel_product_links(reel_id);

-- Admin Panel tables added during overhaul
CREATE TABLE IF NOT EXISTS product_events (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK(event_type IN ('view', 'click', 'cart_add')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_product_events_product ON product_events(product_id);
CREATE INDEX IF NOT EXISTS idx_product_events_type ON product_events(event_type);
CREATE INDEX IF NOT EXISTS idx_product_events_occurred ON product_events(occurred_at DESC);

CREATE TABLE IF NOT EXISTS seller_spotlight (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  story_text TEXT NOT NULL,
  image_url TEXT NOT NULL,
  featured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_seller_spotlight_seller ON seller_spotlight(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_spotlight_active ON seller_spotlight(is_active);

CREATE TABLE IF NOT EXISTS ui_settings (
  id SERIAL PRIMARY KEY,
  slot_name TEXT NOT NULL UNIQUE,
  slot_type TEXT NOT NULL,
  content_url TEXT DEFAULT NULL,
  content_ref_id INTEGER DEFAULT NULL,
  label TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES admin_users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ui_settings_slot ON ui_settings(slot_name);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reporter_type TEXT CHECK(reporter_type IN ('buyer', 'seller', 'anonymous')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  related_to_type TEXT CHECK(related_to_type IN ('order', 'seller', 'product', 'other')),
  related_to_id TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in-review', 'resolved')),
  admin_reply TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);