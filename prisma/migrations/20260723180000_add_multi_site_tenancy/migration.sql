-- Multi-site tenancy: Site model, SUPERADMIN role, site-scoped catalogs

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "kioskPasswordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- Seed Main site for backfill
INSERT INTO "Site" ("id", "name", "slug", "isActive", "createdAt", "updatedAt")
VALUES ('site_main_default', 'Main', 'main', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: add nullable siteId columns
ALTER TABLE "User" ADD COLUMN "siteId" TEXT;
ALTER TABLE "Supply" ADD COLUMN "siteId" TEXT;
ALTER TABLE "Location" ADD COLUMN "siteId" TEXT;
ALTER TABLE "ItemType" ADD COLUMN "siteId" TEXT;
ALTER TABLE "Vendor" ADD COLUMN "siteId" TEXT;
ALTER TABLE "Request" ADD COLUMN "siteId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "siteId" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "siteId" TEXT;

-- Backfill existing rows onto Main
UPDATE "User" SET "siteId" = 'site_main_default';
UPDATE "Supply" SET "siteId" = 'site_main_default';
UPDATE "Location" SET "siteId" = 'site_main_default';
UPDATE "ItemType" SET "siteId" = 'site_main_default';
UPDATE "Vendor" SET "siteId" = 'site_main_default';
UPDATE "Request" SET "siteId" = 'site_main_default';
UPDATE "AuditLog" SET "siteId" = 'site_main_default';
UPDATE "SystemSetting" SET "siteId" = 'site_main_default';

-- Move kiosk password onto Site
UPDATE "Site" s
SET "kioskPasswordHash" = ss."value",
    "updatedAt" = CURRENT_TIMESTAMP
FROM "SystemSetting" ss
WHERE s."slug" = 'main' AND ss."key" = 'KIOSK_PASSWORD_HASH';

DELETE FROM "SystemSetting" WHERE "key" = 'KIOSK_PASSWORD_HASH';

-- Rename global kiosk user to per-site username
UPDATE "User"
SET "username" = 'kiosk-main',
    "siteId" = 'site_main_default',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'kiosk';

-- Drop old global unique constraints
DROP INDEX IF EXISTS "Supply_barcode_key";
DROP INDEX IF EXISTS "Supply_internalSku_key";
DROP INDEX IF EXISTS "Location_name_key";
DROP INDEX IF EXISTS "ItemType_slug_key";
DROP INDEX IF EXISTS "SystemSetting_key_key";
DROP INDEX IF EXISTS "Supply_name_idx";

-- Require siteId on site-scoped catalogs
ALTER TABLE "Supply" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "Location" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "ItemType" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "Vendor" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "Request" ALTER COLUMN "siteId" SET NOT NULL;
ALTER TABLE "SystemSetting" ALTER COLUMN "siteId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Location" ADD CONSTRAINT "Location_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemType" ADD CONSTRAINT "ItemType_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Site-scoped unique + helper indexes
CREATE UNIQUE INDEX "Supply_siteId_barcode_key" ON "Supply"("siteId", "barcode");
CREATE UNIQUE INDEX "Supply_siteId_internalSku_key" ON "Supply"("siteId", "internalSku");
CREATE INDEX "Supply_siteId_name_idx" ON "Supply"("siteId", "name");

CREATE UNIQUE INDEX "Location_siteId_name_key" ON "Location"("siteId", "name");
CREATE INDEX "Location_siteId_idx" ON "Location"("siteId");

CREATE UNIQUE INDEX "ItemType_siteId_slug_key" ON "ItemType"("siteId", "slug");
CREATE INDEX "ItemType_siteId_idx" ON "ItemType"("siteId");

CREATE UNIQUE INDEX "SystemSetting_siteId_key_key" ON "SystemSetting"("siteId", "key");
CREATE INDEX "SystemSetting_siteId_idx" ON "SystemSetting"("siteId");

CREATE INDEX "User_siteId_idx" ON "User"("siteId");
CREATE INDEX "Vendor_siteId_idx" ON "Vendor"("siteId");
CREATE INDEX "Request_siteId_idx" ON "Request"("siteId");
CREATE INDEX "AuditLog_siteId_idx" ON "AuditLog"("siteId");
