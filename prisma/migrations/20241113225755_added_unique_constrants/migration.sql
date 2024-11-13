/*
  Warnings:

  - A unique constraint covering the columns `[userId,timestamp]` on the table `AuditLog` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,supplyId]` on the table `Request` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Supply` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_userId_timestamp_key" ON "AuditLog"("userId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Request_userId_supplyId_key" ON "Request"("userId", "supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "Supply_name_key" ON "Supply"("name");
