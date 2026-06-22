import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RoomSharingType, TenancyStatus } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { S3Service } from 'src/infra/s3/s3.service';
import { AddRoomDto } from './dto/AddRoom.dto';
import { CreatePropertyDto } from './dto/create.property.dto';
import { editRoomDto } from './dto/edit.room.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PropertyEvents } from './property.event';
import { PropertyCreateEvent } from 'src/core/events/property-events';
import { PropertyEventPublisher } from './events/services/property.events';
import { PropertyCreatedEventPayload, RoomCreatedEventPayload } from 'src/core/events/app.event.payloads';
import { PropertyCacheManager } from './cache/services/property.cache';

const sharingMap:Record<RoomSharingType,number> = {
  SINGLE_SHARING: 1,
  DOUBLE_SHARING: 2,
  TRIPLE_SHARING: 3,
  QUAD_SHARING: 4,
  FIVE_SHARING: 5,
  SIX_SHARING: 6,
  SEVEN_SHARING: 7,
  EIGHT_SHARING: 8,
  NINE_SHARING: 9,
  TEN_SHARING: 10,
}

@Injectable()
export class PropertyService {
  private readonly logger = new Logger(PropertyService.name)
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private eventEmitter: EventEmitter2,
    private readonly events: PropertyEvents,
    private readonly propertyEventPublisher:PropertyEventPublisher,
    private readonly cacheManager:PropertyCacheManager
  ) {}


  private getSharingTypeValue(type:RoomSharingType):number{
     return sharingMap[type]
  }

  async createProperty(propertyOwnerId: number, payload: CreatePropertyDto) {
    const property = await this.prisma.property.create({
      data: {
        name: payload.propertyName,
        pinCode: payload.pinCode,
        ownerId: Number(propertyOwnerId),
      },
    });
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const propertyCreateEventPayload: PropertyCreatedEventPayload = {
      propertyId: property.id,
      ownerId: propertyOwnerId,
      month: currentMonth,
      year:currentYear
    }
    this.propertyEventPublisher.publishPropertyCreated(propertyCreateEventPayload)
    return {
      message: 'property created sucessfully',
      property,
    };
  }

  async getPropertiesByPropertyOwner(ownerId: number) {
    // fetch the data from redis if not present fallback to the db call and then again set the data
    const cachedData = await this.cacheManager.getPropertiesByOwner(ownerId);
    if(cachedData){
      return cachedData;
    }
    this.logger.debug(`cached misssed for getallproperties`)
    const response = await this.prisma.property.findMany({
      where: {
        ownerId: ownerId,
      },
      select: {
        name: true,
        id: true,
      },
    });
    // adding the new data to redis.
    await this.cacheManager.cachePropertiesByOwner(ownerId,response);
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
    console.log('payload is', dto);
    const room = await this.prisma.room.create({
      data: {
        propertyId: propertyId,
        roomNumber: dto.roomNumber,
        floorNumber: dto.floorNumber,
        totalBeds: dto.totalBeds,
        rentPerBed: dto.rentPricePerBed,
        sharingType: sharingType,
        meterReadingDate: dto.meterReadingDate ?? null,
        lastMeterReading: dto.lastMeterReading ?? null,
        amenity: dto.amenity || [],
        isAcRoom: dto.isAcRoom === 'false' ? false : true,
        hasMeter: dto.hasMeter === 'false' ? false : true,
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
    const totalBedCount = this.getSharingTypeValue(sharingType)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const roomCreatedEvent: RoomCreatedEventPayload = {
      roomId: room.id,
      ownerId: ownerId,
      propertyId: property.id,
      bedCount: totalBedCount,
      month: currentMonth,
      year:currentYear
    }
    this.events.emitCreateRoomEvent({
      roomId: room.id,
      propertyId: propertyId,
      ownerId: ownerId,
      bedCount:totalBedCount
    });
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
          select: { ownerId: true },
        },
      },
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
    if (dto.rentPricePerBed) updateData.rentPerBed = dto.rentPricePerBed;
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
          select: { ownerId: true },
        },
        images: true,
      },
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
          select: { ownerId: true },
        },
        tenants: {
          where: {
            tenancyStatus: TenancyStatus.ACTIVE,
            deletedAt: null,
          },
          include: {
            tenent: {
              include: {
                tenentProfile: true,
              },
            },
          },
        },
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
