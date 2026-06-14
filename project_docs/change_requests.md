# TohfaHub Project — Change Request Log

> All UI, backend, and feature changes requested across development sessions.

---

## Session: 2026-06-14

---

### ✅ Change 1 — Active Tab Highlight in Seller Studio Left Taskbar

**Request:** When opening a tab from the left taskbar in Seller Studio, it should be highlighted in green so the seller knows which tab they are currently in.

**Details:**
- The active sidebar tab must show a green (`#3D6B4F`) background with white icon and label text.
- The highlight is driven by the `sidebar-link-active` CSS class in `frontend/components/seller-components.js`.
- The `active-tab` attribute on `<seller-layout>` controls which tab is active per page.
- Pages with incorrect or missing `active-tab` values (`production-planner.html` → `"capacity"`, `store-config.html` → `"config"`) must be corrected to map to valid sidebar entries.
- Smooth `transition: background-color 0.2s ease` must be added to all sidebar links.

**Files Affected:**
- `frontend/components/seller-components.js`
- `frontend/seller/production-planner.html`
- `frontend/seller/store-config.html`

---

### ✅ Change 2 — Remove "Botanical" Entirely from the Frontend

**Request:** The word "Botanical" and all associated CSS classes, copy, watermarks, placeholder text, and decorative elements must be removed from the live frontend. It has no relevance to the platform.

**Details:**

**Seller pages cleaned:**
- `analytics.html` — remove `.botanical-overlay` CSS and elements
- `become-seller.html` — remove `.botanical-watermark` CSS, decorative divs, and replace all copy ("botanical artisans" → "artisan community", "botanical atelier" → "curated atelier", "© 2024 TOFA Botanical Atelier" → "© 2024 TOFA", etc.)
- `catalog.html` — remove `.botanical-overlay` CSS; replace default fallback category `'Botanical'` → `'Uncategorized'`
- `dashboard.html` — remove `.botanical-watermark` CSS and all decorative empty divs; replace "Seller Workshop: Botanical Inks" → "Seller Workshop: New Resources"
- `edit-listing.html` — remove `.botanical-watermark` CSS and div; remove `<option value="Botanical">` from dropdown; change JS fallback `data.category || 'Botanical'` → `data.category || ''`
- `listing-details.html` — remove `.botanical-watermark` CSS, step bar comment, watermark div, and "Botanical Resin" demo category button
- `listing-photos.html` — remove `.botanical-watermark` CSS, watermark overlay div, and replace botanical copy
- `listing-pricing-a.html` — rename `<option>Standard Botanical</option>` → `<option>Standard</option>`
- `listing-pricing-b.html` — same as pricing-a
- `listing-publish.html` — remove `.botanical-watermark` CSS and all decorative watermark divs
- `listing-shipping.html` — remove `.botanical-watermark` CSS, comment, and `<img alt="Botanical illustration">` element
- `orders.html` — remove `.botanical-overlay` CSS definition
- `upload-reel.html` — rename "Botanical Tags" label → "Reel Tags"; rename JS variable `botanicalTagsList` → `reelTagsList`; remove hardcoded `#botanicalart` demo tag chip

**Buyer pages cleaned:**
- `become-seller.html` — same copy replacements as seller version
- `cart.html` — remove `.botanical-overlay` class and watermark comment
- `cart-empty.html` — remove botanical comment
- `checkout.html` — remove `.botanical-overlay` class and watermark comment
- `comments.html` — remove `.botanical-sketch` class from div
- `followers.html` — remove `.botanical-watermark` CSS; remove class from `<body>`
- `home.html` — replace "botanical-inspired stationery" → "hand-crafted stationery"
- `notifications.html` — remove `.botanical-watermark` CSS; remove class from `<body>`
- `orders.html` — remove `.botanical-bg` CSS and watermark overlay div
- `payment-handoff.html` — remove watermark comment and `<div class="botanical-watermark">`
- `receipt.html` — remove `.botanical-watermark` CSS definition
- `search.html` — remove "botanical wraps" trending chip button

> ⚠️ `design_mockups/` and `stitch_screens/` folders are NOT touched — they are design archives only.

---

### ✅ Change 3 — Auto-Save as Draft on Tab Switch During Upload/Listing

**Request:** If a seller is mid-way through listing a product (any step of the listing wizard) or uploading a reel, and they click another tab in the left sidebar, the in-progress work must be automatically saved as a draft instead of being permanently lost.

**Details:**

