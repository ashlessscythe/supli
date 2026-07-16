# Database Schema

## Core Models

### User
Authentication, RBAC, email, theme preference.

### Supply
Inventory items with optional barcode, internal SKU, and item type.

### Location
Warehouses, supply cages, tool rooms, and more.

### ItemType
Extensible item classification (Consumable, Returnable, Fixed Asset, Serialized, Bulk).

### StockLevel
Per-location quantity and threshold for each supply.

### Vendor / ItemVendor
Vendor catalog with SKU, cost, lead time, MOQ, preferred vendor links.

### StockMovement
Ledger for consume, receive, adjust, and transfer events. Supports badge attribution.

### Notification
In-app notifications for low stock, reorders, and system events.

### FileAttachment
Uploaded documents (receipt scans, PO photos) stored as DB blobs (max 1 MB),
optionally linked to a `StockMovement` and/or `VendorReorder`. Legacy
`storageKey` filesystem paths remain nullable for older rows.

### Request, AuditLog, SystemSetting
Existing workflow and configuration models.

## Migrations

```bash
npx prisma migrate deploy   # production
npx prisma migrate dev      # development
```
