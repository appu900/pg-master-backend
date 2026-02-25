-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "OutBox" (
    "id" SERIAL NOT NULL,
    "messageType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutBox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutBox_messageType_idx" ON "OutBox"("messageType");

-- CreateIndex
CREATE INDEX "OutBox_messageType_status_idx" ON "OutBox"("messageType", "status");
