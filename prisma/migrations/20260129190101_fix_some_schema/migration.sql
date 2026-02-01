/*
  Warnings:

  - You are about to drop the column `roomNmber` on the `Complaint` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_assignedMaintenanceStaffProfileId_fkey";

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "roomNmber",
ADD COLUMN     "roomNumber" TEXT,
ALTER COLUMN "assignedMaintenanceStaffProfileId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedMaintenanceStaffProfileId_fkey" FOREIGN KEY ("assignedMaintenanceStaffProfileId") REFERENCES "MaintenanceStaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
