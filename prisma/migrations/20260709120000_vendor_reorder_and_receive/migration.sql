-- CreateEnum
CREATE TYPE "VendorReorderStatus" AS ENUM ('ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED');

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "vendorReorderId" TEXT;

-- CreateTable
CREATE TABLE "VendorReorder" (
    "id" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "vendorId" TEXT,
    "quantity" INTEGER NOT NULL,
    "externalPoNumber" TEXT,
    "status" "VendorReorderStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorReorder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_vendorReorderId_idx" ON "StockMovement"("vendorReorderId");

-- CreateIndex
CREATE INDEX "VendorReorder_supplyId_idx" ON "VendorReorder"("supplyId");

-- CreateIndex
CREATE INDEX "VendorReorder_status_idx" ON "VendorReorder"("status");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_vendorReorderId_fkey" FOREIGN KEY ("vendorReorderId") REFERENCES "VendorReorder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReorder" ADD CONSTRAINT "VendorReorder_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReorder" ADD CONSTRAINT "VendorReorder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorReorder" ADD CONSTRAINT "VendorReorder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
