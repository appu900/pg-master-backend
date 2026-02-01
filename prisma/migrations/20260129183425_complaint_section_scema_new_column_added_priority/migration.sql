-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "priority" "MaintenancePriority",
ALTER COLUMN "requestedVisitTime" DROP NOT NULL;
