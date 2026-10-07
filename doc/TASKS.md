# Healthy Hunger – Task queue

One task = one session. Prompt: **"Do task P1-03 from doc/TASKS.md."**
Tick `[x]` when done. Each task ends with `pnpm typecheck && pnpm lint` passing.
Status board (for the team): https://claude.ai/artifact/GC4ttoJYv6kkz93LDh6oAa – after ticking tasks, regenerate with `node scripts/status-board.mjs <scratch>/build-board.html` and republish to that URL.

**Next up (in order):** P4-03 → P4-04, then launch (Phase 5) when the owner asks. Run P0-02 in parallel once a 3D scan is chosen.
Phases and design reasoning live in [`PLAN.md`](./PLAN.md); scope in [`goal`](./goal).

Legend: **Files** = where the work goes · **Done when** = the check that closes it · ⛔ = blocked by an open question (PLAN.md §5).

---

## Phase 0 – Design & 3D prototype
- [ ] **P0-01 Sign-off on look + hero** – Owner reviews `/` and `/menu` on laptop + mid-range Android.
  Done when: owner approves; hero ≥ 55 fps laptop, smooth on Android (else open a perf task).
- [ ] **P0-02 Photoreal hero** – feedback: current bowl looks animated/CGI. Replace code-built salad with a real
  photo-scanned GLB (own dish via Polycam = best; or a CC-BY Sketchfab veg salad scan + credit line).
  Keep: lazy load on `/` only, poster fallback, scroll story. Add: HDRI studio light, ACES tone mapping, DOF, Draco/Meshopt GLB ≤ 3 MB.
  Done when: owner says it looks real; LCP unaffected (poster first).

## Phase 1 – Foundation
- [ ] **P1-01 Seed real menu** ⛔ final menu/prices – `prisma/seed.ts`.
  Done when: `pnpm db:seed` loads all categories/items/add-ons; `/menu` shows them.
- [x] **P1-02 Login page + actions** – `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`.
  Zod-validated, rate-limited (`rate-limit.ts`), sets session cookie; logout action.
  Done when: seeded owner can log in/out; 6th bad attempt in the window is refused.
  ✅ Built 4 Oct: `src/app/admin/login/`; also `/admin/session-ended` clears stale cookies (no redirect loop).
- [x] **P1-03 Admin shell** – `src/app/admin/(dashboard)/layout.tsx`, `src/components/admin/sidebar.tsx`, `header.tsx`.
  Sidebar links filtered by role, user menu + logout, offline indicator.
  Done when: `/admin` shows shell for staff + owner; owner-only links hidden for staff.
  ✅ Built 4 Oct: `src/components/admin/admin-nav.tsx` (sidebar + mobile sheet), `offline-banner.tsx`.
- [x] **P1-04 Menu manager – categories** – `src/app/admin/(dashboard)/menu/` (page + actions).
  Add / rename / reorder / hide; `updateTag(MENU_TAG)` after writes.
  Done when: change shows on `/menu` immediately.
  ✅ Built 4 Oct: Categories tab in `src/components/admin/menu/`.
- [x] **P1-05 Menu manager – items list + edit form** – same folder, `item-form.tsx`.
  Name, desc, price, protein, kcal, tags, category, visible, sort.
  Done when: owner edits an item price and `/menu` updates.
  ✅ Built 4 Oct: `item-form.tsx`; high-protein tag is automatic (≥15 g), bestseller is a switch.
- [x] **P1-06 Item photos** – upload in item form via `saveMenuPhoto`; delete old file on replace.
  Done when: phone photo uploads as ≤1200px WebP and shows on the menu card.
  ✅ Built 4 Oct: verified 1600px JPEG → 1200px WebP; old file deleted on replace/remove.
- [x] **P1-07 Add-ons CRUD + link to items** – add-on table + multiselect in item form.
  Done when: add-ons appear in the item sheet on `/menu`.
  ✅ Built 4 Oct: Add-ons tab + checkboxes in item form.
- [x] **P1-08 Sold-out switch (staff too)** – one-tap toggle in item list; staff allowed.
  Done when: staff marks item sold out; card shows "Sold out" on `/menu`.
  ✅ Built 4 Oct: staff see only sold-out switches.
- [x] **P1-09 Move seed data out of `src/`** – `src/lib/mock-menu.ts` is now only used by `prisma/seed.ts`; move it to `prisma/seed-data.ts`, update imports + README.
  Done when: nothing in `src/` imports it; `pnpm db:seed` + build pass.
  ✅ 5 Oct: now `prisma/seed-data.ts` (menu + café defaults); `src/lib/cafe.ts` keeps only `NUTRITION_NOTE`.

