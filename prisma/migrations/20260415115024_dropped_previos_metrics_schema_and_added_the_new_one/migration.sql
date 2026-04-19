/*
  Warnings:

  - You are about to drop the `PropertyLifetimeMetrics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyMonthlyMetrics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PropertyLifetimeMetrics" DROP CONSTRAINT "PropertyLifetimeMetrics_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PropertyMonthlyMetrics" DROP CONSTRAINT "PropertyMonthlyMetrics_propertyId_fkey";

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "hasMeter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intialMeterReading" INTEGER,
ADD COLUMN     "isAcRoom" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "PropertyLifetimeMetrics";

-- DropTable
DROP TABLE "PropertyMonthlyMetrics";

-- CreateTable
CREATE TABLE "PropertyMetrics" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalRentCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalElecCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalOtherCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalBeds" INTEGER NOT NULL DEFAULT 0,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "activeTenants" INTEGER NOT NULL DEFAULT 0,
    "totalDuesGenerated" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDuesPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDuesUnpaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overdueCount" INTEGER NOT NULL DEFAULT 0,
    "collectionRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "occupancyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyMetrics_ownerId_month_year_idx" ON "PropertyMetrics"("ownerId", "month", "year");

-- CreateIndex
CREATE INDEX "PropertyMetrics_propertyId_idx" ON "PropertyMetrics"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMetrics_propertyId_month_year_key" ON "PropertyMetrics"("propertyId", "month", "year");

-- AddForeignKey
ALTER TABLE "PropertyMetrics" ADD CONSTRAINT "PropertyMetrics_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
