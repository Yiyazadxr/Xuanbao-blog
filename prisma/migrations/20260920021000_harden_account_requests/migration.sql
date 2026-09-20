-- Track account-request type and processing leases for safe, retryable approval delivery.
ALTER TABLE "AccountRequest"
ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'STANDARD',
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "AccountRequest"
SET "kind" = 'INVITE'
WHERE "password" IS NOT NULL;

CREATE INDEX "AccountRequest_status_createdAt_idx"
ON "AccountRequest"("status", "createdAt");

-- Preserve the newest unfinished request if legacy races produced duplicates.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "email" ORDER BY
      CASE WHEN "kind" = 'INVITE' THEN 0 ELSE 1 END,
      "createdAt" DESC,
      "id" DESC
  ) AS position
  FROM "AccountRequest"
  WHERE "status" IN ('PENDING', 'PROCESSING')
)
UPDATE "AccountRequest"
SET "status" = 'REJECTED', "password" = NULL
WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1);

-- One email may have only one unfinished request, including interrupted delivery.
CREATE UNIQUE INDEX "AccountRequest_email_active_key"
ON "AccountRequest"("email")
WHERE "status" IN ('PENDING', 'PROCESSING');

CREATE INDEX "Notification_userId_lastMergedAt_id_idx"
ON "Notification"("userId", "lastMergedAt", "id");

CREATE INDEX "Notification_userId_aggregateKey_read_lastMergedAt_idx"
ON "Notification"("userId", "aggregateKey", "read", "lastMergedAt");
