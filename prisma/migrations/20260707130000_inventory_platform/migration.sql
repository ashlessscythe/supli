-- Drop unique constraint on Supply.name
DROP INDEX IF EXISTS "Supply_name_key";

-- AlterTable Supply
ALTER TABLE "Supply" ADD COLUMN "barcode" TEXT,
ADD COLUMN "internalSku" TEXT,
ADD COLUMN "itemTypeId" TEXT;

CREATE UNIQUE INDEX "Supply_barcode_key" ON "Supply"("barcode");
CREATE UNIQUE INDEX "Supply_internalSku_key" ON "Supply"("internalSku");
CREATE INDEX "Supply_name_idx" ON "Supply"("name");

-- CreateTable Location
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateTable ItemType
CREATE TABLE "ItemType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItemType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemType_slug_key" ON "ItemType"("slug");

-- CreateTable StockLevel
CREATE TABLE "StockLevel" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minimumThreshold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StockLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockLevel_supplyId_locationId_key" ON "StockLevel"("supplyId", "locationId");
CREATE INDEX "StockLevel_locationId_idx" ON "StockLevel"("locationId");

-- CreateTable Vendor
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable ItemVendor
CREATE TABLE "ItemVendor" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorSku" TEXT,
    "internalSku" TEXT,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "leadTimeDays" INTEGER,
    "moq" INTEGER,
    "cost" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ItemVendor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItemVendor_supplyId_vendorId_key" ON "ItemVendor"("supplyId", "vendorId");

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('CONSUME', 'RECEIVE', 'ADJUST', 'TRANSFER');
CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'REORDER', 'REQUEST_STATUS', 'SYSTEM');

-- CreateTable StockMovement
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "badgeId" TEXT,
    "userId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_supplyId_createdAt_idx" ON "StockMovement"("supplyId", "createdAt");
CREATE INDEX "StockMovement_locationId_idx" ON "StockMovement"("locationId");

-- CreateTable Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateTable FileAttachment
CREATE TABLE "FileAttachment" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FileAttachment_supplyId_idx" ON "FileAttachment"("supplyId");

-- AddForeignKeys
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "ItemType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockLevel" ADD CONSTRAINT "StockLevel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemVendor" ADD CONSTRAINT "ItemVendor_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemVendor" ADD CONSTRAINT "ItemVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default location and item types
INSERT INTO "Location" ("id", "name", "type", "description", "isActive", "createdAt", "updatedAt")
VALUES ('default-location', 'Main Office', 'Office', 'Default inventory location', true, NOW(), NOW());

INSERT INTO "ItemType" ("id", "slug", "name", "description", "attributes", "createdAt", "updatedAt") VALUES
('type-consumable', 'consumable', 'Consumable', 'Items consumed during use', '{}', NOW(), NOW()),
('type-returnable', 'returnable', 'Returnable', 'Items that must be returned', '{}', NOW(), NOW()),
('type-fixed-asset', 'fixed-asset', 'Fixed Asset', 'Long-term fixed assets', '{}', NOW(), NOW()),
('type-serialized', 'serialized-asset', 'Serialized Asset', 'Trackable serialized items', '{"requiresSerial": true}', NOW(), NOW()),
('type-bulk', 'bulk-inventory', 'Bulk Inventory', 'Bulk stored materials', '{}', NOW(), NOW());

-- Backfill supplies with default item type and stock levels
UPDATE "Supply" SET "itemTypeId" = 'type-consumable' WHERE "itemTypeId" IS NULL;

INSERT INTO "StockLevel" ("id", "supplyId", "locationId", "quantity", "minimumThreshold", "createdAt", "updatedAt")
SELECT
  'sl-' || "id",
  "id",
  'default-location',
  "quantity",
  "minimumThreshold",
  NOW(),
  NOW()
FROM "Supply";
