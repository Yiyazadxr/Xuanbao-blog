-- CreateTable
CREATE TABLE "RolePermission" (
    "role" TEXT NOT NULL PRIMARY KEY,
    "permissions" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
