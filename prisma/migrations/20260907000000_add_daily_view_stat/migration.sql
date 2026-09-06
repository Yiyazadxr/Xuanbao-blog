-- CreateTable
CREATE TABLE "DailyViewStat" (
    "date" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyViewStat_pkey" PRIMARY KEY ("date")
);
