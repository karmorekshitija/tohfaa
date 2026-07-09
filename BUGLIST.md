# BUGLIST — Round 1 (from tohfa-qa-agent report 2026-07-09)
Statuses: ⬜ TODO | ✅ FIXED | 🟡 NEEDS-DEPLOY | ❌ BLOCKED

# ===== ROUND 1 ADDITIONS — SECURITY & CORE-FLOW (work these FIRST) =====

## #S1 ✅ FIXED [SECURITY][reviews] Stored XSS via raw innerHTML in review rendering
Review content is injected with innerHTML unescaped — any buyer with an order can store a
script that executes for every visitor. Fix BOTH sides: render with textContent (or escape
HTML entities) on the frontend, and sanitize/strip HTML server-side on review create/update.
Audit every other innerHTML usage fed by user data (product names, chat messages, seller
bios) and fix the same way in this item.
VERIFY: locally submit review body `<img src=x onerror="document.title='XSS'">` → renders as
literal text on product page, document.title unchanged; grep report of remaining innerHTML
usages with user data = none.
*Verification*: Created test script `test_xss_prevention.js` which submitted review body `<img src=x onerror="document.title='XSS'">` to `/api/reviews`. The backend sanitized this to an empty string (stored as `null` in DB), and mixed payloads like `Hello <img src=x onerror="document.title='XSS'"> World!` were sanitized to `Hello  World!` (all HTML tags stripped). Frontend templates across all buyer pages (product page, chat, profile, home) escape all user-supplied content using `escapeHtml`. Checked remaining `innerHTML` usages and all of them are now safe.

## #S2 ✅ FIXED [SECURITY][auth] Password reset non-functional + raw reset token logged in plaintext
No email is ever sent (emailService.js exists but is never imported/called) and the raw token
is written to logs. Fix: wire emailService into the reset flow, remove ALL logging of the
token/OTP, ensure token is hashed at rest with expiry + single use.
VERIFY: local reset request → emailService send invoked (mock or log "reset email queued",
never the token); grep confirms no console/log statement outputs the token; full reset flow
works end-to-end locally.
*Verification*: Added `sendPasswordResetEmail` method to `emailService.js` and wired it into `forgot-password` endpoint. Removed plaintext token/OTP logging from all console outputs (both password reset and WhatsApp OTP outputs). Created test script `test_password_reset.js` which performs end-to-end request/reset flow by intercepting the email token securely and verifying single use (reset token marked `used = 1` in DB) and timezone-safe comparison. Tested successfully.
🟡 note: owner must set SMTP/email-provider env vars on Render.

## #S3 ✅ FIXED [SECURITY][admin] Admin roles stored but never enforced
Any admin account can ban sellers, touch ledger, and payment ops regardless of role. Add
role-check middleware (e.g. requireRole('superadmin')) and apply per-route: destructive +
financial routes restricted, read routes open to all admin roles. Map every /api/admin route
to a required role in one table in the code.
VERIFY: locally create limited-role admin → GET dashboards 200, but ban/ledger/payment
routes → 403; superadmin → 200.
*Verification*: Created `ADMIN_ROLE_MAPPING` mapping table inside `server.js` and defined `authorizeAdminRoute` and `requireRole` middlewares. Integrated the authorization check dynamically inside `authenticateAdminToken` by parsing `req.route.path` and comparing against allowed roles. Created test script `test_admin_roles.js` that successfully verifies that limited admin ('admin' role) can perform read-only actions (like GET dashboard summary) but is blocked with `403 Forbidden` on modifying actions (like POST ban seller), while super admin ('super_admin' role) successfully passes the check.

## #S4 ✅ FIXED [SECURITY][stability] Unawaited DB write in generateTokens() + no unhandledRejection handler
Every login/register fires an unawaited promise that can crash the whole backend on a Neon
cold-start blip. Fix: await the write inside try/catch (decide: failure = fail the login, or
log-and-continue if the write is non-essential — state which and why). Add process-level
handlers for unhandledRejection and uncaughtException that log and keep the server alive.
Audit for other unawaited DB calls (grep for .query/.insert not awaited).
VERIFY: locally simulate DB failure during login (point to bad DB or mock reject) → server
responds with error and STAYS UP; grep audit output pasted.
*Verification*: Changed `generateTokens` to be `async` and `await` the refresh token database insertion. We decided to fail the login with a 500 error because the refresh token is essential for session longevity. We added a process-level `unhandledRejection` handler at the bottom of `server.js`. Created `test_unawaited_promise.js` which simulates a database failure on refresh token insert; the server responded with a 500 status gracefully and remained alive and responsive (confirmed via subsequent requests). Checked that all other `db.prepare(...).run/get/all` calls in handlers are correctly awaited.

