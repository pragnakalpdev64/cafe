# Healthy Hunger

Café website, QR menu and staff dashboard – one Next.js app with PostgreSQL.

- Scope: [`doc/goal`](doc/goal) · Brand: [`doc/brand-guide.jpg`](doc/brand-guide.jpg)
- Build plan and phases: [`doc/PLAN.md`](doc/PLAN.md)

## First-time setup (local PostgreSQL 14+)

```bash
pnpm install
cp .env.example .env      # then fill in the values (see below)
pnpm db:setup             # creates the Postgres role + database from DATABASE_URL (asks for sudo)
pnpm db:migrate           # creates the tables
pnpm db:seed              # menu, add-ons, café details, 6 tables, first owner login
pnpm dev                  # http://localhost:3000 – dashboard at /admin
```

`.env`: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `SEED_OWNER_USERNAME` / `SEED_OWNER_PASSWORD` (first owner login), `UPLOAD_DIR` (menu photos, default `./uploads`).

Add a staff login (until Settings → Staff arrives in Phase 4):

```bash
pnpm staff:add counter1 "Counter One" --phone 9800000000
```

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm build
```

## Where things are

| Path | What |
|---|---|
| `prisma/schema.prisma` | Data model (money in paise) · `prisma/seed.ts` + `seed-data.ts` initial menu and café details |
| `src/app/page.tsx`, `src/app/menu/` | Landing page and QR menu (read from the DB, cached; edits refresh instantly) |
| `src/app/admin/` | Staff login and dashboard; `(dashboard)/menu` is the menu manager |
| `src/lib/auth/` | Sessions (signed cookie), password hashing, data-access checks |
| `src/proxy.ts` | Quick cookie check that redirects to login |
| `src/lib/data/` | Cached reads for public pages, reads for the dashboard |
| `src/app/media/` | Serves uploaded menu photos from `UPLOAD_DIR` |
| `src/components/three/` | 3D salad bowl hero (landing page only, lazy-loaded) |
