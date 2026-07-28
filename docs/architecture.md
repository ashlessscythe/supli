# Supli Mart Architecture

## Overview

Supli Mart is a Next.js 14 (App Router) application for supplies inventory management. It uses server components for data fetching, server actions for mutations, and Prisma ORM against PostgreSQL — either local Docker Postgres or a hosted provider such as Neon on the edge.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| ORM | Prisma 5 |
| Database | PostgreSQL (Docker locally via `compose.yaml`, Neon or other hosted on the edge) |
| Auth | NextAuth.js (JWT, credentials) |
| UI | shadcn/ui, Tailwind CSS, Radix |
| Validation | Zod |
| Email | Resend (M2+) |
| Local deploy | Docker Compose — Postgres always; app via `--profile full` |
| Edge deploy | Vercel, Render, Koyeb + hosted Postgres |

## Request Flow

```
Browser → Middleware (auth) → Server Component / API Route
                                    ↓
                              Service Layer
                                    ↓
                              Repository Layer
                                    ↓
                              Prisma → PostgreSQL
```

## Directory Structure

```
src/
├── app/              Routes (pages + API)
├── components/       UI components (feature + shared)
├── features/         Feature modules (M1+)
├── hooks/            Client hooks
├── lib/              Shared utilities, env, validation
└── server/           Services and repositories (M1+)
```

## Key Decisions

- Multi-site tenancy: each site has isolated catalogs and logs (see [decisions/002-multi-site-tenancy.md](decisions/002-multi-site-tenancy.md))
- Username login preserved; email added additively (M2)
- Server actions as primary UI mutation interface
- Additive database migrations only

## Multi-site model

| Role | Scope |
|------|--------|
| `SUPERADMIN` | Global; manages sites/users; switches into a site to administer it |
| `ADMIN` | Single site; full site admin UI |
| `STAFF` | Single site; dashboard / inbound / kiosk-adjacent flows |
| `PENDING` | Single site; awaiting approval |

Site context is resolved from the user's `siteId`, or for superadmins from the `supli_active_site_id` cookie. Repositories and services filter by that `siteId`.

See [decisions/](decisions/) for Architecture Decision Records.