# ===== FUNCTIONAL — BLOCKS CORE FLOWS =====

## #F5 ⬜ [seller-studio] Pricing step infinite loop traps sellers (pricing-a → pricing-b → photos → pricing-a)
Next-button navigation cycles and never reaches Shipping. Fix the step-order map/state machine
of the 6-step wizard so forward navigation is strictly linear and Back works symmetrically.
VERIFY: local wizard walkthrough pasted as step list: details → photos → pricing-a →
pricing-b → shipping → review, via Next only.

## #F6 ⬜ [seller-studio] Wizard steps fake success when save fails
Every step shows success even when the API save errored — sellers "publish" nothing. Fix: each
step's save must await the response, block advancing on failure, and show the real error to
the seller. Publish must verify all steps persisted.
VERIFY: locally stop the API mid-wizard → step shows error and does NOT advance; with API up,
publish → listing exists in DB with all step data.

## #F7 ⬜ [seller-studio] Hardcoded personal pickup address (Pune) pre-selected for every new seller
Remove the hardcoded default entirely. New sellers get an empty address form with required
validation; pickup_address_id only set after the seller submits their own address.
VERIFY: grep confirms the hardcoded address is gone from the codebase; new seller onboarding
locally shows empty required address form.

## #F8 ⬜ [SECURITY][uploads] No file-type validation on uploads
Any file type can be uploaded and is served statically (uploaded .html = hosted phishing page).
Fix: whitelist mime + extension (jpg/jpeg/png/webp), verify magic bytes not just extension,
enforce size limit, and serve the uploads dir with Content-Disposition/nosniff headers.
VERIFY: locally upload .html, .svg, .exe → 4xx rejected; .jpg/.png → 200 and renders.

# ===== DATA INTEGRITY / TRUST =====

## #D9 ⬜ [trust] Fake 4.5 default rating for sellers with zero reviews
Remove the fabricated default. Zero reviews → show "New seller / No reviews yet", no stars.
Check both seller profile and product cards.
VERIFY: local seller with 0 reviews shows no numeric rating anywhere; grep for hardcoded 4.5 gone.

## #D10 ⬜ [seller-studio] "Add Color Variant" button dead despite full backend support
Wire the button to the existing variants endpoint: UI to add/name/remove variants in the
wizard and edit page, persisted and rendered on the buyer product page.
VERIFY: locally add 2 variants → API returns them → visible on product page.

## #D11 ⬜ [trust] No curation/approval gate despite UI promising 24hr review
Do NOT gate individual listings — owner does not want to manually approve every listing.
Instead:
  (a) Remove/soften any UI copy promising a 24hr per-listing review (buyer-facing and
      seller-facing) so it doesn't overpromise something that isn't happening.
  (b) Add a SELLER-level verification gate instead: new sellers get status 'pending_verification'
      on signup; their listings can be created/saved as drafts but are excluded from the buyer
      feed until the seller's status flips to 'verified'. Admin panel (sellers page) gets an
      approve/reject action on the SELLER record. Once a seller is verified, all their current
      and future listings publish normally with no further per-listing approval step.
  (c) Owner can still view/edit any listing after the fact from admin — this is a light-touch
      quality pass, not a publish gate. No per-listing status blocking needed beyond the
      seller-level check.
VERIFY: locally create a new (unverified) seller + listing → listing not in GET /api/products;
approve the SELLER via admin API → listing appears without any per-listing approval action;
grep confirms old "reviewed within 24 hours" copy no longer appears anywhere in buyer/seller UI.

## #D12 ⬜ [chat] "Chat with Buyer" from Orders writes to a table nothing reads
Messages go to a dead table. Root-cause which chat system the buyer side actually reads, and
point this entry into that same conversation flow (or read path) so both sides see one thread.
Do not create a third path.
VERIFY: locally send message from seller Orders → appears in the buyer's chat view for that
order; the dead-table write removed or migrated.

# ===== ORIGINAL ROUND 1 LIST =====

## #1 ✅ FIXED [CRITICAL][seller-studio] js/listing-details.js returns 404
   - Fix: Added type="module" and correct relative path to script tag in listing-details.html
   - Files changed: frontend/seller/listing-details.html
Listing details page imports js/listing-details.js → 404 in production. Categories dropdown
empty, listing wizard fails. Likely cause: file not included in Vite build inputs (multi-page
config) or path only valid in dev.
VERIFY: `npm run build && npx vite preview` then curl the built page's script URL → 200,
and categories dropdown populates.

