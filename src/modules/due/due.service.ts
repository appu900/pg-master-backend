import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
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

@Injectable()
export class DueService {
  private readonly logger = new Logger(DueService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addDueToTenant(dto: CreateDueForTenantDto, propertyId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        propertyId: propertyId,
        tenentId: dto.tenantId,
        tenancyStatus: TenancyStatus.ACTIVE,
        deletedAt: null,
      },
    });
    if (!tenancy) {
      throw new BadRequestException('Invalid tenant');
    }
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const year = now.getFullYear();
    const dueDate = dto.DuesToDate;
    const due = await this.prisma.tenantDue.create({
      data: {
        tenancyId: tenancy.id,
        propertyId: tenancy.propertyId,
        dueType: dto.dueType,
        title: `${dto.dueType} for ${dto.tenantId} for the month ${currentMonth} and year ${year}`,
        description: `${dto.dueType} generated for tenant with id ${dto.tenantId} for the month ${currentMonth} and year ${year}`,
        month: currentMonth,
        year: year,
        totalAmount: dto.amount,
        balanceAmount: dto.amount,
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
        dto.amount,
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
        tenancyStatus: TenancyStatus.ACTIVE,
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
      throw new BadRequestException('No active tenancy found for the room');
    const totaltenents = tenencies.length;

    const individualAmounts = dto.totalAmount / totaltenents;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const year = now.getFullYear();
    const dueDate = dto.DuesToDate;
    const txResult = await this.prisma.$transaction(async (tx) => {
      const dues = await Promise.all(
        tenencies.map((tenancy) =>
          tx.tenantDue.create({
            data: {
              tenancyId: tenancy.id,
              propertyId: tenancy.propertyId,
              dueType: dto.dueType,
              title: `${dto.dueType} for ${tenancy.tenentId} for the month ${currentMonth} and year ${year}`,
              description: `${dto.dueType} generated for tenant with id ${tenancy.tenentId} for the month ${currentMonth} and year ${year}`,
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
        tenancyStatus: 'ACTIVE',
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
        tenancyStatus: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!dues) {
      throw new InternalServerErrorException(
        'No active tenancy found for tenant',
      );
    }
    const tenantDues = await this.prisma.tenantDue.findMany({
      where: {
        tenancyId: dues.id,
      },
      select: {
        id: true,
        dueType: true,
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
        tenancyStatus: 'ACTIVE',
        deletedAt: null,
      },
    });
    if (!tenancy) {
      throw new BadRequestException('No active tenancy found for tenant');
    }
    const dues = await this.prisma.tenantDue.findMany({
      where: {
        tenancyId: tenancy.id,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      select: {
        id: true,
        dueType: true,
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
    if (dto.amount <= 0 || dto.amount > balance) {
      throw new BadRequestException(
        `Amount must be between 1 and ${balance} (remaining balance)`,
      );
    }

    const newPaid = Number(due.paidAmount) + dto.amount;
    const newBalance = balance - dto.amount;
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
          amount: dto.amount,
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
        dto.amount,
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
      const tenancy = payment.due.tenancy;
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
          title: payment.due.title,
          totalAmount: payment.due.totalAmount,
          balanceAmount: payment.due.balanceAmount,
          status: payment.due.status,
        },
        tenant: {
          name: tenancy.tenent.fullName,
          profileImage: tenancy.tenent.tenentProfile?.profileImage ?? null,
          roomNumber: tenancy.room.roomNumber,
        },
        collectedBy: isOnline
          ? { type: 'online' as const, name: 'Payment Gateway', role: null }
          : {
              type: 'offline' as const,
              name: payment.recordedBy.fullName,
              role: payment.recordedBy.role,
            },
      };
    });
  }
}
