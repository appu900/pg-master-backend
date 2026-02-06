import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { RoomSharingType } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { S3Service } from 'src/infra/s3/s3.service';
import { AddRoomDto } from './dto/AddRoom.dto';
import { CreatePropertyDto } from './dto/create.property.dto';
import { editRoomDto } from './dto/edit.room.dto';

@Injectable()
export class PropertyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async createProperty(propertyOwnerId: number, payload: CreatePropertyDto) {
    const property = await this.prisma.property.create({
      data: {
        name: payload.propertyName,
        pinCode: payload.pinCode,
        ownerId: Number(propertyOwnerId),
      },
    });
    return {
      message: 'property created sucessfully',
      property,
    };
  }

  async getPropertiesByPropertyOwner(ownerId: number) {
    const response = await this.prisma.property.findMany({
      where: {
        ownerId: ownerId,
      },
      select: {
        name: true,
        id: true,
      },
    });

    return response;
  }

  async addRooms(
    ownerId: number,
    propertyId: number,
    dto: AddRoomDto,
    files?: Express.Multer.File[],
  ) {
  
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId, ownerId: ownerId },
    });
    if (!property)
      throw new ForbiddenException('property not found for this owner');
    
    let uploadImages: string[] = [];
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const url = await this.s3Service.uploadFile(file, 'property-rooms');
          uploadImages.push(url);
        } catch (error) {
          // Silent fail for individual image upload errors
        }
      }
    }
    
    const sharingType = dto.sharingType.toUpperCase() as RoomSharingType;
    const room = await this.prisma.room.create({
      data: {
        propertyId: propertyId,
        roomNumber: dto.roomNumber,
        floorNumber: dto.floorNumber,
        totalBeds: dto.totalBeds,
        rentPerBed: dto.rentPricePerBed,
        sharingType: sharingType,
        meterReadingDate: dto.meterReadingDate,
        lastMeterReading: dto.lastMeterReading,
        amenity: dto.amenity || [],
      },
    });

    if (uploadImages.length > 0) {
      for (const imageUrl of uploadImages) {
        await this.prisma.roomImages.create({
          data: {
            roomId: room.id,
            url: imageUrl,
          },
        });
      }
    }

    return this.prisma.room.findUnique({
      where: { id: room.id },
      include: { images: true },
    });
  }

  async editRoom(
    roomId: number,
    dto: editRoomDto,
    ownerId: number,
    files?: Express.Multer.File[],
  ) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        property: {
          select: { ownerId: true }
        }
      }
    });
    
    if (!room) {
      throw new BadRequestException('Room not found');
    }
  
    if (room.property.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this room');
    }
    
    let uploadedImages: string[] = [];
    
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const url = await this.s3Service.uploadFile(file, 'property-rooms');
          uploadedImages.push(url);
        } catch (error) {
          // Silent fail for individual image upload errors
        }
      }
    }

    const updateData: any = {};
    if (dto.roomNumber) updateData.roomNumber = dto.roomNumber;
    if (dto.floorNumber) updateData.floorNumber = dto.floorNumber;
    if (dto.totalBeds) updateData.totalBeds = dto.totalBeds;
    if (dto.rentPricePerBed)
      updateData.rentPerBed = dto.rentPricePerBed;
    if (dto.meterReadingDate)
      updateData.meterReadingDate = dto.meterReadingDate;
    if (dto.lastMeterReading)
      updateData.lastMeterReading = dto.lastMeterReading;
    if (dto.amenity && dto.amenity.length > 0) updateData.amenity = dto.amenity;

    if (dto.sharingType) {
      updateData.sharingType = dto.sharingType.toUpperCase() as RoomSharingType;
    }

    await this.prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    if (uploadedImages.length > 0) {
      await this.prisma.roomImages.createMany({
        data: uploadedImages.map((url) => ({
          roomId,
          url,
        })),
      });
    }
    
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: { images: true },
    });
  }

  async fetchAllRoomsOfProperty(propertyId: number) {
    return this.prisma.room.findMany({
      where: { propertyId: propertyId },
      include: { images: true },
    });
  }

  async deleteRoom(roomId: number, ownerId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        property: {
          select: { ownerId: true }
        },
        images: true,
      }
    });
    
    if (!room) {
      throw new BadRequestException('Room not found');
    }
    
    if (room.property.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this room');
    }

    if (room.images?.length) {
      for (const image of room.images) {
        await this.s3Service.deleteFile(image.url);
      }
    }
    
    await this.prisma.roomImages.deleteMany({
      where: { roomId: roomId },
    });
    
    await this.prisma.room.delete({
      where: { id: roomId },
    });
    
    return { message: 'Room deleted successfully' };
  }

  async deleteRoomImage(roomId: number, imageId: number, ownerId: number) {
    const image = await this.prisma.roomImages.findUnique({
      where: { id: imageId },
      include: {
        room: {
          select: {
            id: true,
            property: {
              select: { ownerId: true },
            },
          },
        },
      },
    });

    if (!image) {
      throw new BadRequestException('Image not found');
    }

    if (image.room.id !== roomId) {
      throw new BadRequestException('Image does not belong to this room');
    }

    if (image.room.property.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this room');
    }

    await this.s3Service.deleteFile(image.url);
    await this.prisma.roomImages.delete({ where: { id: imageId } });

    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { images: true },
    });

    return {
      message: 'Image deleted successfully',
      room,
    };
  }

  async getRoomDetails(roomId: number, ownerId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { 
        images: true,
        property: {
          select: { ownerId: true }
        }
      },
    });
    
    if (!room) {
      throw new BadRequestException('Room not found');
    }
    
    if (room.property.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this room');
    }
  
    const { property, ...roomData } = room;
    return roomData;
  }
}








