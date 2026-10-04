# Healthy Hunger – Task queue

One task = one session. Prompt: **"Do task P1-03 from doc/TASKS.md."**
Tick `[x]` when done. Each task ends with `pnpm typecheck && pnpm lint` passing.
Phases and design reasoning live in [`PLAN.md`](./PLAN.md); scope in [`goal`](./goal).

Legend: **Files** = where the work goes · **Done when** = the check that closes it · ⛔ = blocked by an open question (PLAN.md §5).

---

## Phase 0 – Design & 3D prototype
- [ ] **P0-01 Sign-off on look + hero** – Owner reviews `/` and `/menu` on laptop + mid-range Android.
  Done when: owner approves; hero ≥ 55 fps laptop, smooth on Android (else open a perf task).

## Phase 1 – Foundation (schema, auth lib, uploads, cached menu reads already exist)
- [ ] **P1-01 Seed real menu** ⛔ final menu/prices – `prisma/seed.ts`.
  Done when: `pnpm db:seed` loads all categories/items/add-ons; `/menu` shows them.
- [ ] **P1-02 Login page + actions** – `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`.
  Zod-validated, rate-limited (`rate-limit.ts`), sets session cookie; logout action.
  Done when: seeded owner can log in/out; 6th bad attempt in the window is refused.
- [ ] **P1-03 Admin shell** – `src/app/admin/(dashboard)/layout.tsx`, `src/components/admin/sidebar.tsx`, `header.tsx`.
  Sidebar links filtered by role, user menu + logout, offline indicator.
  Done when: `/admin` shows shell for staff + owner; owner-only links hidden for staff.
- [ ] **P1-04 Menu manager – categories** – `src/app/admin/(dashboard)/menu/` (page + actions).
  Add / rename / reorder / hide; `updateTag(MENU_TAG)` after writes.
  Done when: change shows on `/menu` immediately.
- [ ] **P1-05 Menu manager – items list + edit form** – same folder, `item-form.tsx`.
  Name, desc, price, protein, kcal, tags, category, visible, sort.
  Done when: owner edits an item price and `/menu` updates.
- [ ] **P1-06 Item photos** – upload in item form via `saveMenuPhoto`; delete old file on replace.
  Done when: phone photo uploads as ≤1200px WebP and shows on the menu card.
- [ ] **P1-07 Add-ons CRUD + link to items** – add-on table + multiselect in item form.
  Done when: add-ons appear in the item sheet on `/menu`.
- [ ] **P1-08 Sold-out switch (staff too)** – one-tap toggle in item list; staff allowed.
  Done when: staff marks item sold out; card shows "Sold out" on `/menu`.
- [ ] **P1-09 Remove mock menu** – delete `src/lib/mock-menu.ts` + any leftover imports; update README table.
  Done when: no references remain; build passes.

## Phase 2 – Customer site
- [ ] **P2-01 Landing from DB** – Today's Pick + bestsellers read via `getPublicMenu`; café details from `CafeSettings`.
- [ ] **P2-02 Landing scroll story** – camera moves bowl → "nutrition explode" → Today's Pick (GSAP or drei `ScrollControls`).
  Done when: smooth on laptop; low GPU tier / reduced motion gets poster only.
- [ ] **P2-03 SEO** – metadata, OG image, Maps link, `sitemap`/`robots`.
- [ ] **P2-04 Menu filters + search** – High protein (≥15 g), Light (<300 kcal), Bestseller, name search.
- [ ] **P2-05 Table route** – `src/app/t/[table]/page.tsx` reuses menu, table pre-filled; unknown/inactive table → `/menu`.
- [ ] **P2-06 View-only mode** – ordering-off setting hides cart/ordering with a notice.
- [ ] **P2-07 Order form UI** ⛔ dine-in phone rule – dine-in/parcel, pickup slot, note, consent, privacy link (RHF + Zod).
- [ ] **P2-08 Returning-customer autofill** – lookup by phone (rate-limited, returns name/email only).
- [ ] **P2-09 Place-order action** ⛔ GST – server pricing from DB, one open order per table, per-phone hourly limit, ordering-off check, customer upsert, status log.
  Done when: unit tests (Vitest) cover pricing + guard rails.
- [ ] **P2-10 Order status page** – `src/app/order/[id]/page.tsx` with polling.
- [ ] **P2-11 Privacy page** – `src/app/privacy/page.tsx`, linked from footer + form.
- [ ] **P2-12 Perf check** – Lighthouse on `/menu`, throttled 4G < 2 s; no three.js in menu bundle.

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
- [ ] **P4-05 Tables & QR** ⛔ table count – add/rename tables, print-ready QR cards.
- [ ] **P4-06 Settings** – café details, ordering on/off, tax %, staff accounts (owner).

## Phase 5 – Launch
- [ ] **P5-01 Docker Compose** – Next.js + Postgres + Caddy; production env.
- [ ] **P5-02 Deploy to Mumbai VPS** ⛔ domain – DNS + HTTPS.
- [ ] **P5-03 Backups** – daily `pg_dump`, 30-day retention, tested restore.
- [ ] **P5-04 Hardening** – security headers, rate limits verified, final privacy page.
- [ ] **P5-05 E2E** – Playwright order flow on phone viewport; Lighthouse pass.
- [ ] **P5-06 Print table QR cards.**