**Product Listing Wizard (6 pages):**
- Intercept sidebar `<a>` link clicks using a delegated event listener on `<seller-sidebar>`.
- If `hasUnsavedWork()` returns `true` (form has content or `draft_id` in sessionStorage), auto-call the existing save function with `shouldRedirect = false`.
- Show branded toast: `"Progress auto-saved as draft ✦"` then navigate after 700ms delay.
- No browser `beforeunload` dialog — interception is silent and seamless.
- Pages covered:
  - `listing-photos.html` → `saveListingDraft(false)`
  - `listing-details.html` → `saveDetails(false)`
  - `listing-pricing-a.html` → `savePricing(false)`
  - `listing-pricing-b.html` → `savePricing(false)`
  - `listing-shipping.html` → existing shipping save function
  - `listing-preview.html` → skip auto-save (no editable fields)

**Reel Upload (`upload-reel.html`):**
- Wire the existing `save-draft-btn` button (previously unhooked) — clicking it sets `visibility` to `'draft'` and triggers reel post.
- On sidebar navigation while upload form is visible and a video file is selected: auto-save as draft reel if at least one product is linked.
- If no product is linked or no video selected, navigate immediately without blocking.
- Draft reels appear in the reel library with `visibility: 'draft'`.

**Backend:** No changes needed — draft status already supported:
- Listings: `status = 'draft'` in the `listings` table
- Reels: `visibility = 'draft'` in the `reels` table

---

## Session: Infrastructure

---

### ✅ Change 4 — Start the Development Website

**Request:** Start both the backend and frontend servers.

**Servers launched:**

| Service | Command | Port |
|---|---|---|
| Backend (Node.js/Express) | `node src/server.js` | `5001` |
| Frontend (Vite) | `npm run dev` | `5175` |

- Local frontend: `http://localhost:5175/`
- Local backend API: `http://localhost:5001/`

---

### ✅ Change 5 — Expose Website via Cloudflare Tunnel

**Request:** Create a public Cloudflare link for the local dev server.

**Tool used:** `cloudflared tunnel --url http://localhost:5175`

- Public URL generated: `https://eric-establishment-mixed-employ.trycloudflare.com`
- Type: Quick (account-less) tunnel via `trycloudflare.com`
- Note: URL is session-scoped — it changes each time the tunnel is restarted.

---

## Earlier Sessions (from conversation history)

---

### ✅ Integrating Custom and Overflow Chat Flow
- Bypassed the bot intake flow for Customized and Overflow product requests.
- Auto-transmitted a styled product inquiry message from buyer to seller.
- Rendered in a custom product panel card in both buyer and seller chat interfaces.

### ✅ Implementing Seller Holiday Mode
- Added a Holiday Mode toggle to the Seller Studio Dashboard.
- Allows sellers to schedule away/break dates.
- When active: disables Add-to-Cart and Chat buttons on their products in `product.html`.
- Updated `store_config` table with `away_dates` via `server.js` API endpoints.

### ✅ Integrating Seller Customized Products Tab
- Added a "Customized" tab on the seller profile page (buyer-facing).
- Dynamically fetches and displays all products marked as "customized" for a seller.
- Reuses existing product UI components (square panels) for visual consistency.

### ✅ Best Seller Calculation Logic
- Implemented backend logic to compute and flag "Best Seller" products.
- Products meeting threshold criteria are marked and surfaced via API.

### ✅ Implementing Double Ribbon Badge
- Added a parallel double-diagonal ribbon badge for products that are both "Custom" and "Best Seller".
- Modified backend API and all buyer-facing product listing pages (home, category, search, seller-profile).

### ✅ Dynamic Add-to-Cart Logic
- Implemented dynamic toggle: when requested quantity exceeds stock or hits daily cap, "Add to Cart" switches to "Chat with Seller".
- Chat button redirects buyer to the chat interface.

### ✅ Standardizing UI and Login System
- Removed separate seller login; unified into a single login panel with clean white background.
- Replaced taskbars across notification, profile, occasions, custom chat, and following/followers panels with the standardized home page taskbar.

### ✅ Standardizing Product Panel UI
- Standardized product card UI across all buyer-facing pages (home, categories, category, search, seller-profile).
- Removed the homepage search bar.
- Implemented wishlist toggle functionality with backend and localStorage sync.

### ✅ Routing Orders to Chat
- Routed specific order types to the chat interface for seller-buyer communication.

### ✅ Refining Buyer Navigation and Chat
- Fixed navigation bug: category tab under Reels and Profile tabs incorrectly opened search.
- Removed "payments" and "overflow requests" from buyer Profile tab.
- Implemented custom chat in a separate HTML file connected to seller studio messages.

