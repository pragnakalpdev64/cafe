# Healthy Hunger – Task queue

One task = one session. Prompt: **"Do task P1-03 from doc/TASKS.md."**
Tick `[x]` when done. Each task ends with `pnpm typecheck && pnpm lint` passing.
Status board (for the team): https://claude.ai/artifact/GC4ttoJYv6kkz93LDh6oAa – after ticking tasks, regenerate with `node scripts/status-board.mjs <scratch>/build-board.html` and republish to that URL.

**Next up (in order):** P2-12 → P1-09 → P4-05 → P4-06 → P5-01 → P5-02 → P5-03 → P5-04 → P5-06. This is the shortest path to launching the selection-only v1 (QR cards, owner settings + staff logins, deploy). Order placing (P2-07–P2-10, most of Phase 3) waits until the owner asks; run P0-02 in parallel once a 3D scan is chosen.
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

## Phase 2A – Selection-only v1 (current scope, decided 5 Oct 2026)
Customers don't place orders and no totals are shown. They pick items; staff see each table's (or phone number's) list in the dashboard.
- [x] **P2A-01 Table route** – `src/app/t/[table]/page.tsx` reuses the menu with the table pre-set; unknown/inactive table → `/menu`.
  Done when: `/t/t1` shows "Table T1" on the menu.
  ✅ Built 5 Oct: `/t/t3` shows "You're at Table T3"; unknown slug redirects to `/menu`.
- [x] **P2A-02 Customer list (no totals)** – cart becomes "Your list": items, add-ons, quantity only; no ₹ totals anywhere in it. On `/menu` the guest picks a table or enters a phone number (takeaway).
  Done when: no total amount shows in the cart bar, list or item sheet.
  ✅ Built 5 Oct: `cart-bar.tsx` ("Your list", table/takeaway picker), lists older than 12 h are dropped on the device.
- [x] **P2A-03 Share list with staff** – list auto-syncs to the server (`Selection` table, one row per device), validated against the DB, rate-limited; empty list removes it.
  Done when: editing the list on a phone updates the DB within ~1 s.
  ✅ Built + verified 5 Oct: `src/app/selection-actions.ts`, `Selection` model; guest bar shows "Staff can see it · Table T3".
- [x] **P2A-04 Staff "Table lists" screen** – `/admin` shows lists grouped by table + a takeaway lane (phone masked for staff), refreshes every 5 s, "Clear" per table/guest.
  Done when: staff see a table's picks within 5 s and can clear them.
  ✅ Built + verified 5 Oct: `live-lists.tsx`, `/api/admin/selections`; new list showed within 5 s, Clear removes the row.

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
- [ ] **P2-07 (later) Order form UI** (default: phone required for both types, per goal doc; switchable later) – dine-in/parcel, pickup slot, note, consent, privacy link (RHF + Zod).
- [ ] **P2-08 (later) Returning-customer autofill** – lookup by phone (rate-limited, returns name/email only).
- [ ] **P2-09 (later) Place-order action** (tax from `CafeSettings.taxBasisPoints`, 0 until GST is confirmed) – server pricing from DB, one open order per table, per-phone hourly limit, ordering-off check, customer upsert, status log.
  Done when: unit tests (Vitest) cover pricing + guard rails.
- [ ] **P2-10 (later) Order status page** – `src/app/order/[id]/page.tsx` with polling.
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
- [ ] **P4-01 Customer list + search** (owner).
- [ ] **P4-02 Customer profile** – history, visits, spend, favourites, notes, consent.
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
