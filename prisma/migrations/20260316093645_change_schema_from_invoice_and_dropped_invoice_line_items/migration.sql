/*
  Warnings:

  - You are about to drop the column `balanceAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `baseRentAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `cancelReason` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `dueDate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `electricityAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `fineAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `generatedAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `gracePeriodEnd` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceNumber` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceType` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `lateFeeAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `maintenanceAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `otherChargesAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `periodEnd` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `periodStart` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `securityDepositAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `waterAmount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the `InvoiceLineItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TenantCharge` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `month` to the `DuePayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `DuePayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `month` to the `TenantDue` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `TenantDue` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_tenancyId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLineItem" DROP CONSTRAINT "InvoiceLineItem_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLineItem" DROP CONSTRAINT "InvoiceLineItem_tenantChargeId_fkey";

-- DropForeignKey
ALTER TABLE "TenantCharge" DROP CONSTRAINT "TenantCharge_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "TenantCharge" DROP CONSTRAINT "TenantCharge_tenancyId_fkey";

-- DropIndex
DROP INDEX "Invoice_dueDate_idx";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_idx";

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "Invoice_propertyId_idx";

-- DropIndex
DROP INDEX "Invoice_propertyId_status_idx";

-- DropIndex
DROP INDEX "Invoice_status_dueDate_idx";

-- DropIndex
DROP INDEX "Invoice_status_idx";

-- DropIndex
DROP INDEX "Invoice_tenancyId_idx";

-- DropIndex
DROP INDEX "Invoice_tenancyId_periodStart_periodEnd_idx";

-- AlterTable
ALTER TABLE "DuePayment" ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "balanceAmount",
DROP COLUMN "baseRentAmount",
DROP COLUMN "cancelReason",
DROP COLUMN "cancelledAt",
DROP COLUMN "createdAt",
DROP COLUMN "discountAmount",
DROP COLUMN "dueDate",
DROP COLUMN "electricityAmount",
DROP COLUMN "fineAmount",
DROP COLUMN "generatedAt",
DROP COLUMN "gracePeriodEnd",
DROP COLUMN "invoiceNumber",
DROP COLUMN "invoiceType",
DROP COLUMN "lateFeeAmount",
DROP COLUMN "maintenanceAmount",
DROP COLUMN "notes",
DROP COLUMN "otherChargesAmount",
DROP COLUMN "paidAmount",
DROP COLUMN "paidAt",
DROP COLUMN "periodEnd",
DROP COLUMN "periodStart",
DROP COLUMN "securityDepositAmount",
DROP COLUMN "status",
DROP COLUMN "totalAmount",
DROP COLUMN "updatedAt",
DROP COLUMN "waterAmount",
ALTER COLUMN "tenancyId" DROP NOT NULL,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TenantDue" ADD COLUMN     "month" INTEGER NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL;

-- DropTable
DROP TABLE "InvoiceLineItem";

-- DropTable
DROP TABLE "TenantCharge";

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
