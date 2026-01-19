-- CreateEnum
CREATE TYPE "RoomSharingType" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD');

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "roomName" TEXT NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "totalBeds" INTEGER NOT NULL,
    "occupiedBeds" INTEGER NOT NULL DEFAULT 0,
    "rentPerBed" INTEGER NOT NULL,
    "sharingType" "RoomSharingType" NOT NULL,
    "meterReadingDate" TIMESTAMP(3),
    "amenity" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomImages" (
    "id" SERIAL NOT NULL,
    "roomId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "RoomImages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomImages" ADD CONSTRAINT "RoomImages_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
