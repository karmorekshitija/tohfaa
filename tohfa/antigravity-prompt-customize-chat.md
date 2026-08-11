# Tohfa — Customize / Bulk Order Chat
### Bot-mediated buyer↔seller negotiation flow

**Antigravity prompt file · Feature 1 (chat panel) of the AI roadmap**
Owner: Kshitija (backend) · Stack: Node/Express + PostgreSQL · LLM: Gemini
Generated: June 2026 · Status: ready for execution, contains CONFIRM-FIRST checkpoints

---

> ### ⚠️ Read this before doing anything else.
>
> This prompt assumes a Node/Express + PostgreSQL backend. Tohfa's history includes *both* a FastAPI+PostgreSQL track and an earlier Node+SQLite track. **Before writing any code**, inspect the live repo at `TohfaHub_project-1` and confirm:
>
> - Which server actually boots (`server.js` / `app.js` / FastAPI `main.py`?)
> - Which DB connection is active (check `.env`, connection strings, migration folders)
> - If a Node/Express + PostgreSQL server does **not** currently exist, stop and report this back instead of scaffolding a parallel server — ask whether to (a) add Postgres support to the existing Node app, or (b) create a new service.
>
> Do not proceed past this checkpoint silently. State findings in chat before Task 1.

---

> ### 🛑 No new frontend surfaces. Use existing entry points only.
>
> This feature is **not** a new screen or panel to be designed from scratch. It must plug into surfaces that already exist in Tohfa:
>
> - **Buyer side:** the existing "chat" / "Talk to Seller" option already present on the product page. Wire this feature's logic into that existing entry point — do not create a separate or duplicate chat trigger.
> - **Seller side:** the existing **Messages** section/tab in Seller Studio. This feature's threads, bot-collected summaries, and quote tools must appear inside that existing Messages UI — do not create a new seller-side inbox or panel alongside it.
>
> Before Task 4/5 below, Antigravity must first **locate and inspect** the existing buyer chat trigger and the existing seller Messages section in the live codebase, and report back their current structure (component names, file paths, current state) *before* modifying anything. If either doesn't actually exist yet despite being referenced elsewhere in the product spec, stop and flag this rather than building a new one unprompted.

---

## 1. What this feature is

A buyer viewing a customizable or bulk-eligible product taps **"Talk to Seller."** A chat panel opens with the product auto-attached as a card. Because the seller isn't online 24/7, a **Gemini-powered bot** handles the initial intake — asking the right structured questions depending on whether this is a customization request or a bulk order — then hands off to the human seller once enough information is gathered. The seller reviews everything the bot collected, optionally chats directly with the buyer, sets a manual price, and sends a quote. The buyer can accept and pay immediately (one-time Razorpay payment, not cart checkout), or counter and continue negotiating.

This is the implementation of the previously-specified **Customize tab** chat-first intake with live seller escalation — not a separate feature.

## 2. State machine

This is the backbone of the whole feature. Every request thread lives in exactly one of these states:

`bot_collecting` → `pending_seller_review` → `seller_negotiating` → `quote_sent` → `accepted_paid`

| State | Meaning | Who acts | Next state(s) |
|---|---|---|---|
| `bot_collecting` | Bot is asking structured questions (color/photos/text/qty for customization; qty/date/specs for bulk) | Buyer answers, Bot asks | `pending_seller_review` |
| `pending_seller_review` | Buyer confirmed no more questions; bot told them "order is in review." Waiting for seller to come online. | Seller | `seller_negotiating` or `quote_sent` |
| `seller_negotiating` | Seller is online, chatting live with buyer to clarify details (optional step — can be skipped straight to quote_sent) | Seller ↔ Buyer | `quote_sent` |
| `quote_sent` | Seller has set a manual price and sent it to buyer for approval | Buyer | `accepted_paid` or back to `seller_negotiating` (buyer counters) |
| `accepted_paid` | Buyer accepted and paid via Razorpay. Real order created, visible in buyer's Orders tab. | — (terminal) | — |

> **Note on seller decline:** Per spec, the seller can informally decline a request in the chat (e.g. "can't do this color" / "out of stock") but this is **not** a tracked formal status for v1 — it's just a chat message, and the thread can simply go stale or the seller can close it. Don't over-engineer a `declined` state unless asked.

