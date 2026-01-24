/*
  Warnings:

  - You are about to drop the column `agreementPeriod` on the `TenentProfile` table. All the data in the column will be lost.
  - Added the required column `JoiningDate` to the `TenentProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TenentProfile" DROP COLUMN "agreementPeriod",
ADD COLUMN     "JoiningDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "agreementPeriodinMonths" INTEGER DEFAULT 0,
ADD COLUMN     "moveOutDate" TIMESTAMP(3);
