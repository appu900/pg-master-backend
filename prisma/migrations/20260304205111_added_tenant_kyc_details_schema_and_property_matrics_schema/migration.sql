/*
  Warnings:

  - You are about to drop the `BillingConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReminderLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SQSMessageLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BillingConfig" DROP CONSTRAINT "BillingConfig_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "ReminderLog" DROP CONSTRAINT "ReminderLog_invoiceId_fkey";

-- DropTable
DROP TABLE "BillingConfig";

-- DropTable
DROP TABLE "NotificationPreference";

-- DropTable
DROP TABLE "ReminderLog";

-- DropTable
DROP TABLE "SQSMessageLog";

-- CreateTable
CREATE TABLE "TenantKycDetails" (
    "id" SERIAL NOT NULL,
    "tenantProfileId" INTEGER NOT NULL,
    "idProof" TEXT,
    "rentalAgreement" TEXT,
    "policeVerification" TEXT,
    "otherDocument" TEXT,
    "RentingDetailsVerificationStatus" BOOLEAN NOT NULL DEFAULT false,
    "IdVerificationStatus" BOOLEAN NOT NULL DEFAULT false,
    "RentalAgreementVerificationStatus" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TenantKycDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMonthlyMetrics" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalIncome" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rentIncome" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherIncome" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "salaryExpenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maintenanceExpenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "utilityExpenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherExpenses" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pendingInvoices" INTEGER NOT NULL DEFAULT 0,
    "activeTenantsCount" INTEGER NOT NULL DEFAULT 0,
    "occupancyRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMonthlyMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyLifetimeMetrics" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "totalIncomeAllTime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalExpensesAllTime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalDueAllTime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalTenantsAllTime" INTEGER NOT NULL DEFAULT 0,
    "totalInvoicesAllTime" INTEGER NOT NULL DEFAULT 0,
    "totalPaymentsAllTime" INTEGER NOT NULL DEFAULT 0,
    "firstActivityDate" TIMESTAMP(3),
    "lastActivityDate" TIMESTAMP(3),
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyLifetimeMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantKycDetails_tenantProfileId_key" ON "TenantKycDetails"("tenantProfileId");

-- CreateIndex
CREATE INDEX "PropertyMonthlyMetrics_propertyId_idx" ON "PropertyMonthlyMetrics"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyMonthlyMetrics_year_month_idx" ON "PropertyMonthlyMetrics"("year", "month");

-- CreateIndex
CREATE INDEX "PropertyMonthlyMetrics_propertyId_year_month_idx" ON "PropertyMonthlyMetrics"("propertyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMonthlyMetrics_propertyId_year_month_key" ON "PropertyMonthlyMetrics"("propertyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyLifetimeMetrics_propertyId_key" ON "PropertyLifetimeMetrics"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyLifetimeMetrics_propertyId_idx" ON "PropertyLifetimeMetrics"("propertyId");

-- AddForeignKey
ALTER TABLE "TenantKycDetails" ADD CONSTRAINT "TenantKycDetails_tenantProfileId_fkey" FOREIGN KEY ("tenantProfileId") REFERENCES "TenentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMonthlyMetrics" ADD CONSTRAINT "PropertyMonthlyMetrics_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLifetimeMetrics" ADD CONSTRAINT "PropertyLifetimeMetrics_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
