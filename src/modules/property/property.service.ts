import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create.property.dto';
import { response } from 'express';

@Injectable()
export class PropertyService {
  constructor(private readonly prisma: PrismaService) {}

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
}
