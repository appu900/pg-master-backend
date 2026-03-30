/*
  Warnings:

  - You are about to drop the `ReminderSchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReminderSchedule" DROP CONSTRAINT "ReminderSchedule_tenancyId_fkey";

-- DropTable
DROP TABLE "ReminderSchedule";

-- CreateTable
CREATE TABLE "DailyReminderQueue" (
    "id" SERIAL NOT NULL,
    "dueId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "tenantPhone" TEXT NOT NULL,
    "dueType" "DueType" NOT NULL,
    "TenantName" TEXT NOT NULL,
    "dueAmount" DECIMAL(10,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReminderQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyReminderQueue_dueId_key" ON "DailyReminderQueue"("dueId");

-- CreateIndex
CREATE INDEX "DailyReminderQueue_tenancyId_idx" ON "DailyReminderQueue"("tenancyId");

-- CreateIndex
CREATE INDEX "DailyReminderQueue_propertyId_idx" ON "DailyReminderQueue"("propertyId");

-- CreateIndex
CREATE INDEX "DailyReminderQueue_dueDate_idx" ON "DailyReminderQueue"("dueDate");

-- AddForeignKey
ALTER TABLE "DailyReminderQueue" ADD CONSTRAINT "DailyReminderQueue_dueId_fkey" FOREIGN KEY ("dueId") REFERENCES "TenantDue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReminderQueue" ADD CONSTRAINT "DailyReminderQueue_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReminderQueue" ADD CONSTRAINT "DailyReminderQueue_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
