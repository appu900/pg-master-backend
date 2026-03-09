-- CreateEnum
CREATE TYPE "InboxMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ELECTRICITY_BILL', 'WATERBILL', 'EMPLOYEE_SALARY', 'CLEANING_STAFF_SALARY', 'SECURITY_GUARD_SALARY', 'MAINTENANCE_REPAIR', 'PLUMBING', 'ELECTRICAL_REPAIR', 'INTERNET_WIFI', 'DRINKING_WATER_CANS', 'LAUNDRY', 'CLEANING_SUPPLIES', 'FURNITURE', 'APPLIANCES', 'PROPERTY_RENT', 'SOCIETY_MAINTENANCE', 'PEST_CONTROL', 'BROKER_COMMISSION', 'TRANSPORT', 'MISCELLANEOUS', 'OTHER');

-- CreateEnum
CREATE TYPE "ModeOfPayment" AS ENUM ('ONLINE', 'CASH');

-- CreateTable
CREATE TABLE "Expenses" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "expenseCategory" "ExpenseCategory" NOT NULL,
    "modeOfPayment" "ModeOfPayment" NOT NULL,
    "paidbyUserId" INTEGER NOT NULL,
    "paidToUserName" TEXT NOT NULL,
    "transactionId" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "image" TEXT,

    CONSTRAINT "Expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxMessages" (
    "id" SERIAL NOT NULL,
    "queueMessageId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "InboxMessageStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxMessages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InboxMessages_queueMessageId_key" ON "InboxMessages"("queueMessageId");

-- CreateIndex
CREATE INDEX "InboxMessages_id_idx" ON "InboxMessages"("id");

-- CreateIndex
CREATE INDEX "InboxMessages_status_idx" ON "InboxMessages"("status");

-- CreateIndex
CREATE INDEX "InboxMessages_queueMessageId_idx" ON "InboxMessages"("queueMessageId");

-- CreateIndex
CREATE INDEX "InboxMessages_messageType_status_idx" ON "InboxMessages"("messageType", "status");

-- AddForeignKey
ALTER TABLE "Expenses" ADD CONSTRAINT "Expenses_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
