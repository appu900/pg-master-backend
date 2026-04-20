import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { EditTenancyDto } from './dto/update-tenancy.dto';
import { AddTenantDto } from './dto/add.tenant.dto';
import {
  calculateProratedRent,
  formatDate,
  parseDateUTC,
  toDateOnly,
} from 'src/utils/Proration.utils';
import { join } from 'path';
import e from 'express';
import { TenancyEvents, TenantAddedEventPayload } from './tenancy.event';
import { TenantAddedEvent } from 'src/core/events/domain-events';

const BLOCKING_TENANCY_STATUSES = new Set(['ACTIVE', 'NOTICE_PERIOD']);
const MAX_FUTURE_JOINING_DAYS = 90;

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TenancyEvents,
  ) {}

  private resolveUserfromPerFlight(
    dto: AddTenantDto,
    existingByPhone: {
      id: number;
      role: string;
      fullName: string;
      isBlockedByAdmin: boolean;
      tenancy: {
        id: number;
        tenancyStatus: string;
        joinedAt: Date;
        property: { name: string };
        room: { roomNumber: string };
      } | null;
    } | null,
    emailConflict: { id: number } | null,
  ): { existingUserId: number | null; isNewUser: boolean } {
    if (!existingByPhone) {
      if (emailConflict) {
        throw new ConflictException(
          `Email is ${dto.email} is already registered with other account`,
        );
      }
      return { existingUserId: null, isNewUser: true };
    }
    // check if boocked by admin
    if (existingByPhone.isBlockedByAdmin) {
      throw new ForbiddenException(
        `User with phone ${dto.phoneNumber} has been blocked by admin`,
      );
    }

    // check wrong user role
    if (existingByPhone.role !== UserRole.TENANT) {
      throw new ForbiddenException('this is user can not added as tenant');
    }

    // blocking tenancy
    const t = existingByPhone.tenancy;
    if (t && BLOCKING_TENANCY_STATUSES.has(t.tenancyStatus)) {
      throw new ConflictException({
        message:
          `${existingByPhone.fullName} has a ` +
          `${t.tenancyStatus} tenancy, we can not add it`,
      });
    }
    // safe to b reuse this
    return {
      existingUserId: existingByPhone.id,
      isNewUser: false,
    };
  }

  private async runPreFlightChecks(
    dto: AddTenantDto,
    requestingOwnerId: number,
  ) {
    const [existingByPhone, emailConflict, propertyRoom] = await Promise.all([
      // look by phone - fetch tenancy details for conflict messages
      this.prisma.user.findFirst({
        where: { phoneNumber: dto.phoneNumber, deletedAt: null },
        select: {
          id: true,
          role: true,
          fullName: true,
          isBlockedByAdmin: true,
          tenancy: {
            select: {
              id: true,
              tenancyStatus: true,
              joinedAt: true,
              property: { select: { name: true } },
              room: { select: { roomNumber: true } },
            },
          },
        },
      }),

      // Q2. Email conflict check
      dto.email
        ? this.prisma.user.findFirst({
            where: { email: dto.email, deletedAt: null },
            select: { id: true },
          })
        : Promise.resolve(null),

      // t3 property and room checking
      this.prisma.room.findFirst({
        where: {
          id: dto.roomId,
          propertyId: dto.propertyId,
          property: { ownerId: requestingOwnerId },
        },
        select: {
          id: true,
          roomNumber: true,
          totalBeds: true,
          occupiedBeds: true,
          property: { select: { ownerId: true, name: true } },
        },
      }),
    ]);
    if (!propertyRoom) {
      await this.diagnosePropertyRoomFailuer(
        dto.propertyId,
        dto.roomId,
        requestingOwnerId,
      );
    }

    if (propertyRoom!.occupiedBeds >= propertyRoom!.totalBeds) {
      throw new ConflictException(
        `Room ${propertyRoom!.roomNumber} is at full capacity ` +
          `(${propertyRoom!.occupiedBeds}/${propertyRoom!.totalBeds} beds)`,
      );
    }

    // validate user
    const { existingUserId, isNewUser } = this.resolveUserfromPerFlight(
      dto,
      existingByPhone,
      emailConflict,
    );

    return {
      existingUserId,
      isNewUser,
      roomNumber: propertyRoom!.roomNumber,
      totalBeds: propertyRoom!.totalBeds,
      occupiedBeds: propertyRoom!.occupiedBeds,
    };
  }

  private async diagnosePropertyRoomFailuer(
    propertyId: number,
    roomId: number,
    requestingOwnerId: number,
  ) {
    const property = await this.prisma.property.findUnique({
      where: {
        id: propertyId,
      },
      select: { id: true, ownerId: true, name: true },
    });
    if (!property) {
      throw new BadRequestException(`property not found`);
    }
    if (property.ownerId !== requestingOwnerId) {
      throw new ForbiddenException(
        `You do not have permission to add tenants to property "${property.name}"`,
      );
    }

    const room = await this.prisma.room.findUnique({
      where: {
        id: propertyId,
      },
      select: {
        id: true,
        propertyId: true,
        roomNumber: true,
      },
    });
    if (!room) {
      throw new BadRequestException(`Room not found`);
    }

    if (room.propertyId !== propertyId) {
      throw new BadRequestException(
        `Room does not belong to the given property`,
      );
    }

    throw new InternalServerErrorException(
      'Unexpected property-room validation failure',
    );
  }

  private async runTransaction(ctx: {
    dto: AddTenantDto;
    joinDate: Date;
    periodStart: Date;
    currentYear: number;
    periodEnd: Date;
    proratedAmount: number;
    nextBillingDate: Date;
    existingUserId: number | null;
    isNewUser: boolean;
    billingMonthNumber: number;
    dueBillingDate: Date;
  }) {
    const {
      dto,
      joinDate,
      periodStart,
      periodEnd,
      proratedAmount,
      nextBillingDate,
      existingUserId,
      isNewUser,
      billingMonthNumber,
      dueBillingDate,
      currentYear,
    } = ctx;
    return this.prisma.$transaction(
      async (tx) => {
        const lockedRooms = await tx.$queryRaw<
          {
            id: number;
            totalBeds: number;
            occupiedBeds: number;
            roomNumber: string;
          }[]
        >`
  SELECT 
    id,
    "totalBeds",
    "occupiedBeds",
    "roomNumber"
  FROM "Room"
  WHERE id = ${dto.roomId}
  FOR UPDATE
`;

        const lockedRoom = lockedRooms[0];
        if (!lockedRoom) {
          throw new BadRequestException(`Room ${dto.roomId} not found`);
        }
        if (lockedRoom.occupiedBeds >= lockedRoom.totalBeds) {
          throw new ConflictException(
            `Room ${lockedRoom.roomNumber} is full ` +
              `(${lockedRoom.occupiedBeds}/${lockedRoom.totalBeds} beds occupied)`,
          );
        }
        // ** create or update user
        let resolvedUserId: number;
        if (isNewUser) {
          const newUser = await tx.user.create({
            data: {
              fullName: dto.fullName,
              phoneNumber: dto.phoneNumber,
              email: dto.email ?? null,
              role: UserRole.TENANT,
              isActive: true,
            },
            select: { id: true },
          });
          resolvedUserId = newUser.id;
        } else {
          resolvedUserId = existingUserId!;
          await tx.user.update({
            where: { id: resolvedUserId },
            data: {
              fullName: dto.fullName,
              isActive: true,
              email: dto.email ?? null,
            },
          });
        }

        // upsert Tenant profile
        const profilePayload = {
          geneder: dto.gender!,
          profession: dto.profession ?? null,
          pinCode: dto.pinCode ?? '',
          state: dto.state ?? null,
          Address: dto.address ?? null,
          RentalType: dto.rentalType ?? null,
          lockInPeriodsInMonths: dto.lockInPeriodInMonths ?? 0,
          noticePeriodInDays: dto.noticePeriodInDays ?? 0,
          agreementPeriodinMonths: dto.agreementPeriodInMonths ?? 0,
          JoiningDate: joinDate,
          moveOutDate: dto.moveOutDate ? parseDateUTC(dto.moveOutDate) : null,
        };
        await tx.tenentProfile.upsert({
          where: { userId: resolvedUserId },
          create: { userId: resolvedUserId, ...profilePayload },
          update: profilePayload,
        });

        // ** create tenancy
        const tenancy = await tx.tenancy.create({
          data: {
            tenentId: resolvedUserId,
            propertyId: dto.propertyId,
            roomId: dto.roomId,
            rentAmount: dto.rentAmount,
            securityDeposit: dto.securityDeposit,
            billingCycleDay: dto.rentCycleDay,
            joinedAt: joinDate,
            tenancyStatus: 'ACTIVE',
            lockInPeriodsInMonths: dto.lockInPeriodInMonths,
            noticePeriodInDays: dto.noticePeriodInDays,
            initialElectricityReading: dto.electricityReading,
            nextBillingDate,
          },
          select: { id: true },
        });

        // ** due creation
        const dueResults = await Promise.all([
          tx.tenantDue.create({
            data: {
              tenancyId: tenancy.id,
              propertyId: dto.propertyId,
              dueType: 'RENT',
              title: `Rent ${formatDate(periodStart)} – ${formatDate(periodEnd)}`,
              description: 'prorated rent for first billing month',
              totalAmount: proratedAmount,
              balanceAmount: proratedAmount,
              paidAmount: 0,
              status: 'UNPAID',
              periodStart,
              periodEnd,
              month: billingMonthNumber,
              dueDate: dueBillingDate,
              year: currentYear,
            },
            select: { id: true },
          }),

          dto.securityDeposit > 0
            ? tx.tenantDue.create({
                data: {
                  tenancyId: tenancy.id,
                  propertyId: dto.propertyId,
                  dueType: 'SECURITY_DEPOSIT',
                  title: 'Security Deposite',
                  description: 'Refundable security deposity',
                  totalAmount: dto.securityDeposit,
                  balanceAmount: dto.securityDeposit,
                  paidAmount: 0,
                  status: 'UNPAID',
                  dueDate: joinDate,
                  year: currentYear,
                  month: billingMonthNumber,
                },
                select: { id: true },
              })
            : Promise.resolve(null),
        ]);
        const [rentDue, depositDue] = dueResults;

        // ** increment occupied beds
        await tx.room.update({
          where: { id: dto.roomId },
          data: { occupiedBeds: { increment: 1 } },
        });

        return {
          resolvedUserId,
          tenancyId: tenancy.id,
          rentDueId: rentDue.id,
          depositDueId: depositDue?.id ?? null,
        };
      },
      { isolationLevel: 'ReadCommitted', timeout: 10_000 },
    );
  }

  private handleTransactionError(err: unknown, dto: AddTenantDto): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      switch (err.code) {
        case 'P2002': {
          const fields = (err.meta?.target as string[]) ?? [];
          if (fields.includes('email')) {
            throw new ConflictException(
              `Email "${dto.email}" is already registered with another account`,
            );
          }
          if (fields.includes('phoneNumber')) {
            throw new ConflictException(
              `Phone ${dto.phoneNumber} is already registered`,
            );
          }
          if (fields.includes('tenentId')) {
            throw new ConflictException(
              `A tenancy already exists for this tenant`,
            );
          }
          throw new ConflictException(
            `Duplicate record detected (fields: ${fields.join(', ')})`,
          );
        }
        case 'P2003':
          throw new BadRequestException(
            `Invalid reference — check propertyId and roomId`,
          );
        case 'P2034':
          // Serialization failure error bro
          throw new ConflictException(
            `Request conflicted with a concurrent operation. Please retry.`,
          );
        default:
          this.logger.error(
            `Unhandled prisma error ${err.code}: ${err.message}`,
          );
          throw new InternalServerErrorException(
            'An unexpected database error occurred',
          );
      }
    }
    if (
      err instanceof BadRequestException ||
      err instanceof ConflictException ||
      err instanceof ForbiddenException
    ) {
      throw err;
    }
    this.logger.error('Unexpected error during tenant onboarding', err);
    throw new InternalServerErrorException(
      'An unexpected error occurred. Please try again.',
    );
  }

  async createTenant(dto: AddTenantDto, requestingOwnerId: number) {
    const joinDate = toDateOnly(new Date(dto.joiningDate));
    const preflight = await this.runPreFlightChecks(dto, requestingOwnerId);
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      select: { name: true, id: true },
    });
    if (!property) {
      throw new BadRequestException(
        `property not found with id ${dto.propertyId}`,
      );
    }
    const { periodStart, periodEnd, proratedAmount } = calculateProratedRent(
      joinDate,
      dto.rentCycleDay,
      dto.rentAmount,
    );
    const nextBillingDate = periodEnd;
    this.logger.log(
      `Onboarding ${preflight.isNewUser ? 'NEW' : 'EXISTING'} tenant | ` +
        `phone=${dto.phoneNumber} property=${dto.propertyId} room=${dto.roomId} | ` +
        `period=${formatDate(periodStart)}→${formatDate(periodEnd)} | ` +
        `prorated=₹${proratedAmount} deposit=₹${dto.securityDeposit}`,
    );
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNumber = now.getMonth() + 1;
    const txResult = await this.runTransaction({
      dto,
      joinDate,
      periodStart,
      currentYear,
      periodEnd,
      proratedAmount,
      nextBillingDate,
      existingUserId: preflight.existingUserId,
      isNewUser: preflight.isNewUser,
      billingMonthNumber: currentMonthNumber,
      dueBillingDate: periodEnd,
    }).catch((err) => this.handleTransactionError(err, dto));
    this.logger.log(
      `Tenant onboarded | userId=${txResult.resolvedUserId} ` +
        `tenancyId=${txResult.tenancyId} ` +
        `rentDueId=${txResult.rentDueId} ` +
        `depositDueId=${txResult.depositDueId ?? 'none'}`,
    );

    // publish the event after successful transaction commit
    const tenantCreateEventPayload: TenantAddedEventPayload = {
      tenancyId: txResult.tenancyId,
      tenantId: txResult.resolvedUserId,
      propertyId: dto.propertyId,
      ownerId: requestingOwnerId,
      roomId: dto.roomId,
      rentAmount: dto.rentAmount,
      securityDepositeAmount: dto.securityDeposit,
      tenantPhone:dto.phoneNumber,
      tenantName: dto.fullName,
      propertyName: property.name,
      roomNumber: preflight.roomNumber,
      billingCycleDay: dto.rentCycleDay,
      dueDate: formatDate(periodEnd),
    };
    this.events.emitTenancyCreated(tenantCreateEventPayload);
    return {
      tenantUserId: txResult.resolvedUserId,
      tenancyId: txResult.tenancyId,
      rentDueId: txResult.rentDueId,
      securityDepositDueId: txResult.depositDueId,
      proratedRentAmount: proratedAmount,
      securityDepositAmount: dto.securityDeposit,
      rentPeriodStart: formatDate(periodStart),
      rentPeriodEnd: formatDate(periodEnd),
      nextBillingDate: formatDate(nextBillingDate),
      isNewUser: preflight.isNewUser,
    };
  }

  async updateTenancyDetails(
    tenantId: number,
    propertyId: number,
    dto: EditTenancyDto,
  ) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        tenancyStatus: 'ACTIVE',
        deletedAt: null,
        tenentId: tenantId,
        propertyId,
      },
    });

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found');
    }

    const tenancyUpdate: Prisma.TenancyUpdateInput = {};
    const tenantProfileUpdate: Prisma.TenentProfileUpdateInput = {};

    if (dto.agreementPeriod !== undefined)
      tenantProfileUpdate.agreementPeriodinMonths = dto.agreementPeriod;

    if (dto.moveoutDate !== undefined)
      tenantProfileUpdate.moveOutDate = new Date(dto.moveoutDate);

    if (dto.rentalType !== undefined)
      tenantProfileUpdate.RentalType = dto.rentalType;

    if (dto.lockInPeriodInMonths !== undefined)
      tenancyUpdate.lockInPeriodsInMonths = dto.lockInPeriodInMonths;

    if (dto.noticePeriodInDays !== undefined)
      tenancyUpdate.noticePeriodInDays = dto.noticePeriodInDays;

    if (dto.rentAmount !== undefined) tenancyUpdate.rentAmount = dto.rentAmount;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(tenancyUpdate).length) {
        await tx.tenancy.update({
          where: { id: tenancy.id },
          data: tenancyUpdate,
        });
      }

      if (Object.keys(tenantProfileUpdate).length) {
        await tx.tenentProfile.update({
          where: { userId: tenantId },
          data: tenantProfileUpdate,
        });
      }
    });

    return { success: true };
  }

  private validateDates(dto: AddTenantDto, joinDate: Date): void {
    if (isNaN(joinDate.getTime())) {
      throw new BadRequestException('joiningdate is not a valid date');
    }

    if (dto.moveOutDate) {
      const moveOut = new Date(dto.moveOutDate);
      if (isNaN(moveOut.getTime())) {
        throw new BadRequestException('moveout date is not a valid date');
      }
      if (moveOut <= joinDate) {
        throw new BadRequestException('moveout must be after joining date');
      }
    }

    if (
      dto.lockInPeriodInMonths &&
      dto.agreementPeriodInMonths &&
      dto.lockInPeriodInMonths > dto.agreementPeriodInMonths
    ) {
      throw new BadRequestException(
        'LockInPeriodMonths cannot exceed agreementPeriod In months',
      );
    }
  }

  async PublishTenantOnboardingEvents(
    dto: AddTenantDto,
    propertyName: string,
  ): Promise<void> {
    const payload = {
      to: dto.phoneNumber,
      templateKey: 'TENANT_WELCOME',
      templateData: {
        tenantName: dto.fullName,
        propertyName: propertyName,
        appLink:
          'https://play.google.com/store/apps/details?id=com.pocketpg.app',
        pg_name: propertyName,
      },
      isReminder: false,
      externalId: '',
    };
    console.log('Event published successfully');
  }
}
