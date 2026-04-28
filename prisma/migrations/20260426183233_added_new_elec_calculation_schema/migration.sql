-- CreateEnum
CREATE TYPE "MeterReadingStatus" AS ENUM ('PENDING', 'SUBMITTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "BillingRunStatus" AS ENUM ('PENDING', 'WAITING_MAIN_METER', 'COMPLETED', 'SKIPPED');

-- CreateTable
CREATE TABLE "PropertyMeterReading" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "previousReading" DECIMAL(10,2) NOT NULL,
    "currentReading" DECIMAL(10,2) NOT NULL,
    "unitConsumed" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,4) NOT NULL,
    "status" "MeterReadingStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyMeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomMeterReading" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "previousReading" DECIMAL(10,2) NOT NULL,
    "currentReading" DECIMAL(10,2) NOT NULL,
    "unitConsumed" DECIMAL(10,2) NOT NULL,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomMeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityBillingRun" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "BillingRunStatus" NOT NULL DEFAULT 'PENDING',
    "mainMeterUnits" DECIMAL(10,2) NOT NULL,
    "privateRoomsUnits" DECIMAL(10,2) NOT NULL,
    "sharedPoolUnits" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,4) NOT NULL,
    "totalDaysPool" INTEGER,
    "perDayRate" DECIMAL(10,6),
    "roomReminderSentAt" TIMESTAMP(3),
    "mainMeterReminder1At" TIMESTAMP(3),
    "mainMeterReminder2At" TIMESTAMP(3),
    "ranAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityBillingRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyMeterReading_propertyId_idx" ON "PropertyMeterReading"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyMeterReading_propertyId_month_year_idx" ON "PropertyMeterReading"("propertyId", "month", "year");

-- CreateIndex
CREATE INDEX "PropertyMeterReading_status_idx" ON "PropertyMeterReading"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMeterReading_propertyId_month_year_key" ON "PropertyMeterReading"("propertyId", "month", "year");

-- CreateIndex
CREATE INDEX "RoomMeterReading_roomId_idx" ON "RoomMeterReading"("roomId");

-- CreateIndex
CREATE INDEX "RoomMeterReading_propertyId_month_year_idx" ON "RoomMeterReading"("propertyId", "month", "year");

-- CreateIndex
CREATE INDEX "RoomMeterReading_isSkipped_idx" ON "RoomMeterReading"("isSkipped");

-- CreateIndex
CREATE UNIQUE INDEX "RoomMeterReading_roomId_month_year_key" ON "RoomMeterReading"("roomId", "month", "year");

-- CreateIndex
CREATE INDEX "ElectricityBillingRun_propertyId_idx" ON "ElectricityBillingRun"("propertyId");

-- CreateIndex
CREATE INDEX "ElectricityBillingRun_status_idx" ON "ElectricityBillingRun"("status");

-- CreateIndex
CREATE INDEX "ElectricityBillingRun_propertyId_month_year_idx" ON "ElectricityBillingRun"("propertyId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ElectricityBillingRun_propertyId_month_year_key" ON "ElectricityBillingRun"("propertyId", "month", "year");

-- AddForeignKey
ALTER TABLE "PropertyMeterReading" ADD CONSTRAINT "PropertyMeterReading_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMeterReading" ADD CONSTRAINT "RoomMeterReading_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomMeterReading" ADD CONSTRAINT "RoomMeterReading_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityBillingRun" ADD CONSTRAINT "ElectricityBillingRun_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
