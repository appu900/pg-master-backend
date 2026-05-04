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
      select: {
        id: true,
        occupiedBeds: true,
        roomNumber: true,
        tenants: {
          select: { id: true, tenancyStatus: true },
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');

    const activeTenants = room.tenants.filter(
      (t) =>
        t.tenancyStatus === TenancyStatus.ACTIVE ||
        t.tenancyStatus === TenancyStatus.NOTICE_PERIOD,
    );

    if (activeTenants.length > 0 || room.occupiedBeds > 0) {
      throw new BadRequestException(
        `Room ${room.roomNumber} is not empty — ${activeTenants.length} tenant(s) currently assigned. Move out all tenants before deleting.`,
      );
    }

    // Historical tenancy records exist: FK constraint would block delete
    if (room.tenants.length > 0) {
      throw new BadRequestException(
        `Room ${room.roomNumber} has ${room.tenants.length} historical tenancy record(s) and cannot be permanently deleted.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roomImages.deleteMany({ where: { roomId } });
      await tx.roomMeterReading.deleteMany({ where: { roomId } });
      await tx.room.delete({ where: { id: roomId } });
    });

    return { message: `Room ${room.roomNumber} deleted successfully` };
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
