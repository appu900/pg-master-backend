-- CreateTable
CREATE TABLE "PropertyFinanceMetrics" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDueGenerated" BIGINT NOT NULL DEFAULT 0,
    "totalElectricityDueGenerated" BIGINT NOT NULL DEFAULT 0,
    "totalDueCollected" BIGINT NOT NULL DEFAULT 0,
    "totalPendingDue" BIGINT NOT NULL DEFAULT 0,
    "totalSecurityDepositePending" INTEGER NOT NULL,
    "totalTenantsPaid" INTEGER NOT NULL DEFAULT 0,
    "totalTenantsNotPaid" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyFinanceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyOtherMetrics" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "totalVacantBeds" INTEGER NOT NULL,
    "totalComplaints" INTEGER NOT NULL,
    "totalTenantsReadyToMoveIn" INTEGER,
    "totalTenantsReadyToMoveout" INTEGER NOT NULL DEFAULT 0,
    "totalTenantsInNoticePeriod" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyOtherMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyFinanceMetrics_propertyId_month_year_idx" ON "PropertyFinanceMetrics"("propertyId", "month", "year");

-- CreateIndex
CREATE INDEX "PropertyFinanceMetrics_propertyId_idx" ON "PropertyFinanceMetrics"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyFinanceMetrics_ownerId_idx" ON "PropertyFinanceMetrics"("ownerId");

-- CreateIndex
CREATE INDEX "PropertyOtherMetrics_propertyId_idx" ON "PropertyOtherMetrics"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyOtherMetrics_ownerId_idx" ON "PropertyOtherMetrics"("ownerId");