## 3. Two request types, same skeleton

| Field the bot collects | Customization request | Bulk order request |
|---|---|---|
| Color | ✅ | only if product is also customizable |
| Photos to add | ✅ | only if product is also customizable |
| Text to add | ✅ | only if product is also customizable |
| Quantity | ✅ | ✅ |
| Needed-by date | — | ✅ |

Both end with the same bot prompt: *"Do you have any other questions for the seller, or would you like to confirm and proceed?"* — and both flow into the same `pending_seller_review` state.

---

## 4. Build order (do these as separate Antigravity tasks, in order)

### ① Schema — confirm-first

> **Do not write migrations yet.** First inspect the existing `products`, `users`/`sellers`, and `orders` tables and propose a schema in chat. Use this as a starting proposal, not a final answer:

```
customization_requests
  id                uuid pk
  product_id        fk -> products
  buyer_id          fk -> users
  seller_id         fk -> users (derived from product owner)
  request_type      enum('customization', 'bulk')
  status            enum('bot_collecting','pending_seller_review',
                          'seller_negotiating','quote_sent','accepted_paid')
  collected_fields  jsonb   -- {color, photos[], text, quantity, needed_by_date}
  quoted_price      numeric, nullable
  razorpay_order_id text, nullable
  order_id          fk -> orders, nullable   -- set only on accepted_paid
  created_at        timestamptz
  updated_at        timestamptz

customization_messages
  id                  uuid pk
  request_id          fk -> customization_requests
  sender_type         enum('buyer','seller','bot')
  sender_id           fk -> users, nullable (null when sender_type = 'bot')
  message_text        text
  message_type        enum('text','product_card','quote_card','system')
  metadata            jsonb, nullable  -- e.g. quote_card holds {price, valid_until}
  created_at          timestamptz
```

Confirm field names/types against the real `products` and `orders` tables before running any migration. If `orders` already has a status enum, check whether `accepted_paid` requests should create a normal order row with a new status flag (e.g. `source: 'customization'`) rather than a fully separate flow — flag this choice back to Kshitija rather than assuming.

### ② Backend — Express routes

- `POST /api/requests` — buyer starts a thread from a product page (creates row, status `bot_collecting`, first message = product card)
- `POST /api/requests/:id/messages` — buyer or seller sends a message; if sender is buyer and status is `bot_collecting`, route through the Gemini bot handler before persisting the bot's reply
- `GET /api/requests/:id` — fetch thread + all messages (used by both buyer and seller views)
- `GET /api/requests?seller_id=` — seller's inbox of pending/active requests
- `PATCH /api/requests/:id/status` — explicit status transitions (e.g. buyer confirms → `pending_seller_review`; seller starts chatting → `seller_negotiating`)
- `POST /api/requests/:id/quote` — seller sets `quoted_price`, status → `quote_sent`, posts a `quote_card` message
- `POST /api/requests/:id/accept` — buyer accepts quote → creates Razorpay order (reuse existing Razorpay integration, one-time payment, not cart) → on payment webhook success, status → `accepted_paid`, create real order row
- `POST /api/requests/:id/counter` — buyer rejects quote with a note → status back to `seller_negotiating`

### ③ Gemini bot handler

Keep this as an isolated module (e.g. `services/customizationBot.js`), not inline in the route handler:

