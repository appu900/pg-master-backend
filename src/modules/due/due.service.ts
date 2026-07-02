import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { nowIST } from 'src/utils/Proration.utils';
import { AddDueDto } from '../billing/dto/add-due.dto';
import {
  CreateDueForRoomDto,
  CreateDueForTenantDto,
} from './dto/create.due.dto';
import { CollectDueDto } from './dto/collect-due.dto';
import { DueStatus, TenancyStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DueCreatedEvent,
  DuePaymentCollectedEvent,
} from 'src/core/events/domain-events';
import { StreamName } from 'bullmq';
import {
  IQueueProducer,
  QUEUE_PRODUCER,
} from 'src/core/ports/queue-producer.port';
import { QUEUES } from 'src/core/queue/queue.constants';
import { BulkReminderDto, BulkReminderResult } from './dto/bulk-reminder.dto';
import { RedisService } from 'src/infra/redis/redis.service';

/** Tenancies that can have dues viewed, collected, and created. */
const BILLABLE_TENANCY_STATUSES: TenancyStatus[] = [
  TenancyStatus.ACTIVE,
  TenancyStatus.NOTICE_PERIOD,
  TenancyStatus.PENDING,
];

@Injectable()
export class DueService {
  private readonly logger = new Logger(DueService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService:RedisService,
    @Inject(QUEUE_PRODUCER) private readonly queue: IQueueProducer,
  ) {}

