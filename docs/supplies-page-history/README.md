# Supplies Page History

Chronological mockups of the Supli supplies inventory page, from a bare document-style ledger through the current cyberpunk-themed dashboard. All five versions share the same placeholder data so screenshots show design evolution only.

## Versions

| Era | File | Screenshot | Style |
|-----|------|------------|-------|
| 01 · Basic Ledger (2019) | [01-basic-ledger.html](01-basic-ledger.html) | [screenshots/01-basic-ledger.png](screenshots/01-basic-ledger.png) | Unstyled document table, Times serif, black borders |
| 02 · Classic Admin (2021) | [02-classic-admin.html](02-classic-admin.html) | [screenshots/02-classic-admin.png](screenshots/02-classic-admin.png) | Early admin panel, blue header, status badges |
| 03 · Dashboard Cards (2023) | [03-dashboard-cards.html](03-dashboard-cards.html) | [screenshots/03-dashboard-cards.png](screenshots/03-dashboard-cards.png) | Light SaaS dashboard, sidebar nav, metric cards |
| 04 · Dark Operations (2025) | [04-dark-operations.html](04-dark-operations.html) | [screenshots/04-dark-operations.png](screenshots/04-dark-operations.png) | Dark ops console, cyan accents, status hierarchy |
| 05 · Cyberpunk Current (2026) | [05-cyberpunk-current.html](05-cyberpunk-current.html) | [screenshots/05-cyberpunk-current.png](screenshots/05-cyberpunk-current.png) | Faithful static recreation of current `/dashboard/supplies` |

## Shared data

- **Fixture:** [data/supplies.json](data/supplies.json)
- **Source:** 15 deterministic Armored Core VI parts from [`prisma/seed.ts`](../../prisma/seed.ts)
- **Renderer:** [render.js](render.js) — loads JSON, formats barcodes, computes low-stock state, drives search/filter/sort/pagination

Low-stock items (quantity ≤ minimum threshold): Schneider Reverse-Joint Legs, Coral Laser Blade.

## Local preview

Pages load JSON via `fetch()`. Opening HTML directly (`file://`) will not work — serve the directory over HTTP:

```bash
npx serve docs/supplies-page-history -l 5199
```

Then open, for example:

- http://localhost:5199/01-basic-ledger.html
- http://localhost:5199/05-cyberpunk-current.html

## Screenshot convention

- **Viewport:** 1440×900
- **Date:** 2026-07-10 (fixture `meta.capturedAt`)
- **Output:** save PNGs to `screenshots/` using the filenames in the table above

Each page includes a visible era label in the top corner for screenshot logs.

## Current app reference

The live supplies page lives at `/dashboard/supplies` ([`src/app/dashboard/supplies/page.tsx`](../../src/app/dashboard/supplies/page.tsx)) and uses [`SuppliesTable`](../../src/components/supplies/supplies-table.tsx) with the cyberpunk theme tokens from [`src/app/globals.css`](../../src/app/globals.css).
