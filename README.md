# Supli Mart

Inventory management for tracking supplies, logging inbound corporate POs, receiving stock (with photo/document attachments), searching history, and recording consumption — with vendor lead times, MOQ, barcode **QR** codes, and a **kiosk** for walk-up checkout.

Built with **Next.js 14** (App Router), **Prisma**, **PostgreSQL**, **NextAuth**, and **shadcn/ui**. Runs locally via Docker Compose or on the edge (Neon + Vercel / Render / Koyeb).

---

## Screenshots

### Admin dashboard

Stats, request trends, and low-stock visibility for admins.

![Admin dashboard](docs/images/dashboard.png)

### Supply details

Click any supply to see on-hand quantity, stock by location, vendor lead times and MOQ, last receipt, and recent activity — without leaving the list.

![Supply details](docs/images/supply_details_popup.png)

### QR code

From any supply detail popup, open **Show QR** to scan, copy, or download the item barcode as a QR image.

![Supply QR code](docs/images/supply_qr_popup.png)

### Inbound

Staff receive stock or log a PO placed in the corporate system from one **Inbound** surface. Admins can also approve or deny leftover supply requests.

![Inbound / requests (mobile)](docs/images/request_mobile.png)

### Receive attachments

When receiving stock, attach a scan, photo, or PDF (invoice, packing slip, etc.) alongside optional notes.

![Inbound receive upload](docs/images/inbound_receive_upload.png)

### History

Search past purchase orders, receipts, and consumptions by PO #, supply, vendor, notes, user, type, status, or date range.

![History search](docs/images/history_search.png)

### Kiosk mode

Dedicated touch-friendly flow for consuming stock on the floor: **Scan item → Enter quantity → Complete**.

![Kiosk](docs/images/kiosk.png)

### Notifications

In-app bell with unread badge for registration approvals, low-stock alerts, and request status updates.

![Notifications](docs/images/notifications.png)

### Audit log

Searchable activity trail for stock receipts, inbound orders, leftover request approvals, and kiosk consumption — who did what and when.

![Audit log](docs/images/audit_log.png)

---

## Features

| Area | What you get |
|------|----------------|
| **Inventory** | CRUD for supplies; barcode & SKU; QR from item detail; min thresholds; vendors & activity; search |
| **Inbound** | Receive stock (with photo/document attachments), log corporate POs, track open orders; admin approve/deny leftover requests |
| **History** | Search past POs, receipts, and consumptions by text, type, status, and date |
| **Kiosk** | PIN-gated barcode scan to consume stock (stock movement ledger) |
| **Locations** | Warehouses, cages, tool rooms, and per-location stock levels |
| **Vendors** | Vendor catalog with cost, lead time, MOQ, preferred links |
| **Dashboards** | Admin overview charts, depletion estimates / forecasting signals |
| **Identity** | Username/password (NextAuth), roles **ADMIN** / **STAFF** / **PENDING**, self-registration, admin approval, invites, password reset |
| **Admin** | Users, audit log, system settings, theme preferences |
| **Notifications** | Header bell with unread count — registration requests, low stock, request status |
| **Export** | CSV export of supplies |

Roles:

- **ADMIN** — full inventory, users, locations, vendors, inbound (including request approvals), settings, audit
- **STAFF** — view supplies, receive/log inbound orders, use shared app surface

---

## Tech stack

| Layer | Technology |
|-------|------------|
| App | Next.js 14 (App Router), TypeScript |
| Data | Prisma 5, PostgreSQL (Docker locally, Neon on the edge) |
| Auth | NextAuth.js (credentials / JWT) |
| UI | Tailwind CSS, shadcn/ui, Radix, Recharts |
| Email | Resend (optional; invites & password reset) |
| Local | Docker Compose (`compose.yaml`) — Postgres, optional app container |
| Edge | Vercel, Render, or [Koyeb](koyeb.toml) + hosted Postgres (e.g. Neon) |

More detail: [docs/architecture.md](docs/architecture.md) · [docs/schema.md](docs/schema.md) · [docs/api.md](docs/api.md) · [docs/roadmap.md](docs/roadmap.md)