  async addDueToTenant(dto: CreateDueForTenantDto, propertyId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        propertyId: propertyId,
        tenentId: dto.tenantId,
        tenancyStatus: { in: BILLABLE_TENANCY_STATUSES },
        deletedAt: null,
      },
    });
    if (!tenancy) {
      throw new BadRequestException('Invalid tenant');
    }
    const istNow = nowIST();
    const currentMonth = istNow.getUTCMonth() + 1;
    const year = istNow.getUTCFullYear();
    const dueDate = dto.DuesToDate;
    const amount = Math.ceil(dto.amount);
    const dueLabel = dto.dueType === 'OTHER' && dto.customDueType ? dto.customDueType : dto.dueType;
    const due = await this.prisma.tenantDue.create({
      data: {
        tenancyId: tenancy.id,
        propertyId: tenancy.propertyId,
        dueType: dto.dueType,
        customDueType: dto.dueType === 'OTHER' ? (dto.customDueType ?? null) : null,
        title: `${dueLabel} for ${dto.tenantId} for the month ${currentMonth} and year ${year}`,
        description: `${dueLabel} generated for tenant with id ${dto.tenantId} for the month ${currentMonth} and year ${year}`,
        month: currentMonth,
        year: year,
        totalAmount: amount,
        balanceAmount: amount,
        dueDate: dueDate,
      },
    });
    this.eventEmitter.emit(
      'due.created',
      new DueCreatedEvent(
        due.id,
        tenancy.id,
        tenancy.propertyId,
        due.dueType,
        amount,
        currentMonth,
        year,
      ),
    );
    return due;
  }

  async addDueToRoom(dto: CreateDueForRoomDto, propertyId: number) {
    const room = await this.prisma.room.findFirst({
      where: {
        propertyId: propertyId,
        id: dto.roomId,
      },
      select: {
        tenants: {
          select: {
            id: true,
            tenentId: true,
          },
        },
      },
    });
    if (!room) {
      throw new BadRequestException('Invalid room');
    }
    const tenencies = await this.prisma.tenancy.findMany({
      where: {
        roomId: dto.roomId,
        tenancyStatus: { in: BILLABLE_TENANCY_STATUSES },
        deletedAt: null,
        propertyId: propertyId,
      },
      select: {
        id: true,
        tenentId: true,
        propertyId: true,
      },
    });
    if (tenencies.length === 0)
      throw new BadRequestException('No billable tenancy found for the room');
    const totaltenents = tenencies.length;

    const individualAmounts = Math.ceil(dto.totalAmount / totaltenents);
    const istNow = nowIST();
    const currentMonth = istNow.getUTCMonth() + 1;
    const year = istNow.getUTCFullYear();
    const dueDate = dto.DuesToDate;
    const dueLabel = dto.dueType === 'OTHER' && dto.customDueType ? dto.customDueType : dto.dueType;
    const txResult = await this.prisma.$transaction(async (tx) => {
      const dues = await Promise.all(
        tenencies.map((tenancy) =>
          tx.tenantDue.create({
            data: {
              tenancyId: tenancy.id,
              propertyId: tenancy.propertyId,
              dueType: dto.dueType,
              customDueType: dto.dueType === 'OTHER' ? (dto.customDueType ?? null) : null,
              title: `${dueLabel} for ${tenancy.tenentId} for the month ${currentMonth} and year ${year}`,
              description: `${dueLabel} generated for tenant with id ${tenancy.tenentId} for the month ${currentMonth} and year ${year}`,
              month: currentMonth,
              year: year,
              totalAmount: individualAmounts,
              balanceAmount: individualAmounts,
              dueDate: dueDate,
            },
          }),
        ),
      );
      return {
        message: 'Dues added successfully',
        count: dues.length,
        dues,
      };
    });

    txResult.dues.forEach((due) => {
      this.eventEmitter.emit(
        'due.created',
        new DueCreatedEvent(
          due.id,
          due.tenancyId,
          due.propertyId,
          due.dueType,
          Number(due.totalAmount),
          currentMonth,
          year,
        ),
      );
    });

    return txResult;
  }
  async fetchAllDuesByTenantId(requestingTenantId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenancyStatus: { in: BILLABLE_TENANCY_STATUSES },
        tenentId: requestingTenantId,
        deletedAt: null,
      },
    });
    if (!tenancy) {
      throw new InternalServerErrorException();
    }
    const dues = await this.prisma.tenantDue.findMany({
      where: {
        tenancyId: tenancy.id,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      select: {
        id: true,
        dueType: true,
        customDueType: true,
        title: true,
        description: true,
        month: true,
        year: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        dueDate: true,
        property: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return dues.length > 0 ? dues : 'No pending dues found';
  }

  async getTenantDuesByTenancyId(tenantId: number) {
    const dues = await this.prisma.tenancy.findFirst({
      where: {
        tenentId: tenantId,
        tenancyStatus: { in: BILLABLE_TENANCY_STATUSES },
        deletedAt: null,
      },
    });
    if (!dues) {
      throw new InternalServerErrorException(
        'No billable tenancy found for tenant',
      );
    }
    const tenantDues = await this.prisma.tenantDue.findMany({
      where: {
        tenancyId: dues.id,
      },
      select: {
        id: true,
        dueType: true,
        customDueType: true,
        title: true,
        description: true,
        month: true,
        year: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        dueDate: true,
        property: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
    return tenantDues.length > 0 ? tenantDues : 'No dues found for tenant';
  }

  async getUnpaidDuesByProperty(propertyId: number) {
    const dues = await this.prisma.tenantDue.findMany({
      where: {
        propertyId,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      select: {
        id: true,
        dueType: true,
        customDueType: true,
        title: true,
        description: true,
        month: true,
        year: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        dueDate: true,
        tenancy: {
          select: {
            id: true,
            tenent: {
              select: { id: true, fullName: true, phoneNumber: true },
            },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return dues;
  }

  async getUnpaidDuesByTenantId(tenantId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenentId: tenantId,
        tenancyStatus: { in: BILLABLE_TENANCY_STATUSES },
        deletedAt: null,
      },
    });
    if (!tenancy) {
      throw new BadRequestException('No billable tenancy found for tenant');
    }
    const dues = await this.prisma.tenantDue.findMany({
      where: {
        tenancyId: tenancy.id,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      select: {
        id: true,
        dueType: true,
        customDueType: true,
        title: true,
        description: true,
        month: true,
        year: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        dueDate: true,
        property: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return dues;
  }

  async getDuesByTenantAndProperty(tenantId: number, propertyId: number) {
    const tenancies = await this.prisma.tenancy.findMany({
      where: {
        tenentId: tenantId,
        propertyId,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    if (tenancies.length === 0) {
      throw new BadRequestException(
        'No tenancy found for this tenant in the given property',
      );
    }

    const tenancyIds = tenancies.map((tenancy) => tenancy.id);
    const dues = await this.prisma.tenantDue.findMany({
      where: { tenancyId: { in: tenancyIds } },
      select: {
        id: true,
        dueType: true,
        customDueType: true,
        title: true,
        description: true,
        month: true,
        year: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        dueDate: true,
        property: { select: { id: true, name: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return dues;
  }

  async collectDue(dto: CollectDueDto, recordedById: number) {
    const due = await this.prisma.tenantDue.findUnique({
      where: { id: dto.dueId },
      include: {
        tenancy: {
          include: {
            tenent: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        },
      },
    });

    if (!due) throw new NotFoundException('Due not found');

    if (due.status === DueStatus.PAID || due.status === DueStatus.WAIVED) {
      throw new BadRequestException(
        `Due is already ${due.status.toLowerCase()}`,
      );
    }

    const balance = Number(due.balanceAmount);
    const collectAmount = Math.ceil(dto.amount);
    if (collectAmount <= 0 || collectAmount > balance) {
      throw new BadRequestException(
        `Amount must be between 1 and ${balance} (remaining balance)`,
      );
    }

    const newPaid = Number(due.paidAmount) + collectAmount;
    const newBalance = balance - collectAmount;
    const newStatus: DueStatus =
      newBalance === 0 ? DueStatus.PAID : DueStatus.PARTIAL;

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.duePayment.create({
        data: {
          dueId: due.id,
          tenancyId: due.tenancyId,
          propertyId: due.propertyId,
          month: due.month,
          year: due.year,
          amount: collectAmount,
          paymentMode: dto.paymentMode,
          upiApp: dto.upiApp ?? null,
          transactionId: dto.transactionId ?? null,
          proofImageUrl: dto.proofImageUrl ?? null,
          notes: dto.notes ?? null,
          paidAt: dto.paidAt,
          recordedById,
        },
      });

      const updatedDue = await tx.tenantDue.update({
        where: { id: due.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          status: newStatus,
        },
      });

      return { payment, due: updatedDue };
    });

    this.eventEmitter.emit(
      'due.payment.collected',
      new DuePaymentCollectedEvent(
        due.id,
        due.tenancyId,
        due.propertyId,
        due.tenancy.tenent.phoneNumber,
        due.tenancy.tenent.fullName,
        collectAmount,
        newBalance,
        due.dueType,
        dto.paymentMode,
        newStatus === DueStatus.PAID,
        due.month,
        due.year,
      ),
    );

    return result;
  }

  async getDueById(dueId: number) {
    const due = await this.prisma.tenantDue.findUnique({
      where: { id: dueId },
      select: {
        id: true,
        dueType: true,
        customDueType: true,
        title: true,
        description: true,
        month: true,
        year: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        status: true,
        periodStart: true,
        periodEnd: true,
        dueDate: true,
        createdAt: true,
        property: {
          select: { id: true, name: true },
        },
        tenancy: {
          select: {
            id: true,
            room: { select: { id: true, roomNumber: true } },
            tenent: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                tenentProfile: { select: { profileImage: true } },
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentMode: true,
            upiApp: true,
            transactionId: true,
            notes: true,
            proofImageUrl: true,
            paidAt: true,
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    });

    if (!due) throw new NotFoundException('Due not found');
    return due;
  }

  async sendBulkReminder(
    propertyId: number,
    dto: BulkReminderDto,
  ): Promise<BulkReminderResult> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { name: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const sendToAll = dto.sendToAll === true;
    const tenantIds = dto.tenantIds ?? [];

    if (!sendToAll && tenantIds.length === 0) {
      throw new BadRequestException('Select at least one tenant to remind');
    }

    const now = new Date();
    const currentHour = now.getHours();
    const date = now.getDate();
    const bulkReminderKey = `bulk-reminder-${propertyId}-${date}`;

    const isLocked = await this.redisService.get(bulkReminderKey);
    if (isLocked) {
      throw new BadRequestException(
        'Bulk reminder is already sent for this property, you can send only once in 24 hours',
      );
    }

    const pgName = property.name;

    const unpaidDues = await this.prisma.tenantDue.findMany({
      where: {
        propertyId,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      select: {
        id: true,
        balanceAmount: true,
        dueDate: true,
        tenancy: {
          select: {
            tenent: {
              select: { id: true, fullName: true, phoneNumber: true },
            },
          },
        },
      },
    });

    const tenantFilter = !sendToAll ? new Set(tenantIds) : null;

    const tenantMap = new Map<
      number,
      { name: string; phone: string; totalAmount: number; dueCount: number }
    >();

    for (const due of unpaidDues) {
      const tenant = due.tenancy?.tenent;
      if (!tenant) continue;
      if (tenantFilter && !tenantFilter.has(tenant.id)) continue;

      const amount = Number(due.balanceAmount);
      const existing = tenantMap.get(tenant.id);
      if (existing) {
        existing.totalAmount += amount;
        existing.dueCount += 1;
      } else {
        tenantMap.set(tenant.id, {
          name: tenant.fullName,
          phone: tenant.phoneNumber,
          totalAmount: amount,
          dueCount: 1,
        });
      }
    }

    const jobs: { name: string; data: any; opts: { jobId: string } }[] = [];
    let skipped = 0;

    Array.from(tenantMap.entries()).forEach(([tenantId, info]) => {
      const cleaned = info.phone?.replace(/\D/g, '').slice(-10) ?? '';
      if (cleaned.length !== 10) {
        skipped++;
        this.logger.warn(
          `Skipping tenant ${tenantId} — invalid phone: ${info.phone}`,
        );
        return;
      }

      jobs.push({
        name: 'send',
        data: {
          type: 'RENT_REMINDER',
          phone: '+91' + cleaned,
          channels: ['whatsapp'],
          data: {
            tenantName: info.name,
            amount: String(Math.round(info.totalAmount)),
            due_date: 'at the earliest',
            payment_link: 'https://pay.pgmaster.in',
            pgname: pgName,
          },
        },
        opts: {
          jobId: `bulk-reminder-${propertyId}-${tenantId}-${Date.now()}`,
        },
      });
    });

    if (jobs.length > 0) {
      await this.queue.bulkEnqueue(QUEUES.NOTIFICATION, jobs);
      this.logger.log(
        `Bulk reminder: queued ${jobs.length} jobs for property ${propertyId}`,
      );

      const hoursLeft = 24 - currentHour;
      await this.redisService.set(
        bulkReminderKey,
        'locked',
        hoursLeft * 60 * 60,
      );
    }

    return {
      message:
        jobs.length > 0
          ? `Reminders queued for ${jobs.length} tenant${jobs.length === 1 ? '' : 's'}`
          : 'No reminders sent — no valid tenants found',
      sent: jobs.length,
      skipped,
    };
  }

  async getPropertyCollections(propertyId: number) {
    const payments = await this.prisma.duePayment.findMany({
      where: { propertyId },
      orderBy: { paidAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentMode: true,
        upiApp: true,
        transactionId: true,
        notes: true,
        proofImageUrl: true,
        paidAt: true,
        month: true,
        year: true,
        due: {
          select: {
            dueType: true,
        customDueType: true,
            title: true,
            totalAmount: true,
            balanceAmount: true,
            status: true,
            tenancy: {
              select: {
                room: { select: { roomNumber: true } },
                tenent: {
                  select: {
                    fullName: true,
                    phoneNumber: true,
                    tenentProfile: { select: { profileImage: true } },
                  },
                },
              },
            },
          },
        },
        recordedBy: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return payments.map((payment) => {
      const tenancy = payment.due?.tenancy;
      const tenent = tenancy?.tenent;
      const room = tenancy?.room;
      const isOnline = payment.paymentMode === 'ONLINE_GATEWAY';

      return {
        id: payment.id,
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        upiApp: payment.upiApp,
        transactionId: payment.transactionId,
        notes: payment.notes,
        proofImageUrl: payment.proofImageUrl,
        paidAt: payment.paidAt,
        month: payment.month,
        year: payment.year,
        due: {
          dueType: payment.due.dueType,
          customDueType: payment.due.customDueType ?? null,
          title: payment.due.title,
          totalAmount: payment.due.totalAmount,
          balanceAmount: payment.due.balanceAmount,
          status: payment.due.status,
        },
        tenant: {
          name: tenent?.fullName ?? 'Former Tenant',
          profileImage: tenent?.tenentProfile?.profileImage ?? null,
          roomNumber: room?.roomNumber ?? '-',
          phoneNumber: tenent?.phoneNumber ?? null,
        },
        collectedBy: isOnline
          ? { type: 'online' as const, name: 'Payment Gateway', role: null }
          : {
              type: 'offline' as const,
              name: payment.recordedBy?.fullName ?? 'Staff',
              role: payment.recordedBy?.role ?? null,
            },
      };
    });
  }
}






