/*
  Warnings:

  - Added the required column `balanceAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dueDate` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gracePeriodEnd` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceType` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `propertyId` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('MONTHLY_RENT', 'PRORATED_FIRST', 'PRORATED_LAST', 'ADDITIONAL_CHARGES', 'SECURITY_DEPOSIT', 'FINAL_SETTLEMENT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'DUE', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'WAIVED');

-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('RENT', 'ELECTRICITY', 'WATER', 'MAINTENANCE', 'FINE', 'LATE_FEE', 'SECURITY_DEPOSIT', 'ADVANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('PENDING', 'ATTACHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'ONLINE_GATEWAY', 'WALLET', 'AUTO_DEBIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUND_INITIATED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('PAYMENT_WINDOW_OPEN', 'PAYMENT_DUE_SOON', 'PAYMENT_DUE_TODAY', 'PAYMENT_OVERDUE', 'PAYMENT_RECEIVED', 'INVOICE_GENERATED', 'CHARGE_ADDED', 'MOVE_OUT_REMINDER', 'WELCOME');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'PUSH');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReminderScheduleStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LateFeeType" AS ENUM ('FIXED', 'PERCENTAGE', 'PER_DAY_FIXED', 'PER_DAY_PERCENTAGE');

-- CreateEnum
CREATE TYPE "SQSMessageType" AS ENUM ('GENERATE_INVOICE', 'SEND_REMINDER', 'PROCESS_PAYMENT', 'APPLY_LATE_FEE', 'ATTACH_CHARGES', 'SCHEDULE_REMINDERS', 'SEND_WHATSAPP', 'PAYMENT_CONFIRMATION', 'INVOICE_NOTIFICATION', 'CHARGE_NOTIFICATION', 'CRON_DAILY_BILLING', 'CRON_REMINDER_SCAN');

-- CreateEnum
CREATE TYPE "SQSProcessStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "balanceAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "baseRentAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "dueDate" DATE NOT NULL,
ADD COLUMN     "electricityAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fineAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gracePeriodEnd" DATE NOT NULL,
ADD COLUMN     "invoiceType" "InvoiceType" NOT NULL,
ADD COLUMN     "lateFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "maintenanceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "otherChargesAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "propertyId" INTEGER NOT NULL,
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "totalAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "waterAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Tenancy" ADD COLUMN     "billingDayOfMonth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "firstInvoiceGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastInvoicePeriodEnd" DATE;

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "chargeType" "ChargeType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2),
    "metadata" JSONB,
    "tenantChargeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantCharge" (
    "id" SERIAL NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "chargeType" "ChargeType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'PENDING',
    "invoiceId" INTEGER,
    "previousReading" DECIMAL(10,2),
    "currentReading" DECIMAL(10,2),
    "ratePerUnit" DECIMAL(10,4),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringDay" INTEGER,
    "addedById" INTEGER NOT NULL,
    "attachments" TEXT[],
    "effectiveDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "transactionId" TEXT,
    "gatewayOrderId" TEXT,
    "gatewayPaymentId" TEXT,
    "gatewaySignature" TEXT,
    "gatewayResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "collectedById" INTEGER,
    "receiptNumber" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "previousStatus" "PaymentStatus" NOT NULL,
    "newStatus" "PaymentStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSchedule" (
    "id" SERIAL NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "invoiceId" INTEGER,
    "reminderType" "ReminderType" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ReminderScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "channel" "NotificationChannel" NOT NULL DEFAULT 'WHATSAPP',
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateData" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER,
    "tenancyId" INTEGER NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "messageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "sqsMessageId" TEXT,
    "templateName" TEXT NOT NULL,
    "templateData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingConfig" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "paymentWindowStartDay" INTEGER NOT NULL DEFAULT 25,
    "paymentWindowEndDay" INTEGER NOT NULL DEFAULT 5,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 5,
    "lateFeeType" "LateFeeType" NOT NULL DEFAULT 'FIXED',
    "lateFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lateFeeMaxAmount" DECIMAL(10,2),
    "invoiceGenerationDay" INTEGER NOT NULL DEFAULT 20,
    "reminderDaysBeforeDue" INTEGER[] DEFAULT ARRAY[-5, -2, -1]::INTEGER[],
    "reminderDaysAfterDue" INTEGER[] DEFAULT ARRAY[1, 3, 5, 7]::INTEGER[],
    "electricityRatePerUnit" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "waterFixedCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maintenanceCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SQSMessageLog" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageType" "SQSMessageType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SQSProcessStatus" NOT NULL DEFAULT 'RECEIVED',
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SQSMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_chargeType_idx" ON "InvoiceLineItem"("chargeType");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_tenantChargeId_idx" ON "InvoiceLineItem"("tenantChargeId");

-- CreateIndex
CREATE INDEX "TenantCharge_tenancyId_idx" ON "TenantCharge"("tenancyId");

-- CreateIndex
CREATE INDEX "TenantCharge_propertyId_idx" ON "TenantCharge"("propertyId");

-- CreateIndex
CREATE INDEX "TenantCharge_status_idx" ON "TenantCharge"("status");

-- CreateIndex
CREATE INDEX "TenantCharge_tenancyId_status_idx" ON "TenantCharge"("tenancyId", "status");

-- CreateIndex
CREATE INDEX "TenantCharge_chargeType_idx" ON "TenantCharge"("chargeType");

-- CreateIndex
CREATE INDEX "TenantCharge_effectiveDate_idx" ON "TenantCharge"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gatewayOrderId_key" ON "Payment"("gatewayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_tenancyId_idx" ON "Payment"("tenancyId");

-- CreateIndex
CREATE INDEX "Payment_paymentStatus_idx" ON "Payment"("paymentStatus");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_gatewayOrderId_idx" ON "Payment"("gatewayOrderId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_tenancyId_paymentStatus_idx" ON "Payment"("tenancyId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_paymentStatus_idx" ON "Payment"("invoiceId", "paymentStatus");

-- CreateIndex
CREATE INDEX "Payment_tenancyId_receiptNumber_idx" ON "Payment"("tenancyId", "receiptNumber");

-- CreateIndex
CREATE INDEX "PaymentLog_paymentId_idx" ON "PaymentLog"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentLog_createdAt_idx" ON "PaymentLog"("createdAt");

-- CreateIndex
CREATE INDEX "ReminderSchedule_status_scheduledFor_idx" ON "ReminderSchedule"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "ReminderSchedule_tenancyId_idx" ON "ReminderSchedule"("tenancyId");

-- CreateIndex
CREATE INDEX "ReminderSchedule_scheduledFor_idx" ON "ReminderSchedule"("scheduledFor");

-- CreateIndex
CREATE INDEX "ReminderSchedule_status_idx" ON "ReminderSchedule"("status");

-- CreateIndex
CREATE INDEX "ReminderSchedule_reminderType_status_idx" ON "ReminderSchedule"("reminderType", "status");

-- CreateIndex
CREATE INDEX "ReminderLog_invoiceId_idx" ON "ReminderLog"("invoiceId");

-- CreateIndex
CREATE INDEX "ReminderLog_tenancyId_idx" ON "ReminderLog"("tenancyId");

-- CreateIndex
CREATE INDEX "ReminderLog_status_idx" ON "ReminderLog"("status");

-- CreateIndex
CREATE INDEX "ReminderLog_createdAt_idx" ON "ReminderLog"("createdAt");

-- CreateIndex
CREATE INDEX "ReminderLog_reminderType_status_idx" ON "ReminderLog"("reminderType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingConfig_propertyId_key" ON "BillingConfig"("propertyId");

-- CreateIndex
CREATE INDEX "BillingConfig_propertyId_idx" ON "BillingConfig"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "SQSMessageLog_messageId_key" ON "SQSMessageLog"("messageId");

-- CreateIndex
CREATE INDEX "SQSMessageLog_messageId_idx" ON "SQSMessageLog"("messageId");

-- CreateIndex
CREATE INDEX "SQSMessageLog_messageType_idx" ON "SQSMessageLog"("messageType");

-- CreateIndex
CREATE INDEX "SQSMessageLog_status_idx" ON "SQSMessageLog"("status");

-- CreateIndex
CREATE INDEX "SQSMessageLog_createdAt_idx" ON "SQSMessageLog"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenancyId_idx" ON "Invoice"("tenancyId");

-- CreateIndex
CREATE INDEX "Invoice_propertyId_idx" ON "Invoice"("propertyId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_tenancyId_periodStart_periodEnd_idx" ON "Invoice"("tenancyId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_propertyId_status_idx" ON "Invoice"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Invoice_propertyId_status_dueDate_idx" ON "Invoice"("propertyId", "status", "dueDate");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_tenantChargeId_fkey" FOREIGN KEY ("tenantChargeId") REFERENCES "TenantCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCharge" ADD CONSTRAINT "TenantCharge_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantCharge" ADD CONSTRAINT "TenantCharge_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingConfig" ADD CONSTRAINT "BillingConfig_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
