# TohfaHub — QA Walkthrough Checklist (BUGLIST_v2)

This document serves as the tracking template for the manual QA walkthrough (Section 14 of the Developer Handoff Report).

---

## 14.1 Buyer Flow

| Step | Desktop Console | Desktop Network | Mobile Console | Mobile Network | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Buyer Auth:** Register buyer → login → logout → login | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **2. Browse & Search:** Browse categories → subcategories → search | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **3. Product Detail:** Open product → check images → recommendations grid | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **4. Checkout:** Add to cart → checkout → Razorpay test payment | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **5. Order History:** Confirm order appears in history | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **6. Seller Profile:** Visit profile → follow/unfollow → reviews | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **7. Bespoke Chat:** Initiate AI concierge chat | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **8. Customization Intake:** Complete intake questions | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **9. Account Management:** Notifications, wishlist, addresses | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **10. Occasions:** Save an occasion & verify | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |

---

## 14.2 Seller Flow

| Step | Desktop Console | Desktop Network | Mobile Console | Mobile Network | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Apply:** Submit application form with all fields | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **2. Queue Check:** Verify application in admin queue | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **3. Approval:** Get approved → access dashboard without re-login | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **4. Create Listing:** Multi-step wizard → publish listing | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **5. Catalog Sync:** Verify listing appears in buyer catalog with images | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **6. Edit Lock:** Edit title/category on active listing → confirm locked | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **7. Studio Management:** Orders, payouts, analytics, messages, disputes | [ ] Pass | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |

---

## 14.3 Admin Flow

| Step | Access Check | Console Errors | Network Errors | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Role-Based Auth:** Test all 5 admin roles (super_admin, ops_lead, support_rep, finance_manager, category_manager) | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **2. Seller Applications:** Approve & reject applications | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **3. Financials:** Orders, ledger, payment health pages | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **4. Session Persistence:** Stay logged in >15 min (verify token refresh) | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |
| **5. UI Settings:** Test all controls on `ui-settings.html` | [ ] Pass | [ ] Pass | [ ] Pass | Pending | |

---

## 14.4 WhatsApp Bot Flow

| Step | Status | Notes |
| :--- | :--- | :--- |
| **1. Connection:** Send test message to WhatsApp business number | Pending | |
| **2. Commands:** Test `show today's orders`, `pause [product]`, `add product` | Pending | |
| **3. Conversations:** Verify customization and bulk-order phases | Pending | |
| **4. Backend Sync:** Verify completed WhatsApp conversation creates order record | Pending | |

---

## 14.5 Fresh Bug Log (Identified During QA)

| Bug ID | Page / Area | Device (Desktop/Mobile) | Description | Severity (Critical/High/Medium/Low) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *None reported yet* | | | | | |