---

## Getting started

Two deploy targets are supported:

| Target | Database | App |
|--------|----------|-----|
| **Local / desktop** | Docker Postgres (`compose.yaml`) | `npm run dev` on the host, or full stack via `npm run local:up` |
| **Edge / cloud** | Neon (or any hosted Postgres) | Vercel, Render, or Koyeb |

### Prerequisites

- Node.js 20+
- Docker + Docker Compose (local Postgres / full local server)
- Or a hosted PostgreSQL URL (edge)

### Local setup (Docker Postgres + Next on the host)

```bash
cp .env.example .env
# Defaults point at local Docker Postgres. Set NEXTAUTH_SECRET:
#   openssl rand -base64 32

npm install
npm run db:up            # start Postgres on localhost:5432
npm run db:setup         # migrate + seed demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Full local server (Postgres + app in Docker)

```bash
cp .env.example .env
# Set NEXTAUTH_SECRET (and optional SUPERADMIN_* / Resend vars)

npm run local:up         # build & start postgres + app
npm run local:seed       # demo users + sample inventory
```

App: [http://localhost:3000](http://localhost:3000). Stop with `npm run local:down`.

### Edge / cloud setup

```bash
cp .env.example .env
# Set DATABASE_URL to your Neon (or other) connection string (sslmode=require)
# Set NEXTAUTH_SECRET and NEXTAUTH_URL to your public URL

npm install
npx prisma migrate deploy
npm run db:seed          # optional on first boot
npm run build && npm start
```

Or deploy with the existing [render.yaml](render.yaml) / [koyeb.toml](koyeb.toml) configs — same env vars, no Docker required on the host.

### Seed logins

| Username | Password   | Role  |
|----------|------------|-------|
| `walter` | `admin123` | Admin |
| `carla`  | `admin123` | Admin |
| `raven`  | `staff123` | Staff |
| `rusty`  | `staff123` | Staff |
| `iguazu` | `staff123` | Staff |

Kiosk PIN (change under **Admin → Settings**): `kiosk1234`

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Generate Prisma client + production build |
| `npm start` | Migrate deploy + production server |
| `npm run db:up` / `db:down` | Start/stop local Docker Postgres |
| `npm run db:setup` | Migrate deploy + seed |
| `npm run db:seed` | Seed demo data (optional flags: `--clear`, `--use-faker`) |
| `npm run db:reset` | Reset DB, re-apply migrations, seed |
| `npm run local:up` / `local:down` | Full local stack (Postgres + app container) |
| `npm run local:seed` | Seed against the full local stack |
| `npm run test:db:up` / `test:db:down` | Integration-test Postgres on port 5433 |
| `npm test` | Vitest |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

---

## App surfaces

| Path | Audience |
|------|----------|
| `/login` | Sign-in |
| `/register` | Self-registration (pending admin approval) |
| `/forgot-password` | Request password reset email |
| `/dashboard` | Staff overview (admins are sent to `/admin`) |
| `/dashboard/supplies` | Browse inventory |
| `/dashboard/inbound` | Receive stock (optional attachments), log corporate POs, review open orders |
| `/dashboard/history` | Search past orders, receipts, and consumptions |
| `/kiosk` | Floor consume flow (PIN) |
| `/admin` | Admin dashboard & management (users, supplies, locations, vendors, inbound, audit, settings) |

---

## Environment

See [`.env.example`](.env.example):

- `DATABASE_URL` — local Docker default, or Neon / hosted Postgres for edge
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — auth
- `RESEND_API_KEY` / `EMAIL_FROM` — email (invites, reset)
- `SUPERADMIN_EMAIL` / `SUPERADMIN_INITIAL_PASSWORD` — optional bootstrap
- `SERVER_ACTIONS_ALLOWED_ORIGINS` — extra hostnames behind Cloudflare / edge proxies
- `STORAGE_*` — legacy file path (attachments default to Postgres blobs)

---

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for details.
