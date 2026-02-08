/*
  Warnings:

  - You are about to drop the column `aadhaarCardUrl` on the `BusinessDetails` table. All the data in the column will be lost.
  - Added the required column `aadhaarCard` to the `BusinessDetails` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `BusinessDetails` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BusinessApprovalStatus" AS ENUM ('APPROVED', 'REJECTED', 'PENDING');

-- AlterEnum
ALTER TYPE "BusinessDetailsStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "BusinessDetails" DROP COLUMN "aadhaarCardUrl",
ADD COLUMN     "aadhaarCard" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "BusinessApprovalStatus" NOT NULL;

-- AlterTable
ALTER TABLE "PropertyOwnerProfile" ADD COLUMN     "BusinessProfileStatus" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "BusinessDetails_status_idx" ON "BusinessDetails"("status");

-- CreateIndex
CREATE INDEX "BusinessDetails_propertyOwnerProfileId_idx" ON "BusinessDetails"("propertyOwnerProfileId");
