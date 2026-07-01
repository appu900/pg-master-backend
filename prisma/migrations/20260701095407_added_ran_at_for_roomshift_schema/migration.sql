-- CreateTable
CREATE TABLE "RoomShiftRequest" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "tenancyId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "requestedRoomId" INTEGER NOT NULL,
    "requestedPropertyId" INTEGER,
    "reason" TEXT,
    "status" "MoveOutRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomShiftRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomShiftRequest_tenantId_idx" ON "RoomShiftRequest"("tenantId");

-- CreateIndex
CREATE INDEX "RoomShiftRequest_tenancyId_idx" ON "RoomShiftRequest"("tenancyId");

-- CreateIndex
CREATE INDEX "RoomShiftRequest_propertyId_status_idx" ON "RoomShiftRequest"("propertyId", "status");

-- CreateIndex
CREATE INDEX "RoomShiftRequest_requestedRoomId_idx" ON "RoomShiftRequest"("requestedRoomId");

-- AddForeignKey
ALTER TABLE "RoomShiftRequest" ADD CONSTRAINT "RoomShiftRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomShiftRequest" ADD CONSTRAINT "RoomShiftRequest_tenancyId_fkey" FOREIGN KEY ("tenancyId") REFERENCES "Tenancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomShiftRequest" ADD CONSTRAINT "RoomShiftRequest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomShiftRequest" ADD CONSTRAINT "RoomShiftRequest_requestedRoomId_fkey" FOREIGN KEY ("requestedRoomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomShiftRequest" ADD CONSTRAINT "RoomShiftRequest_requestedPropertyId_fkey" FOREIGN KEY ("requestedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
