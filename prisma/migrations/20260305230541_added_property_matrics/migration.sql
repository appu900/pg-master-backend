/*
  Warnings:

  - You are about to drop the column `maintenanceExpenses` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `otherExpenses` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `otherIncome` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `rentIncome` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `salaryExpenses` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `totalExpenses` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `totalIncome` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.
  - You are about to drop the column `utilityExpenses` on the `PropertyMonthlyMetrics` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PropertyMonthlyMetrics" DROP COLUMN "maintenanceExpenses",
DROP COLUMN "otherExpenses",
DROP COLUMN "otherIncome",
DROP COLUMN "rentIncome",
DROP COLUMN "salaryExpenses",
DROP COLUMN "totalExpenses",
DROP COLUMN "totalIncome",
DROP COLUMN "utilityExpenses",
ADD COLUMN     "currentDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "invoicesGenerated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openingDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "otherInvoiced" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "overdueInvoices" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paidInvoices" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rentCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "rentInvoiced" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalInvoiced" DECIMAL(10,2) NOT NULL DEFAULT 0;
