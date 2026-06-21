# TOHFA — Antigravity Prompt File
## Product Pause • Cart Stock Sync • Last-Unit Checkout Contention

**Stack reminder:** Node.js/Express + PostgreSQL (prod) / SQLite (local dev), Vanilla HTML/CSS/JS + Vite frontend. Surfaces: Buyer Storefront, Seller Studio, Admin Panel.

**Rule for Antigravity: do not guess existing schema/route names.** Phase 0 below is mandatory discovery — read the actual files first, then implement using the real table/column/route names you find. Everywhere this doc says "(verify against actual schema)" it means: don't assume, check.

---

## PHASE 0 — Discovery (do this before writing any code)

- [ ] Find and read the products table schema (status field — what values currently exist? draft/active/inactive/out_of_stock?). Note exact column names.
- [ ] Find and read the cart / cart_items table schema and the GET /cart endpoint logic.
- [ ] Find and read the order creation flow — specifically where stock is decremented (is it inside a DB transaction? row lock used?).
- [ ] Find and read the orders table — confirm there's a way to count a buyer's completed orders (buyer_id, status columns).
- [ ] Check if a "similar products" / "you may also like" endpoint already exists anywhere (product detail page, homepage). If yes, extend it rather than duplicating.
- [ ] Find the existing buyer-seller chat / Customize-tab flow (Feature 1) — note the endpoint/function used to open a chat thread pre-filled with context, since Feature C reuses this.
- [ ] Confirm category_id / tags / attributes structure on products (needed for the similarity matching logic in Phase 1).

Output of this phase: a short note (in code comments or a scratch file) listing actual table/column/endpoint names, so Phases 1–4 below map onto reality.

---

## PHASE 1 — Shared Infrastructure (build once, used by all 3 features)

### 1.1 Similar Products Endpoint

`GET /api/products/:id/similar?limit=8`

Matching logic (simple, no ML needed):
1. Get source product's `category_id`, `tags`, `price`.
2. Query: same `category_id`, `status = 'active'`, `stock_quantity > 0`, `id != source.id`, **no seller_id filter** (cross-seller is intentional — recommendations should not be limited to the same seller).
3. Order by: tag-overlap count (desc), then `ABS(price - source.price)` (asc).
4. If fewer than `limit` results, broaden: drop the price sort, fall back to parent category.
5. Return lightweight cards: `id, title, thumbnail_url, price, seller_name, rating`.

- [ ] Build/extend this endpoint.
- [ ] Add an index on `products(category_id, status, stock_quantity)` if not present — this query will run often.

### 1.2 Reusable "Unavailable State" Component (frontend, vanilla JS)

One component used in three places: product detail page (paused), product detail page (out of stock), cart item row (out of stock / paused).

```
renderUnavailableState({
  mode: 'paused' | 'out_of_stock',
  message: string,          // e.g. "This product is paused — check back soon"
  resumeEstimate?: string,  // optional date, paused only
  productId: string         // used to fetch /api/products/:id/similar
})
```

- [ ] Build this as a standalone module (`unavailable-state.js` or similar), not copy-pasted three times.
- [ ] It fetches and renders the similar-products carousel internally — callers don't need to fetch separately.

---

## PHASE 2 — Feature A: Seller Pause / Resume Product

### Assumption flagged: pausing is reversible and doesn't affect existing orders already placed — it only blocks *new* purchases and hides the product from normal browse/search. If that's wrong, tell me and I'll adjust.

### 2.1 Database
- [ ] Add `'paused'` as a valid value to the products status field (verify against actual schema — it may be an enum type that needs a migration, or a plain varchar).
- [ ] Add columns: `paused_at TIMESTAMP NULL`, `pause_reason TEXT NULL`, `resume_estimate_date DATE NULL`.

### 2.2 Backend API
- [ ] `PATCH /api/seller/products/:id/pause` — body: `{ reason?, resume_estimate_date? }`. Sets status='paused', sets paused_at=now. Requires seller owns the product.
- [ ] `PATCH /api/seller/products/:id/resume` — sets status back to its prior value (active), clears paused fields.
- [ ] Update the product-listing query used by storefront/search/homepage to exclude `status = 'paused'`.
- [ ] Update the seller's own catalog view to still show paused products (with a "Paused" badge), since the seller needs to manage them.
- [ ] `GET /api/products/:id` (public detail route) should still return the paused product's full data if accessed directly by URL/link — don't 404 it, just include `status: 'paused'` so frontend can render the paused state instead of the buy flow.

### 2.3 Seller Studio Frontend
- [ ] Add Pause/Resume toggle button on each catalog card and on the product edit page.
- [ ] Confirmation modal on pause: "Pausing hides this from buyers until you resume it." Optional reason + resume estimate input.
- [ ] "Paused" badge visible in seller's own catalog list.

