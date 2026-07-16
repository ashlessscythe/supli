-- AlterTable FileAttachment: store blobs in DB and link to receipts/orders
ALTER TABLE "FileAttachment" ADD COLUMN "stockMovementId" TEXT,
ADD COLUMN "vendorReorderId" TEXT,
ADD COLUMN "data" BYTEA;

ALTER TABLE "FileAttachment" ALTER COLUMN "storageKey" DROP NOT NULL;

CREATE INDEX "FileAttachment_stockMovementId_idx" ON "FileAttachment"("stockMovementId");
CREATE INDEX "FileAttachment_vendorReorderId_idx" ON "FileAttachment"("vendorReorderId");

ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_vendorReorderId_fkey" FOREIGN KEY ("vendorReorderId") REFERENCES "VendorReorder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
