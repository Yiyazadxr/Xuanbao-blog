-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "lastMergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 回填存量：lastMergedAt 对齐 createdAt，避免历史通知排序错乱（默认值会把它们都填成迁移时刻）
UPDATE "Notification" SET "lastMergedAt" = "createdAt";
