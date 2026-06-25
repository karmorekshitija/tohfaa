# TohfaHub QA Findings

**Loop started:** 2026-06-21  
**BASE_URL:** http://localhost:5173  
**Status:** ✅ QA & Cleanup Completed (2026-06-24)

---

## Workspace Cleanup Log
- Redundant `.zip` files and their extracted folder counterparts have been successfully deleted from the root directory.
- All `.DS_Store` files in the root, `frontend`, and `backend` directories have been removed.

## Feature Testing & Verification

### 1. Services Verification
- **Backend Server:** Successfully running on port 5001. Connected to local PostgreSQL database.
- **Vite Frontend Dev Server:** Serving on `http://localhost:5173`.
- **Production Build:** Ran `npm run build` inside `frontend/` — compiled successfully with zero errors and all JS syntax checks clean.

### 2. Integration Test Suites
- `checkout-contention.test.js` (E2E Checkout Contention & Loyalty Tiebreak) — **PASSED**
- `concierge-chat.test.js` (E2E Concierge Chat & Offline Handoff) — **PASSED**
- `customization-chat.test.js` (E2E Customization Request & Quote Flow) — **PASSED**

### 3. Buyer Portal Walkthrough (Desktop `/buyer/` & Mobile `/mobile-buyer/`)
- [x] **Home Page:** Smooth scrolling verified, banners click to correct destinations, correct layout styling, all images load correctly.
- [x] **Search:** Verified keyword search queries. Category, price range, and rating filters apply correctly. Reset button successfully restores default listings.
- [x] **Categories:** Navigated categories overview and individual category pages. Filters product cards correctly.
- [x] **Product Details:** Correct display of primary and thumbnail images, description, pricing, and purchase option selectors (sizes, colors, custom notes input).
- [x] **Wishlist (Saved Makes):** Verified that adding a product dynamically increments the wishlist badge counter. Page `/buyer/saved` loads wishlist correctly. Item removal works.
- [x] **Cart:** Quantity adjustment (increment/decrement) correctly updates individual item subtotals and the cart total. Item removal and empty cart states behave correctly.
- [x] **Checkout:** Address selection and creation, mock payment method selections, and simulated Razorpay validation checkout flow verified successfully.
- [x] **Profile:** Route `/buyer/profile` renders avatar/initial, user details, and tab navigation.
- [x] **Notifications:** Notifications panel loads correctly, badge counts increment/decrement dynamically, and marking items as read works.
- [x] **Mobile Layout:** Verified at 375px wide viewport simulation. No text overflows, flex/grid misalignment, or horizontal scrolls. Mobile bottom navigation bar links function correctly.

### 4. Seller Portal Walkthrough (Desktop `/seller/` & Mobile `/mobile-seller/`)
- [x] **Dashboard:** Dashboard summary statistics cards (Total Sales, Active Orders, Page Views) load successfully. Navigation sidebar functions correctly.
- [x] **Analytics:**
  - Verified ChartJS line, bar, horizontal bar, and doughnut charts for Sales, Orders, Conversion Rate, and Customer Demographics render properly.
  - Average Order Value (AOV) calculated correctly as `Total Revenue / Total Orders` (converted from paise).
  - Date period range filters (7 days, 30 days, 90 days, custom range) query backend and update charts/KPI cards dynamically without error.
- [x] **Catalog & Listings:**
  - Flow for adding new listings and editing existing ones works correctly.
  - Calculated fees, estimated profit margins, bulk shipping rates correctly calculated and saved.
  - Image upload, description inputs, and validation checking completed successfully.
- [x] **Orders & Fulfillment:** Verified active/completed orders list filters. Checked production planner stage updates and material tracking.
- [x] **Payouts & Payments:** Payout balance and pending payout totals match database state. Transaction log tables with search/filter work correctly.
- [x] **Store Configuration:** Store banner, announcement banner, FAQs, and vacation mode settings successfully load and update.
- [x] **Messages & Disputes:** Live chat components load, and message histories are fully retrievable. Dispute logs and reviews summaries verified.
- [x] **Mobile Layout:** Monitored on 375px viewport. Bottom navigation tabs and responsive layout grid flex/wrap properties work cleanly.

No active bugs were detected in the core user journeys or backend E2E flows during this test run.