### 2.4 Buyer Storefront Frontend
- [ ] Product detail page: if `status === 'paused'`, hide Add-to-Cart/Buy buttons, show `renderUnavailableState({ mode: 'paused', ... })` from Phase 1.2, with the seller's resume estimate if set, else a generic "check back soon" message.
- [ ] Remove paused products from category grids, search results, and homepage sections (already handled by 2.2 if the same query is reused everywhere — double check no separate query exists for homepage).

### 2.5 Edge cases checklist
- [ ] Product is in a buyer's cart when seller pauses it → cart should show it as unavailable (this is handled by Feature B's cart revalidation logic in Phase 3, not duplicated here — just confirm Phase 3 also checks `status === 'paused'`, not only stock).
- [ ] Seller tries to pause a product with a pending unfulfilled order → allow it (doesn't affect existing orders), just confirm the order detail page still shows correct info even if product is later paused.

---

## PHASE 3 — Feature B: Cart Stock & Pause Revalidation

### Design choice: cart is non-binding. Adding to cart never reserves stock. Stock is only checked/decremented at order-creation time. This is why two buyers can both have the last unit "in cart" with no conflict — the conflict only happens at checkout (Phase 4).

### 3.1 Backend
- [ ] On `GET /api/cart` (verify actual route), for each cart item, join against the live product row and compute (don't store) an `available` flag:
  - `unavailable` if `product.status === 'paused'` → reason `'paused'`
  - `unavailable` if `product.stock_quantity < cart_item.quantity` (covers 0 and partial) → reason `'out_of_stock'`
  - else `available: true`
- [ ] Do **not** silently remove unavailable items from the cart — keep them visible with the unavailable flag, so the buyer sees what happened.
- [ ] Re-run this same check at the start of the checkout-initiate flow (Phase 4) — cart state can be stale between viewing the cart and clicking checkout.

### 3.2 Frontend
- [ ] Cart page: unavailable items render greyed out, quantity controls disabled, checkout checkbox disabled for that item.
- [ ] Below each unavailable item, show the same `renderUnavailableState` component (Phase 1.2) in compact/inline mode — paused message if paused, out-of-stock message otherwise — with similar-product recommendations.
- [ ] Checkout button proceeds with only the still-available items selected; clearly communicate which items were dropped.

### 3.3 Edge cases checklist
- [ ] Multi-seller cart: one seller's item goes unavailable, others remain checkout-able (shouldn't block the whole cart, given your existing sub-order architecture).
- [ ] Item goes from available → unavailable while the cart page is open (no live push assumed) → will be caught on next fetch/checkout attempt, not instantly. (See note below if you want this instant — it requires WebSockets, which aren't in scope here.)

---

## PHASE 4 — Feature C: Last-Unit Checkout Contention + Loyalty Tiebreak

### Design rationale (read before building)
Two buyers clicking "Buy" at the exact same instant can't be resolved fairly by "first request wins" if the goal is "most-purchases buyer wins" — by the time requests reach the server, one already arrived first in wall-clock time, just not meaningfully so. To make the loyalty rule actually apply, the server needs to **briefly hold the decision open** for genuinely-concurrent attempts on the same unit, instead of resolving each request the instant it arrives.

**Default parameters (tune freely):**
- `CONTENTION_THRESHOLD = 1` — contention logic only triggers when remaining stock for the requested quantity is at this level or below.
- `CONTENTION_WINDOW_MS = 2500` — how long the server waits to collect competing attempts before deciding.
- Tiebreak metric: **count of buyer's completed orders** (lifetime). Easy to swap for "total items purchased" by changing one query — flagging in case you'd rather reward big spenders than frequent buyers.

This adds ~2.5s of perceived latency only on last-unit purchases, not normal checkout. That trade-off is the cost of making the loyalty rule meaningful — worth confirming you're fine with it before building.

### 4.1 Database
- [ ] New table `checkout_contention_attempts`: `id, product_id, buyer_id, quantity, status ('pending'|'won'|'lost'), requested_at, resolved_at`.
- [ ] Add `remake_eligible BOOLEAN DEFAULT false` to products (seller sets this — true for items they're willing/able to make again, false for one-of-a-kind/vintage pieces). Used by 4.4.
- [ ] Index on `orders(buyer_id, status)` for fast lifetime-order-count lookups.

### 4.2 Backend logic — `POST /api/checkout/initiate`

```
1. Lock product row (SELECT ... FOR UPDATE) inside a short transaction just to read current stock, then release.
2. available_stock = product.stock_quantity

3. IF available_stock > CONTENTION_THRESHOLD:
     proceed with normal checkout — decrement stock, create order, return success.
     (No behavior change from today for normal-stock items.)

4. ELSE IF available_stock >= quantity_requested (i.e. it's the last unit(s), but enough exists for this request):
     → Enter contention mode:
       a. INSERT a row into checkout_contention_attempts (status='pending').
       b. If this is the first pending attempt for this product, schedule a resolver
          to run after CONTENTION_WINDOW_MS (setTimeout, or a lightweight poll/worker
          checking resolved_at — verify which mechanism fits your existing infra better).
       c. Respond to the client immediately with:
          { status: 'pending', poll_url: '/api/checkout/contention/:product_id?buyer_id=...' }
       d. Frontend shows a short "Confirming availability..." state and polls every ~500ms.

5. Resolver (runs once per contention window per product):
       a. SELECT all 'pending' attempts for this product within the window, lock them.
       b. For each attempting buyer, compute lifetime completed-order count.
       c. Sort attempts by (order_count DESC, requested_at ASC).
       d. Award stock to the top N attempts where N = available_stock.
          → mark 'won', decrement product stock, create their order(s).
       e. For remaining attempts → mark 'lost'. For each loser:
          - IF product.remake_eligible: response includes
            { can_reschedule: true, reschedule_action: 'open_chat' }
          - ELSE: { can_reschedule: false } → frontend shows out-of-stock + recommendations.

6. ELSE (available_stock < quantity_requested already, no contention possible):
     → immediate out-of-stock response + recommendations, skip contention entirely.
```

- [ ] Build the resolver as a single function callable both from the scheduled timeout and (as a safety net) from the poll endpoint, so a poll arriving after the window has technically passed still triggers resolution if it hasn't run yet.

### 4.3 Frontend — Buy button flow
- [ ] On `status: 'pending'` response, disable the buy button, show a short "Confirming..." spinner state, start polling.
- [ ] On `won`: proceed to normal order-confirmation screen.
- [ ] On `lost` + `can_reschedule: true`: show "This one just sold — but the seller can make another! Ask for a remake →" button that opens the existing chat/customize flow, pre-filled with a reference to this product and a remake request message.
- [ ] On `lost` + `can_reschedule: false`: render `renderUnavailableState({ mode: 'out_of_stock', ... })` from Phase 1.2.

### 4.4 Reschedule flow integration
- [ ] Reuse your existing Feature 1 chat-intake flow rather than building a new one — pass it a pre-filled opening message referencing the original product (e.g. "I'd like to order [product name] again — can you make one more?") and let the existing Gemini-backed chat/negotiation flow take over from there.

### 4.5 Edge cases checklist
- [ ] More than 2 buyers contend for 1 unit — algorithm above already generalizes (top N by rank, N=available_stock).
- [ ] A contending buyer abandons the page before resolution — resolver still runs on schedule; their result is just never polled for (fine, no cleanup needed beyond normal row TTL/cleanup job).
- [ ] Buyer requests quantity > 1 during contention — decide whether partial fulfillment is allowed (e.g. they wanted 2, only 1 available) or all-or-nothing. **Not specified yet — flagging as an open question below.**

---

## OPEN QUESTIONS (your call, not blocking the build but worth deciding before/while Antigravity works)

1. **Tiebreak metric**: lifetime *completed order count*, or lifetime *items purchased*, or lifetime *amount spent*? Doc above defaults to completed order count.
2. **Contention window length**: 2500ms default above — fine, or do you want it shorter/longer?
3. **Partial fulfillment**: if a buyer requests 2 units during contention but only 1 remains, do they get 1, or does the whole request fail?
4. **`remake_eligible` default**: should new listings default to `true` (most handmade items can be remade) or `false` (seller must opt in)?
5. **Pause duration**: should `resume_estimate_date` be required, or fully optional like the doc assumes?

---

## PHASE 5 — Manual QA Checklist

- [ ] Pause a product → confirm it disappears from search/category/homepage but is reachable via direct link showing the paused state + recommendations.
- [ ] Resume a paused product → confirm it reappears in listings.
- [ ] Add last-unit item to cart on Device A, leave it; on Device B, buy the same item → Device A's cart shows it out-of-stock with recommendations on next cart load.
- [ ] Open two browser sessions, both click "Buy" on a 1-stock item within ~1 second of each other → confirm exactly one order is created, the other gets reschedule-or-recommendations depending on `remake_eligible`.
- [ ] Confirm normal (non-last-unit) checkout has zero added latency from this work.
- [ ] Confirm multi-seller cart checkout still works when only one sub-order's item is unavailable.
