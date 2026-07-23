# Multi-site tenancy

## Context

Supli Mart started as a single-organization inventory app. Multiple physical sites need isolated catalogs (supplies, vendors, locations) and operational logs, with a superadmin who can assign people to sites and optionally operate inside any site.

## Decision

- Introduce a first-class `Site` model and stamp `siteId` on site-bound data.
- Roles: `SUPERADMIN` (global), `ADMIN` / `STAFF` / `PENDING` (one site each).
- Superadmin identity is bootstrapped via `SUPERADMIN_EMAIL` (+ optional `SUPERADMIN_INITIAL_PASSWORD` for first create). No credentials in source.
- Superadmin selects an active site via cookie (`supli_active_site_id`) and then uses the same admin surfaces as a site admin.
- Each site has its own kiosk user (`kiosk-{slug}`) and kiosk PIN on `Site.kioskPasswordHash`.
- Existing data migrates onto a default site named Main (`slug: main`).

## Consequences

- All list/get/mutate paths for inventory domains must include `siteId` filters (IDOR protection).
- Open registration requires choosing an active site.
- Deploy configs must document the new env vars; public repo stays free of secrets.
