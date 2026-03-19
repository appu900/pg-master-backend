/*
  Warnings:

  - The values [SINGLE,DOUBLE,TRIPLE,QUAD] on the enum `RoomSharingType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoomSharingType_new" AS ENUM ('SINGLE_SHARING', 'DOUBLE_SHARING', 'TRIPLE_SHARING', 'QUAD_SHARING', 'FIVE_SHARING', 'SIX_SHARING', 'SEVEN_SHARING', 'EIGHT_SHARING', 'NINE_SHARING', 'TEN_SHARING');
ALTER TABLE "Room" ALTER COLUMN "sharingType" TYPE "RoomSharingType_new" USING ("sharingType"::text::"RoomSharingType_new");
ALTER TYPE "RoomSharingType" RENAME TO "RoomSharingType_old";
ALTER TYPE "RoomSharingType_new" RENAME TO "RoomSharingType";
DROP TYPE "public"."RoomSharingType_old";
COMMIT;
