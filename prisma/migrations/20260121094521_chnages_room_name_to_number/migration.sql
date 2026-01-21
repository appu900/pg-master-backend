/*
  Warnings:

  - You are about to drop the column `roomName` on the `Room` table. All the data in the column will be lost.
  - Added the required column `lastMeterReading` to the `Room` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomNumber` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Room" DROP COLUMN "roomName",
ADD COLUMN     "lastMeterReading" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "roomNumber" TEXT NOT NULL;