## Phase 2A – Shared lists (done, being replaced by 2B)
Built 5 Oct (P2A-01…04): table QR route, guest list without totals, list synced to staff, "Table lists" screen.
The owner clarified that the real flow needs order confirmation and billing, so Phase 2B turns the list into orders.

## Phase 2B – Orders & bills (current, decided 5 Oct 2026)
Flow: guest picks items (**staff see it live**) → guest taps **Confirm – I'm done** → cashier goes to the table and **confirms the order on the dashboard with the guest's name + phone** → **Send to kitchen** → **Served** / **Ready to collect** → cashier **Generate bill** (one per table visit) → **Paid**. Customers never see totals; no tax for now.
- [x] **P2B-01 Order + bill data model** – reuse `Order`/`OrderItem`/`OrderStatusLog`; add `Bill` (number, table, orders, subtotal, tax, total, payment method, paid at) and `Order.billId`.
  ✅ 5 Oct: `Bill` + `Order.billId` (payment on the bill); `src/lib/pricing.ts` with tests.
- [x] **P2B-02 Live selections + cashier confirms** – guest list mirrors live to the dashboard (`Selection` per device: SELECTING → READY → CONFIRMED); guest "Confirm – I'm done" marks READY; cashier's "Confirm order" dialog (edit items, phone → returning name, note, consent) creates the Order as ACCEPTED with server prices and a status log; guest's phone shows "Order #N confirmed".
  ✅ 5 Oct: realtime = Server-Sent Events on Postgres LISTEN/NOTIFY (`src/lib/realtime.ts`, `/api/admin/live/stream`, `/api/guest/stream`). Verified two tabs: pick → dashboard in ~0.7 s; Ready + chime; cashier confirmed #4 (₹397, tea qty edited); guest phone updated by itself.
- [x] **P2B-03 Customer order status** – guest sees their confirmed order's items (no prices) and live status (Confirmed → In kitchen → Served) via `/api/guest/stream`; new picks after an order start a new round for the same table.
  Done when: status changes made by staff appear on the guest's phone within a second.
  ✅ 5 Oct: `order-tracker.tsx` – step bar (dine-in Confirmed → In the kitchen → Served; takeaway adds Ready to collect / Picked up), items without prices, cancel reason; bar shows "Order #N · status"; active orders also shown under a new list. Verified live on #5.
- [x] **P2B-04 Staff: kitchen + served** – on the Live orders screen: Send to kitchen, Served / Ready to collect, Cancel with reason; columns or filters by status; status log; live via the existing stream.
  Done when: staff take an order from Confirmed to Served without reloading.
  ✅ 5 Oct: `orders-panel.tsx` – groups Confirmed / In the kitchen / Ready to collect / Done today; Send to kitchen, Served, Ready to collect, Picked up, Cancel with reason (quick reasons); rules in `src/lib/order-flow.ts` (tested). Owner request: staff can **edit items** (qty / remove / add from a searchable menu with add-ons) in the Confirm dialog and on a confirmed order until it goes to the kitchen – re-priced and logged. Verified #5: added Green Tea, edited to 2 (₹407), kitchen → served, guest updated live; #2 cancelled with reason. Takeaway steps covered by unit tests only so far.
- [x] **P2B-05 Cashier: bill + payment** – per table "Generate bill" combines served, unbilled rounds; bill view (print-friendly); Paid with Cash / UPI / Card; table frees up; customer visits + spend updated. Takeaway: bill per order.
  Done when: a two-round table visit produces one bill and is marked paid.
  ✅ 6 Oct: `billing-panel.tsx` (To bill grouped by table, waits while a round is unserved; Awaiting payment with Cash/UPI/Card, Print, Undo), `/admin/print/bill/[id]` 80 mm receipt, `src/lib/billing.ts` (tested). Verified T6: #5 + #6 → Bill #1 ₹526, paid by UPI, orders PAID, customer 1 visit / ₹526 spend; Undo on T5 works.
