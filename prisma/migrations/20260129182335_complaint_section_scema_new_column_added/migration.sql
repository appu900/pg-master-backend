/*
  Warnings:

  - Added the required column `propertyId` to the `Complaint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "propertyId" INTEGER NOT NULL,
ADD COLUMN     "roomNmber" TEXT;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
