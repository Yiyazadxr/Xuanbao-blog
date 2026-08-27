/*
  Warnings:

  - You are about to drop the column `email` on the `InviteCode` table. All the data in the column will be lost.
  - You are about to drop the column `usedById` on the `InviteCode` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InviteCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);
INSERT INTO "new_InviteCode" ("code", "createdAt", "expiresAt", "id") SELECT "code", "createdAt", "expiresAt", "id" FROM "InviteCode";
DROP TABLE "InviteCode";
ALTER TABLE "new_InviteCode" RENAME TO "InviteCode";
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "activatedAt" DATETIME,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "fontScale" REAL,
    "density" TEXT,
    "headerH" INTEGER,
    "footerPy" INTEGER,
    "inviteCodeId" TEXT,
    CONSTRAINT "User_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "InviteCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "density", "email", "fontScale", "footerPy", "headerH", "id", "image", "name", "password", "role", "updatedAt") SELECT "createdAt", "density", "email", "fontScale", "footerPy", "headerH", "id", "image", "name", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