- [x] **P2B-06 Order history** – find bills/orders by date, number, phone, table; reprint a bill.
  ✅ 6 Oct: `/admin/orders` – date range, one search box (#order / #bill / phone / table / name), type + status, 50 per page, step history, reprint link; staff see masked phones.
- [x] **P2B-09 One QR, guests order themselves** (owner, 7 Oct) – no per-table QR or tables; guest picks Dine-in/Takeaway, enters name + phone and places the order (NEW); staff Accept → kitchen.
  ✅ 7 Oct: `placeOrder` in `src/app/selection-actions.ts` (server prices, ordering-off check, rate limits per phone + network, customer upsert); list sheet with Dine-in/Takeaway + details step (`cart-bar.tsx`, name/phone remembered on the device); dashboard "New orders" (chime) → Accept → "Accepted" → kitchen; dine-in bill = one guest's served orders; `/admin/qr` + `/admin/print/qr` (one code, 4 cards per A4); `/t/*` redirects to `/menu`; Tables screen removed. Verified #11 + #12 (same guest) → Bill #8 ₹348 by card; guest phone followed every step.
- [ ] **P2B-10 Drop unused table data** – remove `CafeTable`, `Order/Bill/Selection.tableId` and Selection READY with a migration (safe once no one needs old table history).
- [x] **P2B-07 Void bills instead of deleting them** – Undo bill currently deletes the bill, leaving a gap in bill numbers; keep it as VOID with a reason so numbering stays continuous (needed before GST invoices).
  ✅ 7 Oct: migration `void_bills` (`Bill.voidedAt/voidReason/voidedById/voidedOrderNumbers`); "Void bill…" asks a reason (quick picks), keeps the bill, unlinks its orders back to "To bill" and logs "Bill #N voided: reason" on each order; void bills can't be paid; print shows a VOID stamp. Verified: Bill #9 voided → #13 re-billed as #10 (no gap), history + print correct.
- [x] **P2B-08 Takeaway run-through in the browser** – Ready to collect → bill → Picked up is unit-tested only so far.
  ✅ 7 Oct: ran #9/#10 guest phone ↔ dashboard. **Bug fixed:** paying a takeaway bill before pickup jumped READY → PAID, so the parcel vanished from "Ready to collect" and the guest saw "Paid" before collecting. Now paying keeps it READY (card shows "Paid", Cancel hidden – also refused on the server), and "Picked up" finishes it as PAID (`statusOnPayment` in `order-flow.ts`, tested). Verified #10: kitchen → ready → Bill #7 UPI → still waiting → Picked up → Paid; history 6 steps.

## Phase 2 – Customer site (ordering parts deferred – see Phase 2A)
- [x] **P2-01 Landing from DB** – Today's Pick + bestsellers read via `getPublicMenu`; café details from `CafeSettings`.
  ✅ Built 4 Oct: `src/app/page.tsx` + `getCafeDetails` (rendered per request, data cached).
- [x] **P2-02 Landing scroll story** – camera moves bowl → "nutrition explode" → Today's Pick (GSAP or drei `ScrollControls`).
  Done when: smooth on laptop; low GPU tier / reduced motion gets poster only.
  ✅ Built 4 Oct (salad bowl, motion `useScroll`); realism rework tracked in P0-02.
- [x] **P2-03 SEO** – metadata, OG image, Maps link, `sitemap`/`robots`.
  ✅ Built 5 Oct: `opengraph-image.jpg` (64 KB, WhatsApp-safe), `robots.ts` (hides /admin, /api, /t), `sitemap.ts`, schema.org café JSON-LD. Set `SITE_URL` to the real domain at deploy (P5-02).
- [x] **P2-04 Menu filters + search** – High protein (≥15 g), Light (<300 kcal), Bestseller, name search.
- [ ] **P2-05 Table route** (superseded by P2A-01) – `src/app/t/[table]/page.tsx` reuses menu, table pre-filled; unknown/inactive table → `/menu`.
- [x] **P2-06 View-only mode** – ordering-off setting hides cart/ordering with a notice.
  ✅ Menu side built (`orderingEnabled` from CafeSettings); the on/off switch itself arrives with P4-06.
- [ ] **P2-07 (now part of 2B) Order form UI** (default: phone required for both types, per goal doc; switchable later) – dine-in/parcel, pickup slot, note, consent, privacy link (RHF + Zod).
- [ ] **P2-08 (now part of 2B) Returning-customer autofill** – lookup by phone (rate-limited, returns name/email only).
- [ ] **P2-09 (now part of 2B) Place-order action** (tax from `CafeSettings.taxBasisPoints`, 0 until GST is confirmed) – server pricing from DB, one open order per table, per-phone hourly limit, ordering-off check, customer upsert, status log.
  Done when: unit tests (Vitest) cover pricing + guard rails.
- [ ] **P2-10 (now part of 2B) Order status page** – `src/app/order/[id]/page.tsx` with polling.
- [x] **P2-11 Privacy page** – `src/app/privacy/page.tsx`, linked from footer + form.
  ✅ Built 5 Oct: describes the selection-only flow; lists auto-deleted after 24 h (`purgeOldSelections`). Have it legally checked before launch.
- [x] **P2-12 Perf check** – Lighthouse on `/menu`, throttled 4G < 2 s; no three.js in menu bundle.
  ✅ 5 Oct, prod build, Lighthouse mobile with devtools throttling (562 ms RTT, 1.5 Mbps, CPU ×4): LCP 1.7–1.8 s, perf 94, CLS 0; no three.js in the 14 menu scripts (334 KiB). Fix: menu cards no longer render hidden for an entrance animation (`AnimatePresence initial={false}`); favicon 149 KB → small. Follow-up idea: TTI 4.8 s – lazy-load the item/list sheets if taps feel slow on phones.

## Phase 3 – Live dashboard
- [ ] **P3-01 Live orders API** – `src/app/api/orders/live/route.ts` (staff auth, changes since timestamp).
- [ ] **P3-02 Tables view** – grid of table cards, 5 s polling (TanStack Query).
- [ ] **P3-03 Parcel lane** – sorted by pickup time; masked phone for staff.
- [ ] **P3-04 Board view** – columns New → Done.
- [ ] **P3-05 Status actions** – accept/prepare/ready/served, cancel with reason, optimistic updates, `OrderStatusLog`.
- [ ] **P3-06 New-order alert** – sound + highlight until accepted.
- [ ] **P3-07 Mark paid** – cash / UPI / card.
- [ ] **P3-08 Add items to open table order.**
- [ ] **P3-09 Counter order** – same form for walk-ins.
- [ ] **P3-10 Order history** – filters (date, number, phone, table, type, status).
- [ ] **P3-11 Bill / KOT print** ⛔ thermal printer – print CSS layouts.
- [ ] **P3-12 Offline banner + catch-up.**
- [ ] **P3-13 Mock service** – 20-order run with staff. Done when: no help needed.

## Phase 4 – Customers & reports
- [x] **P4-01 Customer list + search** (owner).
  ✅ 7 Oct: `/admin/customers` – totals (customers, said yes to offers, total spend), search by name or phone digits, sort by last visit / most visits / top spend / newest, "Offers only" filter, 50 per page, tap-to-call, link to the guest's orders (profile comes in P4-02). Visits = paid bills.
- [x] **P4-02 Customer profile** – history, visits, spend, favourites, notes, consent.
  ✅ 7 Oct: `/admin/customers/[id]` (name links from the list) – phone (tap to call), visits, total spend, average bill, customer since, last visit; favourite dishes (`favouriteItems` in `src/lib/customer-stats.ts`, tested; cancelled orders ignored); staff notes (save); consent with date + "Stop offers" (owner can only withdraw – opting in stays with the guest); latest 20 orders with status, items, total, bill no. + Full history link.
- [ ] **P4-03 Delete-on-request + CSV export** (owner) – `src/app/api/customers/export/route.ts`.
- [ ] **P4-04 Reports** – today, by type, top items, by hour/day/month (Recharts).
- [x] **P4-05 Tables & QR** – add/rename tables, print-ready QR cards.
  ✅ 5 Oct: `/admin/tables` (add, rename keeps QR slug, seats, on/off, remove) + `/admin/print/tables` (4 cards per A4, warns while SITE_URL is localhost). Still need the real table count from the café (6 seeded).
- [x] **P4-06 Settings** – café details, ordering on/off, tax %, staff accounts (owner).
  ✅ 5 Oct: `/admin/settings` – Café (details, hours, Today's pick, "Guests can make lists" switch), Staff logins (create with one-time password, new password, switch off – both end their sessions), My password. Tax % left out while there are no totals.

## Phase 5 – Launch
- [ ] **P5-01 Docker Compose** – Next.js + Postgres + Caddy; production env.
- [ ] **P5-02 Deploy to Mumbai VPS** ⛔ domain – DNS + HTTPS.
- [ ] **P5-03 Backups** – daily `pg_dump`, 30-day retention, tested restore.
- [ ] **P5-04 Hardening** – security headers, rate limits verified, final privacy page.
- [ ] **P5-05 E2E** – Playwright order flow on phone viewport; Lighthouse pass.
- [ ] **P5-06 Print table QR cards.**
