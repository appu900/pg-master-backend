-- CreateEnum
CREATE TYPE "MoveOutRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "Tenancy_roomId_tenentId_key";

-- DropIndex
DROP INDEX "Tenancy_tenentId_key";

-- DropIndex
DROP INDEX "TenantKyc_status_key";

-- CreateTable
CREATE TABLE "MoveOutRequest" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "status" "MoveOutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedMoveOutDate" DATE NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoveOutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoveOutRequest_tenantId_idx" ON "MoveOutRequest"("tenantId");

-- CreateIndex
CREATE INDEX "MoveOutRequest_tenancyId_idx" ON "MoveOutRequest"("tenancyId");

-- CreateIndex
CREATE INDEX "MoveOutRequest_propertyId_status_idx" ON "MoveOutRequest"("propertyId", "status");

-- AddForeignKey
ALTER TABLE "MoveOutRequest" ADD CONSTRAINT "MoveOutRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveOutRequest" ADD CONSTRAINT "MoveOutRequest_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveOutRequest" ADD CONSTRAINT "MoveOutRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
