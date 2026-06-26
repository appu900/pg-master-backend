-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "assignedOwnerId" INTEGER;

-- CreateIndex
CREATE INDEX "Complaint_assignedOwnerId_idx" ON "Complaint"("assignedOwnerId");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_assignedOwnerId_fkey" FOREIGN KEY ("assignedOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
