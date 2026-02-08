-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('INDIVIDUAL', 'PROPRIETORSHIP', 'PARTNERSHIP', 'PRIVATE_LIMITED', 'LLP', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessDetailsStatus" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "profileImage" TEXT,
    "createdBy" TEXT,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDetails" (
    "id" SERIAL NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "status" "BusinessDetailsStatus" NOT NULL,
    "propertyOwnerProfileId" INTEGER NOT NULL,
    "aadhaarCardUrl" TEXT NOT NULL,
    "panCard" TEXT NOT NULL,
    "companyDocument" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDetails_propertyOwnerProfileId_key" ON "BusinessDetails"("propertyOwnerProfileId");

-- CreateIndex
CREATE INDEX "EmployeeBook_ownerId_idx" ON "EmployeeBook"("ownerId");

-- CreateIndex
CREATE INDEX "EmployeeBook_employeeProfileId_idx" ON "EmployeeBook"("employeeProfileId");

-- CreateIndex
CREATE INDEX "EmployeeBook_ownerId_employeeProfileId_idx" ON "EmployeeBook"("ownerId", "employeeProfileId");

-- CreateIndex
CREATE INDEX "MaintenanceStaffProfile_userId_idx" ON "MaintenanceStaffProfile"("userId");

-- CreateIndex
CREATE INDEX "MaintenanceStaffProfile_staffType_idx" ON "MaintenanceStaffProfile"("staffType");

-- CreateIndex
CREATE INDEX "MaintenanceStaffProfile_isActive_idx" ON "MaintenanceStaffProfile"("isActive");

-- CreateIndex
CREATE INDEX "MaintenanceStaffPropertyAccess_propertyId_idx" ON "MaintenanceStaffPropertyAccess"("propertyId");

-- CreateIndex
CREATE INDEX "MaintenanceStaffPropertyAccess_staffProfileId_idx" ON "MaintenanceStaffPropertyAccess"("staffProfileId");

-- CreateIndex
CREATE INDEX "MaintenanceStaffPropertyAccess_propertyId_staffProfileId_idx" ON "MaintenanceStaffPropertyAccess"("propertyId", "staffProfileId");

-- CreateIndex
CREATE INDEX "Property_pinCode_idx" ON "Property"("pinCode");

-- CreateIndex
CREATE INDEX "PropertyOwnerProfile_pinCode_idx" ON "PropertyOwnerProfile"("pinCode");

-- CreateIndex
CREATE INDEX "PropertyOwnerProfile_userId_idx" ON "PropertyOwnerProfile"("userId");

-- CreateIndex
CREATE INDEX "Room_propertyId_idx" ON "Room"("propertyId");

-- CreateIndex
CREATE INDEX "Room_sharingType_idx" ON "Room"("sharingType");

-- CreateIndex
CREATE INDEX "Room_propertyId_floorNumber_idx" ON "Room"("propertyId", "floorNumber");

-- CreateIndex
CREATE INDEX "RoomImages_roomId_idx" ON "RoomImages"("roomId");

-- CreateIndex
CREATE INDEX "Tenancy_propertyId_idx" ON "Tenancy"("propertyId");

-- CreateIndex
CREATE INDEX "Tenancy_status_idx" ON "Tenancy"("status");

-- CreateIndex
CREATE INDEX "Tenancy_joinedAt_idx" ON "Tenancy"("joinedAt");

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessDetails" ADD CONSTRAINT "BusinessDetails_propertyOwnerProfileId_fkey" FOREIGN KEY ("propertyOwnerProfileId") REFERENCES "PropertyOwnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
