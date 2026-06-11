/*
  Warnings:

  - A unique constraint covering the columns `[eventId]` on the table `WebhookData` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED');

-- AlterTable
ALTER TABLE "WebhookData" ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "retryCount" INTEGER,
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "status" "PaymentWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookData_eventId_key" ON "WebhookData"("eventId");
