# Database Schema

## Core Models

### Site
Tenant boundary. Owns users (except SUPERADMIN), supplies, vendors, locations,
item types, settings, requests, and audit logs. Stores per-site kiosk PIN hash.

### User
Authentication, RBAC (`SUPERADMIN` | `ADMIN` | `STAFF` | `PENDING`), email,
theme preference, optional `siteId` (required for non-superadmin).

### Supply
Inventory items with optional barcode, internal SKU, and item type.
Uniques for barcode/SKU are scoped per site.

### Location
Warehouses, supply cages, tool rooms, and more. Name unique per site.

### ItemType
Extensible item classification. Slug unique per site.

### StockLevel
Per-location quantity and threshold for each supply.

### Vendor / ItemVendor
Vendor catalog with SKU, cost, lead time, MOQ, preferred vendor links.
Vendors belong to a single site.

### StockMovement
Ledger for consume, receive, adjust, and transfer events. Supports badge attribution.
Scoped indirectly via supply/location site membership.

### Notification
In-app notifications for low stock, reorders, and system events.

### FileAttachment
Uploaded documents (receipt scans, PO photos) stored as DB blobs (max 1 MB),
optionally linked to a `StockMovement` and/or `VendorReorder`. Legacy
`storageKey` filesystem paths remain nullable for older rows.

### Request, AuditLog, SystemSetting
Existing workflow and configuration models, now site-scoped
(`SystemSetting` unique on `[siteId, key]`).

## Migrations

```bash
npx prisma migrate deploy   # production
npx prisma migrate dev      # development
```
