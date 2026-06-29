-- CreateEnum
CREATE TYPE "MoveInstatus" AS ENUM ('WAITING', 'MOVED_IN');

-- CreateTable
CREATE TABLE "TenantMoveInTracker" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "movedInDate" TIMESTAMP(3),
    "status" "MoveInstatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantMoveInTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantMoveInTracker_propertyId_idx" ON "TenantMoveInTracker"("propertyId");

-- CreateIndex
CREATE INDEX "TenantMoveInTracker_propertyId_status_idx" ON "TenantMoveInTracker"("propertyId", "status");

-- CreateIndex
CREATE INDEX "TenantMoveInTracker_tenancyId_idx" ON "TenantMoveInTracker"("tenancyId");

-- AddForeignKey
ALTER TABLE "TenantMoveInTracker" ADD CONSTRAINT "TenantMoveInTracker_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMoveInTracker" ADD CONSTRAINT "TenantMoveInTracker_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
