-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mutedDuring" TIMESTAMP(3),
ADD COLUMN     "mutedPermanent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mutedReason" TEXT;
