-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceStaffType" AS ENUM ('ADMIN_STAFF', 'SERVICE_STAFF');

-- CreateEnum
CREATE TYPE "MaintenanceJobPosition" AS ENUM ('ELECTRICIAN', 'PLUMBER', 'CLEANER', 'CARPENTER', 'SECURITY', 'MANAGER', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyAccessScope" AS ENUM ('ALL_PROPERTIES', 'SELECTIVE');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MaintenanceStaffProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "whatsAppNumber" TEXT,
    "staffType" "MaintenanceStaffType" NOT NULL,
    "jobPosition" "MaintenanceJobPosition" NOT NULL,
    "monthlySalary" DECIMAL(10,2) NOT NULL,
    "propertyScope" "PropertyAccessScope" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceStaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceStaffPropertyAccess" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "staffProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceStaffPropertyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBook" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "employeeProfileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceStaffProfile_userId_key" ON "MaintenanceStaffProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeBook_employeeProfileId_key" ON "EmployeeBook"("employeeProfileId");

-- AddForeignKey
ALTER TABLE "MaintenanceStaffProfile" ADD CONSTRAINT "MaintenanceStaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceStaffPropertyAccess" ADD CONSTRAINT "MaintenanceStaffPropertyAccess_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "MaintenanceStaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceStaffPropertyAccess" ADD CONSTRAINT "MaintenanceStaffPropertyAccess_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBook" ADD CONSTRAINT "EmployeeBook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBook" ADD CONSTRAINT "EmployeeBook_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "MaintenanceStaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