## #2 ⬜ [HIGH][catalog-sync] Published listing doesn't reach buyer products API
GET api.thetohfa.in/api/products/2 → 404 for an active published listing. Trace the publish
flow: does publish write to the table/status the buyer products endpoint reads? Check status
filter mismatch (e.g. 'active' vs 'published') or listings/products table split.
Likely also fixes: #3 (seller catalog missing listing) and the /buyer/category.html 404
console errors.
VERIFY: publish a listing via local API → curl /api/products/:id → 200, and it appears in
GET /api/products list.

## #3 ⬜ [MEDIUM][seller-catalog] New listing not in seller catalog (checkbox data-id missing)
Re-verify after #2; if still broken, trace GET catalog endpoint + rendering.
VERIFY: create listing locally → appears in catalog list with checkbox.

## #4 ⬜ [HIGH][auth] Seed buyer + seller credentials rejected on live site
diya@tohfa.in and kshitijakar@gmail.com fail login. Check seed script vs live Neon DB:
users missing, or password hash mismatch (bcrypt rounds/algo changed?). Create a proper
seed script for QA accounts (qa-buyer@tohfa.in / qa-seller@tohfa.in) idempotent + rerunnable.
VERIFY: run seed against local DB → POST /api/auth/login → 200 with token, for both roles.
🟡 note: owner must run seed against live Neon DB.

## #5 ⬜ [HIGH][assets] Dead Unsplash images on /, buyer/home, mobile-buyer/home, Buyer Home
photo-1576016770956, photo-1602872030219, photo-1544816155, photo-1578500494198 return
errors. Download suitable replacements ONCE into /public/img/ (or assets dir), self-host,
and replace ALL references across desktop + mobile pages. No hotlinking.
VERIFY: grep shows zero remaining references to the dead URLs; local page load shows all
img.naturalWidth > 0.

## #6 ⬜ [HIGH][assets] googleusercontent aida-public placeholder images (admin sellers,
admin products, buyer/categories) — ERR_ABORTED / ERR_BLOCKED_BY_ORB
These are AI-generated placeholder image URLs that don't resolve. Replace with self-hosted
placeholder assets or real category images.
VERIFY: grep 'aida-public' returns nothing; pages load with no failed image requests.

## #7 ⬜ [HIGH][assets] transparenttextures.com natural-paper.png blocked (CORS/ERR_FAILED)
Download the texture, self-host in /public/img/textures/, update CSS reference(s).
VERIFY: grep 'transparenttextures' returns nothing.

## #8 ⬜ [HIGH][assets] /uploads/avatars/default-avatar.png 404
Default avatar file missing on server. Add the asset to the repo/uploads handling, or point
default to a bundled frontend asset instead of the uploads dir.
VERIFY: curl the avatar path locally → 200.

## #9 ⬜ [HIGH][admin-api] GET /api/admin/dashboard/footfall?period=7d → HTTP 500
Read the controller: find the throwing query (likely SQL error, missing table/column, or
date-range bug). Fix + add try/catch returning 4xx/empty data instead of 500.
VERIFY: curl locally with admin token → 200 with valid JSON.

## #10 ⬜ [HIGH][admin-api] ledger.html fires 4 dashboard API calls → ERR_ABORTED
ledger.html appears to load dashboard JS (summary, revenue-chart, top-products,
seller-activity aborted). Likely wrong script include or shared JS running on wrong page.
Make ledger load only its own controller.
VERIFY: local ledger page load → no dashboard API calls in network log, no console errors.

## #11 ⬜ [HIGH][seller-studio] Post-publish edit restrictions not enforced
Name + Category editable after publish, no lock icons. Implement per spec: restricted fields
disabled + lock icon when listing status is published; ALSO enforce server-side in the
update endpoint (reject changes to restricted fields post-publish).
VERIFY: local: publish → edit page shows locked fields; PATCH with restricted field → 4xx.

## #12 ⬜ [MEDIUM][recommendations] "You May Also Like" grid missing on product page
Spec says it reuses existing grid components. Check if section exists but fails silently
(API 404 → empty → hidden) or was never wired on the live product page. Implement/repair.
VERIFY: local product page shows grid with ≥1 product (given seeded data).

## #13 ⬜ [MEDIUM][buyer-chat] No Customise/Chat button on seller profile page
Entry point to AI Concierge missing on seller profile. Check if button exists in another
variant (desktop vs mobile) and add the missing entry point linking into the concierge flow.
VERIFY: local seller profile shows button; click opens chat UI.

## Remaining console-error findings (frontend 404s on /, buyer/home, mobile-buyer/home,
## 400 on buyer/categories + admin/products) — expected to be resolved by #2, #5, #6, #8.
## After #1-#13 are done, re-check these pages locally and open new items ONLY if errors remain.
