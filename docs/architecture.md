# Supli Mart Architecture

## Overview

Supli Mart is a Next.js 14 (App Router) application for supplies inventory management. It uses server components for data fetching, server actions for mutations, and Prisma ORM against a Neon PostgreSQL database.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| ORM | Prisma 5 |
| Database | PostgreSQL (Neon) |
| Auth | NextAuth.js (JWT, credentials) |
| UI | shadcn/ui, Tailwind CSS, Radix |
| Validation | Zod |
| Email | Resend (M2+) |
| Deployment | Vercel, Render, Koyeb |

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

- Single-organization deployment (no multi-tenancy)
- Username login preserved; email added additively (M2)
- Server actions as primary UI mutation interface
- Additive database migrations only

See [decisions/](decisions/) for Architecture Decision Records.
