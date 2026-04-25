import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SQSMessageType,
  TenancyStatus,
  TenantStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async deleteRoom(roomId: number, ownerUserId: number) {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        property: { ownerId: ownerUserId },
      },
      include: {
        tenants: {
          where: {
            tenancyStatus: TenancyStatus.ACTIVE,
            deletedAt: null,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.tenants.length > 0) {
      throw new BadRequestException(
        'Cannot delete room with active tenants',
      );
    }

    await this.prisma.room.delete({ where: { id: roomId } });
    return { message: 'Room deleted successfully' };
  }

  async fetchAllTenantsOfRoom(roomId: number) {
    const tenency = await this.prisma.tenancy.findMany({
      where: {
        roomId: roomId,
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
    });
    return tenency;
  }
}
