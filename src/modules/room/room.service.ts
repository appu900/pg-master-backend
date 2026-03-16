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
import { AddTenantDto } from './dto/add.tenant.dto';
import { SqsService } from 'src/infra/Queue/SQS/sqs.service';
import { SQS_MESSAGE_TYPES } from 'src/common/sqs/message-types';
import { WHATSAPP_TEMPLATES } from 'src/common/types/Notifications/whatsapp_templates';
import { WHATSAPP_MESSAGE_TYPE } from 'src/common/types/Notifications/whatsapp.messages.types';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqsService: SqsService,
  ) {}

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
