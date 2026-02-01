/*
  Warnings:

  - Added the required column `requestedVisitTime` to the `Complaint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "requestedVisitDate" DATE,
ADD COLUMN     "requestedVisitTime" TIME NOT NULL;
