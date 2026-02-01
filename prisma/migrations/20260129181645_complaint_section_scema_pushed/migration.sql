-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MaintenanceJobPosition" ADD VALUE 'OWNER';
ALTER TYPE "MaintenanceJobPosition" ADD VALUE 'CO_PARTNER';
ALTER TYPE "MaintenanceJobPosition" ADD VALUE 'SUPERVISOR';
ALTER TYPE "MaintenanceJobPosition" ADD VALUE 'ACCOUNTANT';
ALTER TYPE "MaintenanceJobPosition" ADD VALUE 'OPERATIONS_HEAD';

-- DropEnum
DROP TYPE "MaintenanceStatus";

-- CreateTable
CREATE TABLE "Complaint" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "raisedById" INTEGER NOT NULL,
    "assignedMaintenanceStaffProfileId" INTEGER NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintActivityLog" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "complaintId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplaintActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplaintPhoto" (
    "id" SERIAL NOT NULL,
    "complaintId" INTEGER NOT NULL,

    CONSTRAINT "ComplaintPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_raisedById_idx" ON "Complaint"("raisedById");

-- CreateIndex
CREATE INDEX "Complaint_assignedMaintenanceStaffProfileId_idx" ON "Complaint"("assignedMaintenanceStaffProfileId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "ComplaintActivityLog_complaintId_idx" ON "ComplaintActivityLog"("complaintId");

-- CreateIndex
CREATE INDEX "ComplaintPhoto_complaintId_idx" ON "ComplaintPhoto"("complaintId");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedMaintenanceStaffProfileId_fkey" FOREIGN KEY ("assignedMaintenanceStaffProfileId") REFERENCES "MaintenanceStaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintActivityLog" ADD CONSTRAINT "ComplaintActivityLog_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplaintPhoto" ADD CONSTRAINT "ComplaintPhoto_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
