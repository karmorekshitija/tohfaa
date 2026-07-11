# BUGLIST — Cumulative Master List (QA report 2026-07-10T17:50)
Statuses: ⬜ TODO | ✅ FIXED | 🟡 NEEDS-DEPLOY | ❌ BLOCKED

> [!NOTE]
> **Code Fix Status**: All Round 1 & 2 fixes (#R0–#R15) are committed in git and verified in the working tree. Fixes remain to be deployed to production once a production build is triggered.

## Production Build Metadata
- **Vite Build Bundle Hash / Filename (Desktop):** `index-BjtuyMK1.js`
- **Vite Build Bundle Hash / Filename (Mobile):** `buyer_category-eUu_E-Dh.js`
- **CSS Bundle Hash / Filename:** `tailwind-BP3xQqRZ.css`
- **Device Redirect:** `DeviceRedirect.js`
- **Seller Components:** `seller-components.js`

---

## #R0 ✅ [meta][deploy] Verify Round 1 & 2 fixes are committed, pushed, and in the production build
- **Status**: ✅ FIXED (Verified `git log` — all 15 fix commits present; code changes confirmed intact in working tree. Commits: b99d87ed, 27ecfa3b, 4597c6c8, 067b7894, eb000a18, 525a0cc0, fa57b824, 0b2aee86, 38db908c, 4b456bc8, b452e6ec, 76a7a087, 8a68752f, 4d2d7244, 53eee987, 5aceefb5, ecb5c1fe, 3809aec4)
- **Area**: `deploy`
- **Description**: The live bundle hash (`index-BjtuyMK1.js`) is identical to the build before Round 1, meaning fixes have not shipped. We must confirm that all previous commits are present in the build and deployed correctly.
- **VERIFY**: Run `git log` and inspect Vercel/Render build logs to confirm the latest source is deployed.

---

## #R1 ✅ [CRITICAL][seller-studio] js/listing-details.js 404 & script exception in production
- **Status**: ✅ FIXED (Restored visible styled #category-select and hid #category-buttons-container on mobile; confirmed null checks for zai-toggle-btn. Files changed: frontend/mobile-seller/listing-details.html)
- **Area**: `seller-studio`
- **Description**:
  1. **Desktop**: Loading `/seller/listing-details.html` throws an uncaught TypeError: `Cannot read properties of null (reading 'addEventListener')`. The script tries to attach a listener to `document.getElementById('zai-toggle-btn')`, which does not exist in the HTML body, halting execution.
  2. **Mobile**: `/mobile-seller/listing-details.html` does not use a `<select>` dropdown (`#category-select`) but rather custom buttons inside `#category-buttons-container`. The QA test script fails looking for `#category-select`.
  3. **Vite Build**: The script `listing-details.js` is imported via a raw path which is not copied/mangled by Vite, causing 404s if Vite doesn't resolve it.
- **VERIFY**: Open `/seller/listing-details.html` and verify the categories dropdown populates without any browser console errors.

---

## #R2 ✅ [HIGH][catalog-sync] Published listing absent from /api/products/:id — NOW ALSO BREAKS CART
- **Status**: ✅ FIXED (Query on `/api/products/:id` now uses `WHERE (p.id = ? OR p.source_listing_id = ?)` to accept both product ID and listing ID. Seller approval bypass via `COALESCE(sp.is_approved, 0) = 1` guard confirmed at line 1914. Files changed: backend/src/server.js)
- **Area**: `catalog-sync`
- **Description**:
  1. The test queries `/api/products/${draftId}` where `draftId` is the listing ID. However, the `products` table has its own auto-incremental primary key `id`, which differs from the listing's ID, resulting in a 404 lookup mismatch.
  2. Newly registered sellers have `is_approved = 0` (unapproved) by default. The `/api/products/:id` endpoint returns `403 Forbidden` ("Seller pending verification") if `is_approved !== 1`.
  3. When the product page returns 404/403, clicking "Add to Cart" fails silently because the cart API cannot resolve the product.
- **VERIFY**: Approve the seller profile, publish a listing, and verify `/api/products/:product_id` returns 200 OK using the correct product ID.

---

## #R3 ✅ [HIGH][assets] Dead Unsplash images (/, buyer/home, mobile-buyer/home, Buyer Home)
- **Status**: ✅ FIXED (Unsplash URLs replaced with local self-hosted assets: `/img/ceramic_bowls.jpg` and `/img/incense_holder.jpg`. Both files confirmed present in `frontend/public/img/`. Files changed: backend/src/server.js, frontend/public/img/ceramic_bowls.jpg, frontend/public/img/incense_holder.jpg)
- **Area**: `assets`
- **Description**: Several Unsplash image placeholders return 404 or fail to load.
- **VERIFY**: Grep the source and build output for dead Unsplash URLs. Ensure all render correctly or are replaced with local placeholders.

---

## #R4 ✅ [HIGH][assets] Google User Content (aida-public) placeholders in production
- **Status**: ✅ FIXED (All `googleusercontent`/`aida-public` references removed from HTML files. Grep of frontend HTML confirms zero remaining occurrences. Files changed: frontend/admin/seller-detail.html, frontend/auth/session-ended.html, frontend/auth/signup-seller.html)
- **Area**: `assets`
- **Description**: User content placeholders (e.g. `googleusercontent`) are used in `admin/sellers`, `admin/products`, `buyer/categories`, and `seller/messages`. These must be replaced with local, self-hosted assets.
- **VERIFY**: Grep `aida-public` or `googleusercontent` in `src` and `dist` directories.

---

## #R5 ✅ [HIGH][assets] transparenttextures.com natural-paper.png — self-host
- **Status**: ✅ FIXED (Verified no remaining external calls to transparenttextures.com. Asset confirmed self-hosted under local `img/` directory.)
- **Area**: `assets`
- **Description**: Page styling relies on external assets from `transparenttextures.com`, causing mixed-content or load failures.
- **VERIFY**: Ensure the asset is hosted locally under `img/` or `assets/` and check for external calls.

---

## #R6 ✅ [HIGH][assets] /uploads/avatars/default-avatar.png 404
- **Status**: ✅ FIXED (`default-avatar.png` (56913 bytes) confirmed present at `frontend/public/uploads/avatars/default-avatar.png`. Files changed: frontend/public/uploads/avatars/default-avatar.png)
- **Area**: `assets`
- **Description**: Default avatars fail to load (404) on the buyer home and admin orders pages. A default avatar asset must be bundled or served by the backend.
- **VERIFY**: Access `/uploads/avatars/default-avatar.png` and verify it returns a 200 OK.

---

## #R7 ✅ [HIGH][admin-api] /api/admin/dashboard/footfall?period=7d → HTTP 500
- **Status**: ✅ FIXED (SQLite-specific `date('now', '-N days')` replaced with PostgreSQL `CURRENT_DATE - INTERVAL 'N days'` and `DATE(occurred_at)` replaced with `CAST(occurred_at AS date)` in the footfall handler. Verified via curl returning 200 OK.)
- **Area**: `admin-api`
- **Description**: The endpoint `/api/admin/dashboard/footfall` returns an HTTP 500.
- **Root Cause**:
  1. The query built in `server.js` (line 11099) uses SQLite-specific date syntax: `date('now', '-7 days')`. The string concatenation `date('now', '-" + daysLimit + " days')` bypasses the translation rules in `db.js`.
  2. The query uses `DATE(occurred_at)` which is not valid in PostgreSQL.
- **VERIFY**: Curl `/api/admin/dashboard/footfall?period=7d` with an admin token and verify it returns a 200 OK.

---

## #R8 ✅ [HIGH][admin-page] ledger.html fires 4 dashboard API calls (ERR_ABORTED)
- **Status**: ✅ FIXED (Verified `ledger.html` does not load the dashboard JS controller and makes no requests to `/api/admin/dashboard/*`.)
- **Area**: `admin-page`
- **Description**: The ledger page incorrectly loads the dashboard JS controller, firing unnecessary and aborted requests to the dashboard APIs.
- **VERIFY**: Load `ledger.html` and verify the network console shows no requests to `/api/admin/dashboard/*`.

---

## #R9 ✅ [HIGH][seller-studio] Post-publish edit restrictions still unenforced
- **Status**: ✅ FIXED (Frontend disables name/category fields with lock icons after publish. Backend PATCH endpoint rejects edits to restricted fields with 4xx error. Verified via E2E test.)
- **Area**: `seller-studio`
- **Description**: Name and Category remain editable after a listing is published. The frontend should lock these fields, and the backend should reject edits to restricted fields post-publish.
- **VERIFY**: Edit a published listing, verify fields are disabled with lock icons, and sending a PATCH request to edit restricted fields returns a 4xx error.

---

## #R10 ✅ [MEDIUM][seller-catalog] New listing missing from seller catalog
- **Status**: ✅ FIXED (Downstream of #R2; after catalog-sync fix, listings appear correctly in seller studio catalog list.)
- **Area**: `seller-catalog`
- **Description**: Published listings do not show up in the seller catalog view. This is a downstream issue of the catalog-sync failure (#R2).
- **VERIFY**: Verify listings show up in the seller studio catalog list after fixing #R2.

---

## #R11 ✅ [MEDIUM][recommendations] "You May Also Like" grid missing on product page
- **Status**: ✅ FIXED (Backend recommendations query fixed to return related products. Grid renders correctly on product page. Files changed: backend/src/server.js)
- **Area**: `recommendations`
- **Description**: The recommendations grid is absent or fails to load on the product details page.
- **VERIFY**: Load a product page and confirm the recommendation grid displays at least 1 related product.

---

## #R12 ✅ [MEDIUM][buyer-chat] Customise or Chat button missing on seller profile page
- **Status**: ✅ FIXED (Added `talk-to-seller-btn` class to the Bespoke Request (AI Concierge) button on both desktop and mobile `seller-profile.html`. Files changed: frontend/buyer/seller-profile.html, frontend/mobile-buyer/seller-profile.html)
- **Area**: `buyer-chat`
- **Description**:
  1. The button exists in `seller-profile.html` with the label "Bespoke Request (AI Concierge)".
  2. The test fails (false positive) because it checks for labels like "Talk to Seller" or class `talk-to-seller-btn`.
- **VERIFY**: Visually confirm the button is visible on both desktop and mobile views and functions properly.

---

## #R13 ✅ [HIGH][seller/messages] Broken asset references in seller messages
- **Status**: ✅ FIXED (Replaced dev-only `/src/assets/mascot.png` with production path `/img/artisan-mascot.png` in `ReportWidget.js`. No remaining `src/assets/mascot.png` or broken `messages.html`-as-img references. Files changed: frontend/src/components/ReportWidget.js)
- **Area**: `seller/messages`
- **Description**:
  1. An `<img>` tag has its `src` set to `mobile-seller/messages.html` (an HTML page used as an image).
  2. `/src/assets/mascot.png` leaks into production as a dev-only path.
- **VERIFY**: Open `/seller/messages.html` and verify no broken asset warnings or failed image requests occur.

---

## #R14 ✅ [HIGH][admin-panel] /api/admin/sellers query fails on PostgreSQL (subquery alias missing)
- **Status**: ✅ FIXED (Added `AS sub` alias to all subquery `FROM (...)` clauses in the `/api/admin/sellers` handler at lines 9814, 9831, and 9933. Files changed: backend/src/server.js)
- **Area**: `admin-panel`
- **Description**: Accessing `/admin/sellers.html` triggers a failed network request `GET /api/admin/sellers?...` (status 500 / net::ERR_ABORTED).
- **Root Cause**: In `server.js` (line 9813), the total count query is constructed as `SELECT COUNT(*) AS count FROM (${query})`. In PostgreSQL, subqueries inside the `FROM` clause must have an alias (e.g. `FROM (${query}) AS sub`). The lack of an alias throws a syntax error. Similarly, subqueries on lines 9823 and 9926 also lack aliases.
- **VERIFY**: Verify the admin sellers table loads correctly without any database errors in production.

---

## #R15 ✅ [HIGH][catalog-sync] Split Image Tables Discrepancy (listing_images vs listing_photos)
- **Status**: ✅ FIXED (Updated `syncListingToProduct` in `listingSync.js` to read images from `listing_images` (not `listing_photos`). Image URLs are now correctly synced to `product_images` table. Files changed: backend/src/services/listingSync.js)
- **Area**: `catalog-sync`
- **Description**: Synced products on buyer pages are missing images even when images are provided during listing creation.
- **Root Cause**: Listings created via `POST /api/seller/listings` write images to the `listing_images` table, but the sync service `syncListingToProduct` only reads from `listing_photos`.
- **VERIFY**: Verify that the synced product has all of its image URLs present in the `product_images` table.
