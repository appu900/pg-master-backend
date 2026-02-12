/*
  Warnings:

  - Added the required column `AccountNumber` to the `BankAccountDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `IFSCcode` to the `BankAccountDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `PayeeCategory` to the `BankAccountDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountHolderName` to the `BankAccountDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `BankAccountDetails` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `BankAccountDetails` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "payeeCategory" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'EMPLOYEE', 'OTHER');

-- AlterTable
ALTER TABLE "BankAccountDetails" ADD COLUMN     "AccountNumber" TEXT NOT NULL,
ADD COLUMN     "IFSCcode" TEXT NOT NULL,
ADD COLUMN     "PayeeCategory" "payeeCategory" NOT NULL,
ADD COLUMN     "UPIId" TEXT,
ADD COLUMN     "accountHolderName" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BankAccountDetails_propertyOwnerProfileId_idx" ON "BankAccountDetails"("propertyOwnerProfileId");
