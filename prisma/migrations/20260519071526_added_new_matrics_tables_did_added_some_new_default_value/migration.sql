/*
  Warnings:

  - Made the column `totalTenantsReadyToMoveIn` on table `PropertyOtherMetrics` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "PropertyFinanceMetrics" ALTER COLUMN "totalSecurityDepositePending" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "PropertyOtherMetrics" ALTER COLUMN "totalRooms" SET DEFAULT 0,
ALTER COLUMN "totalBeds" SET DEFAULT 0,
ALTER COLUMN "totalVacantBeds" SET DEFAULT 0,
ALTER COLUMN "totalComplaints" SET DEFAULT 0,
ALTER COLUMN "totalTenantsReadyToMoveIn" SET NOT NULL,
ALTER COLUMN "totalTenantsReadyToMoveIn" SET DEFAULT 0;
