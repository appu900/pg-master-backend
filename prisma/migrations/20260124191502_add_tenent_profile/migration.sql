/*
  Warnings:

  - You are about to alter the column `rentPerBed` on the `Room` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.

*/
-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'NOTICE_PERIOD', 'EXITED', 'EVICTED', 'PENDING');

-- AlterTable
ALTER TABLE "Room" ALTER COLUMN "rentPerBed" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TenentProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "geneder" TEXT,
    "profession" TEXT,
    "pinCode" TEXT NOT NULL,
    "state" TEXT,
    "profileImage" TEXT,
    "Address" TEXT,
    "agreementPeriod" TEXT,
    "RentalType" TEXT,
    "lockInPeriodsInMonths" INTEGER DEFAULT 0,
    "noticePeriodInDays" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomTenant" (
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

    CONSTRAINT "RoomTenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenentProfile_userId_key" ON "TenentProfile"("userId");

-- CreateIndex
CREATE INDEX "TenentProfile_userId_idx" ON "TenentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomTenant_tenentId_key" ON "RoomTenant"("tenentId");

-- CreateIndex
CREATE INDEX "RoomTenant_roomId_tenentId_idx" ON "RoomTenant"("roomId", "tenentId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomTenant_roomId_tenentId_key" ON "RoomTenant"("roomId", "tenentId");

-- AddForeignKey
ALTER TABLE "TenentProfile" ADD CONSTRAINT "TenentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTenant" ADD CONSTRAINT "RoomTenant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTenant" ADD CONSTRAINT "RoomTenant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTenant" ADD CONSTRAINT "RoomTenant_tenentId_fkey" FOREIGN KEY ("tenentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
