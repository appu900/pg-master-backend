/*
  Warnings:

  - You are about to drop the `RoomTenant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RoomTenant" DROP CONSTRAINT "RoomTenant_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "RoomTenant" DROP CONSTRAINT "RoomTenant_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomTenant" DROP CONSTRAINT "RoomTenant_tenentId_fkey";

-- DropTable
DROP TABLE "RoomTenant";

-- CreateTable
CREATE TABLE "Tenancy" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "tenentId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "rentAmount" DECIMAL(10,2) NOT NULL,
    "securityDeposit" DECIMAL(10,2) NOT NULL,
    "advanceAmount" DECIMAL(10,2),
    "lockInPeriodsInMonths" INTEGER DEFAULT 0,
    "noticePeriodInDays" INTEGER DEFAULT 0,
    "initialElectricityReading" DECIMAL(10,2),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenancy_tenentId_key" ON "Tenancy"("tenentId");

-- CreateIndex
CREATE INDEX "Tenancy_roomId_tenentId_idx" ON "Tenancy"("roomId", "tenentId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenancy_roomId_tenentId_key" ON "Tenancy"("roomId", "tenentId");

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenancy" ADD CONSTRAINT "Tenancy_tenentId_fkey" FOREIGN KEY ("tenentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
