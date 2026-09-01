-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actorNames" TEXT,
ADD COLUMN     "aggregateKey" TEXT,
ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Notification_userId_aggregateKey_read_idx" ON "Notification"("userId", "aggregateKey", "read");
