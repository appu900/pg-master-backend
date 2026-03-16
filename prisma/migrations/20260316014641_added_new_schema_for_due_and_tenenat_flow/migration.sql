/*
  Warnings:

  - You are about to drop the column `invoiceId` on the `ReminderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `billingDayOfMonth` on the `Tenancy` table. All the data in the column will be lost.
  - You are about to drop the column `firstInvoiceGenerated` on the `Tenancy` table. All the data in the column will be lost.
  - You are about to drop the column `lastInvoicePeriodEnd` on the `Tenancy` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Tenancy` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `TenantCharge` table. All the data in the column will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `billingCycleDay` to the `Tenancy` table without a default value. This is not possible if the table is not empty.
  - Made the column `tenancyStatus` on table `Tenancy` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DueType" AS ENUM ('RENT', 'SECURITY_DEPOSIT', 'ELECTRICITY', 'WATER', 'MAINTENANCE', 'FINE', 'OTHER');

-- CreateEnum
CREATE TYPE "DueStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'WAIVED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE_GATEWAY');

-- CreateEnum
CREATE TYPE "UpiApp" AS ENUM ('GOOGLE_PAY', 'PHONE_PE', 'PAYTM', 'BHIM', 'AMAZON_PAY', 'OTHER');

-- AlterEnum
ALTER TYPE "ReminderType" ADD VALUE 'DUE_CREATED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SQSMessageType" ADD VALUE 'CREATE_DUE_PAYMENT';
ALTER TYPE "SQSMessageType" ADD VALUE 'GENERATE_INVOICE_FOR_DUE';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_tenancyId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLog" DROP CONSTRAINT "PaymentLog_paymentId_fkey";

-- DropIndex
DROP INDEX "InboxMessages_id_idx";

-- DropIndex
DROP INDEX "Invoice_propertyId_status_dueDate_idx";

-- DropIndex
DROP INDEX "Tenancy_status_idx";

-- AlterTable
ALTER TABLE "InboxMessages" ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "securityDepositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "periodStart" DROP NOT NULL,
ALTER COLUMN "periodEnd" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ReminderSchedule" DROP COLUMN "invoiceId",
ADD COLUMN     "dueId" INTEGER;

-- AlterTable
ALTER TABLE "Tenancy" DROP COLUMN "billingDayOfMonth",
DROP COLUMN "firstInvoiceGenerated",
DROP COLUMN "lastInvoicePeriodEnd",
DROP COLUMN "status",
ADD COLUMN     "billingCycleDay" INTEGER NOT NULL,
ADD COLUMN     "nextBillingDate" DATE,
ALTER COLUMN "tenancyStatus" SET NOT NULL,
ALTER COLUMN "tenancyStatus" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "TenantCharge" DROP COLUMN "invoiceId";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "PaymentLog";

-- CreateTable
CREATE TABLE "TenantDue" (
    "id" SERIAL NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "dueType" "DueType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(10,2) NOT NULL,
    "status" "DueStatus" NOT NULL DEFAULT 'UNPAID',
    "periodStart" DATE,
    "periodEnd" DATE,
    "dueDate" DATE NOT NULL,
    "invoiceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantDue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuePayment" (
    "id" SERIAL NOT NULL,
    "dueId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "upiApp" "UpiApp",
    "transactionId" TEXT,
    "proofImageUrl" TEXT,
    "recordedById" INTEGER NOT NULL,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantDue_invoiceId_key" ON "TenantDue"("invoiceId");

-- CreateIndex
CREATE INDEX "TenantDue_tenancyId_idx" ON "TenantDue"("tenancyId");

-- CreateIndex
CREATE INDEX "TenantDue_propertyId_idx" ON "TenantDue"("propertyId");

-- CreateIndex
CREATE INDEX "TenantDue_status_idx" ON "TenantDue"("status");

-- CreateIndex
CREATE INDEX "TenantDue_dueType_idx" ON "TenantDue"("dueType");

-- CreateIndex
CREATE INDEX "TenantDue_dueDate_idx" ON "TenantDue"("dueDate");

-- CreateIndex
CREATE INDEX "TenantDue_tenancyId_status_idx" ON "TenantDue"("tenancyId", "status");

-- CreateIndex
CREATE INDEX "TenantDue_tenancyId_dueType_idx" ON "TenantDue"("tenancyId", "dueType");

-- CreateIndex
CREATE INDEX "DuePayment_dueId_idx" ON "DuePayment"("dueId");

-- CreateIndex
CREATE INDEX "DuePayment_tenancyId_idx" ON "DuePayment"("tenancyId");

-- CreateIndex
CREATE INDEX "DuePayment_propertyId_idx" ON "DuePayment"("propertyId");

-- CreateIndex
CREATE INDEX "DuePayment_recordedById_idx" ON "DuePayment"("recordedById");

-- CreateIndex
CREATE INDEX "DuePayment_paidAt_idx" ON "DuePayment"("paidAt");

-- CreateIndex
CREATE INDEX "DuePayment_tenancyId_paidAt_idx" ON "DuePayment"("tenancyId", "paidAt");

-- CreateIndex
CREATE INDEX "Tenancy_tenancyStatus_idx" ON "Tenancy"("tenancyStatus");

-- CreateIndex
CREATE INDEX "Tenancy_nextBillingDate_idx" ON "Tenancy"("nextBillingDate");

-- AddForeignKey
ALTER TABLE "TenantDue" ADD CONSTRAINT "TenantDue_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDue" ADD CONSTRAINT "TenantDue_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDue" ADD CONSTRAINT "TenantDue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuePayment" ADD CONSTRAINT "DuePayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuePayment" ADD CONSTRAINT "DuePayment_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "TenantDue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
