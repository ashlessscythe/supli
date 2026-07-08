-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'USER_REGISTRATION';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PENDING';

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