- Gemini API key on backend env only — never sent to client
- System prompt should encode: request type (customization vs bulk), which fields are still missing from `collected_fields`, and an instruction to ask exactly one missing field at a time in a warm, brief tone (matches Tohfa's "warm, genuine, non-formal" voice preference)
- Once all required fields are filled, bot's next message is always the "any more questions, or confirm?" prompt — this should be a deterministic check in code (all required fields present), not left to the LLM to decide it's "done," to avoid premature handoff
- Full reply, not streaming, for v1 — these are short structured Q&A turns, not long-form generation, so the complexity of streaming isn't worth it here
- Bot messages persist with `sender_type: 'bot'` so the seller's view can visually distinguish them from real buyer/seller chat

### ④ Frontend — buyer side (extend existing chat entry point)

> **Do not build a new chat panel.** Find the existing "Talk to Seller" / chat trigger on the product page and extend it.

- Locate the existing product-page chat trigger and whatever chat UI it currently opens (modal, slide-over, or page) — reuse that component
- First message in thread renders as a tappable product card (image + price, navigates to product page) inside the existing chat UI
- Bot questions render as chat bubbles, visually distinct (e.g. small "Tohfa Assistant" label + sage-tinted bubble) from seller's bubbles (forest-tinted), using whatever bubble component already exists if one does
- Quote card is a new component within the existing chat UI: price, "Accept & Pay" button (forest, gold hover), "Request Changes" button (outline style)
- "Accept & Pay" triggers Razorpay checkout modal immediately — per spec, payment happens at acceptance, not later
- Branded loading / error / empty states using the design tokens below, matched to whatever states the existing chat component already handles

### ⑤ Frontend — seller side (extend existing Messages section)

> **Do not build a new seller inbox or panel.** Find the existing Messages section/tab in Seller Studio and extend it.

- Locate the existing Messages section in Seller Studio — these customization/bulk threads should appear there alongside (or as a filtered view within) whatever message list already exists, not in a separate location
- Within an existing thread view, add the `collected_fields` structured summary card at the top (so seller doesn't have to scroll through bot Q&A to find the color/quantity/date), above the existing chat history component
- "Send Quote" form: price input + optional note → posts to `/quote` endpoint — add this as a new action within the existing thread view, not a new screen
- Seller can type free-text messages any time after `pending_seller_review` using the existing message-send input (this is what flips status to `seller_negotiating` on first seller message)

### ⑥ Tests

- `tests/e2e/customization-chat.spec.js` — full buyer flow: open chat → answer bot questions → confirm → (mock seller) receive quote → accept → mock Razorpay success → order appears in Orders tab
- Unit tests for the bot handler's "are all required fields present" logic — this is the most bug-prone part since it gates the bot→human handoff
- Extend `qa-findings.md` with a section for this feature

---

## 5. Design tokens (Tohfa Botanical Artisanship)

| Token | Value | Use |
|---|---|---|
| Forest | `#3D6B4F` | Seller bubbles, primary buttons, headers |
| Parchment | `#F7F3EC` | Background |
| Sage | `#8FAF82` | Bot bubbles, secondary accents |
| Violet | `#7B5EA7` | Buyer bubbles or active-state highlights |
| Gold | `#C8973A` | Hover states, "Accept & Pay" emphasis, price text |
| Headings | Playfair Display | Panel titles, seller inbox headers |
| Body | DM Sans | Chat text, buttons, labels |
| Mono accents | Space Mono | Timestamps, status tags, price figures |

All chat panel layouts must be 375px-safe (no horizontal scroll, tap targets ≥44px). Hover transitions on buttons should be subtle (150–200ms ease, color shift toward gold).

---

## 6. Explicit non-goals for this pass

- [ ] Streaming Gemini responses — explicitly deferred, full-reply only for v1
- [ ] Formal "seller declined" status — informal chat-level decline only
- [ ] Multi-round formal counter-offer tracking beyond a single back-and-forth — buyer can counter once into `seller_negotiating`, no need to build a full offer-history ledger yet
- [ ] WhatsApp notifications for this flow — that's the separately-scoped Feature 3 track; don't conflate the two even though both touch "seller gets notified"
- [ ] **Any new chat panel, modal, or seller inbox screen** — this entire feature lives inside the existing buyer product-page chat trigger and the existing seller Messages section. New UI shells are explicitly out of scope.

## 7. Final checklist before marking this done

- [ ] Confirmed live stack (Node/Express + PostgreSQL) against actual repo, not assumed
- [ ] Schema proposal confirmed with Kshitija before migration ran
- [ ] Gemini API key confirmed present in backend `.env`, never referenced in any frontend file
- [ ] Bot handoff logic is deterministic (code-checked field completeness), not LLM self-judgment
- [ ] Razorpay one-time payment path tested separately from existing cart checkout path — confirm it doesn't share state/cart logic incorrectly
- [ ] Buyer and seller views both tested at 375px width
- [ ] Confirmed no new chat panel/modal or new seller inbox was created — feature lives inside the existing buyer chat trigger and existing seller Messages section
- [ ] E2E test passes: full bot→seller→quote→pay→order-created path
- [ ] `qa-findings.md` updated
