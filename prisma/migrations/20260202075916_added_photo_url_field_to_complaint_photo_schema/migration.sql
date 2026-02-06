/*
  Warnings:

  - Added the required column `imageUrl` to the `ComplaintPhoto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComplaintPhoto" ADD COLUMN     "imageUrl" TEXT NOT NULL;