### ✅ Polishing Customised Tab Cards
- Aligned Customised tab product cards to match the Catalog tab's premium design.
- Fetches up to 50 active custom listings.
- Added loading and empty state handling.

### ✅ Edit Reel Taskbar in Seller Studio
- Updated the reel upload/edit UI taskbar in Seller Studio for consistency.

---

*Last updated: 2026-06-14*

---

## ❌ Things That Were NOT Done / Failed Today

> Honest audit of gaps between what was requested and what actually happened in this session.

---

### ❌ Failure 1 — Active Tab Highlight: `store-config.html` Not Fixed

**What was requested:** Change `active-tab="config"` → `active-tab="profile"` in `store-config.html` since "config" has no matching sidebar entry.

**What happened:** `production-planner.html` was correctly fixed (`"capacity"` → `"home"`), but `store-config.html` was **not verified or corrected** in this session. It may still have `active-tab="config"` which means no sidebar tab will highlight when on that page.

**Status:** ⚠️ Needs to be done.

---

### ❌ Failure 2 — Sidebar Active Tab: `transition` CSS Not Added

**What was requested:** Add `transition: background-color 0.2s ease, color 0.2s ease` to `.sidebar-link` in `seller-components.js` so the active state feels smooth.

**What happened:** The `.sidebar-link-active` class and tab highlighting works, but the smooth transition CSS was **never explicitly added** to `.sidebar-link` in `seller-components.js`.

**Status:** ⚠️ Minor — sidebar still works, but transitions may be abrupt.

---

### ❌ Failure 3 — Botanical Removal: Several Buyer Pages Not Confirmed Clean

**What was requested:** Remove all botanical references from all `frontend/buyer/` pages.

**What happened:** Confirmed clean: `search.html`, `dashboard.html`, `become-seller.html`, `upload-reel.html`. However, the following buyer pages were **not individually verified** after the changes were applied:
- `cart.html`
- `checkout.html`
- `comments.html`
- `followers.html`
- `notifications.html`
- `orders.html`
- `payment-handoff.html`
- `receipt.html`
- `cart-empty.html`
- `home.html`

They may still contain `.botanical-*` CSS classes or copy. A full grep pass was not run after changes on the buyer folder.

**Status:** ⚠️ Needs verification pass.

---

### ❌ Failure 4 — Auto-Save Draft: `listing-preview.html` Not Confirmed

**What was requested:** Check `listing-preview.html` and decide if auto-save should be applied (it has no editable fields, so skip was planned).

**What happened:** The auto-save sidebar intercept was confirmed implemented on `listing-photos`, `listing-details`, `listing-pricing-a`, `listing-pricing-b`, and `listing-shipping`. However `listing-preview.html` was **never opened or verified** — it's unclear if the sidebar intercept was added or skipped correctly there.

**Status:** ⚠️ Needs check.

---

### ❌ Failure 5 — Reel Auto-Save: `save-draft-btn` Wiring Not Confirmed

**What was requested:** Wire the `save-draft-btn` on `upload-reel.html` so clicking it sets `visibility: 'draft'` and triggers post. The button existed in HTML but had no `addEventListener`.

**What happened:** `reelTagsList` rename was confirmed done. However the actual wiring of `save-draft-btn` click → draft post flow was **not explicitly verified** in this session's code review.

**Status:** ⚠️ Needs verification.

---

### ❌ Failure 6 — No Automated Tests Run

**What was requested (implicitly):** After making changes, verify they work.

**What happened:** No tests were run. No manual verification was done in the browser after the changes. The Cloudflare link was generated but no one confirmed clicking through the affected pages to validate the changes visually.

**Status:** ⚠️ Recommend a manual walkthrough of: sidebar highlight on every page, a search for "botanical" across all frontend files, and a test of draft auto-save by filling a listing form and clicking a sidebar link.

---

### ℹ️ Note on Role Confusion

In this session I was acting as the **Prompt Architect** (as defined in `AGENTS.md`) — my job was to generate a detailed, unambiguous implementation prompt for the builder agent to execute. When you said **"proceed"**, I outputted the expanded Antigravity-ready prompt.

The actual code changes were executed by a **separate builder execution** (reflected in the file diffs found). However because I did not track or verify every single file change post-execution, some gaps listed above may exist.

**Recommended next step:** Run this in the project root to find any remaining botanical references:
```powershell
grep -ri "botanical" frontend/seller/ frontend/buyer/ frontend/components/
```

