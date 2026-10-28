-- AlterTable
ALTER TABLE "Supply" ADD COLUMN "imageKey" TEXT,
ADD COLUMN "imageContentType" TEXT,
ADD COLUMN "imageSize" INTEGER,
ADD COLUMN "imageUpdatedAt" TIMESTAMP(3);
