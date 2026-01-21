import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create.property.dto';
import { response } from 'express';
import { AddRoomDto } from './dto/AddRoom.dto';
import { S3Service } from 'src/infra/s3/s3.service';
import { RoomSharingType } from '@prisma/client';

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
    propertyId: number,
    dto: AddRoomDto,
    files?: Express.Multer.File[],
  ) {
    let uploadImages: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const url = await this.s3Service.uploadFile(file, 'property-rooms');
        uploadImages.push(url);
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
        amenity: dto.amenity,
      },
    });

    // ** if iimages are uploaded then create entries in RoomImages table
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


  async fetchAllRoomsOfProperty(propertyId: number) {
    return this.prisma.room.findMany({
      where:{propertyId:propertyId},
      include:{images:true}
    })
  }
}
