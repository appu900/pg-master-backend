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
import { MoveInstatus, Prisma, TenancyStatus, UserRole } from '@prisma/client';
import { RejectMoveOutDto } from './dto/reject-moveout.dto';
import { RejectRoomShiftDto } from './dto/reject-room-shift.dto';
import { EditTenancyDto } from './dto/update-tenancy.dto';
import { AddTenantDto } from './dto/add.tenant.dto';
import { ShiftRoomDto } from './dto/shift-room.dto';
import { MoveOutTenantDto } from './dto/move-out-tenant.dto';
import {
  calculateProratedRent,
  formatDate,
  parseDateUTC,
  toDateOnly,
  toLocalDateOnly,
} from 'src/utils/Proration.utils';
import { TenancyEvents, TenantAddedEventPayload } from './tenancy.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DueCreatedEvent } from 'src/core/events/domain-events';
import {
  normalizePhoneNumber,
  phoneSearchVariants,
} from 'src/utils/phone.utils';

const BLOCKING_TENANCY_STATUSES = new Set([
  'ACTIVE',
  'NOTICE_PERIOD',
  'PENDING',
]);
const MAX_FUTURE_JOINING_DAYS = 90;

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: TenancyEvents,
    private readonly eventEmitter: EventEmitter2,
  ) {}


  private parseAndValidateMoveOutDate(
    moveOutDateStr: string,
    joinDate: Date,
  ): Date {
    const normalized = moveOutDateStr.split('T')[0];
    let moveOut: Date;
    try {
      moveOut = parseDateUTC(normalized);
    } catch {
      throw new BadRequestException('moveOutDate is not a valid date');
    }

    const today = toLocalDateOnly(new Date());
    if (moveOut < today) {
      throw new BadRequestException('Move-out date cannot be in the past');
    }

    const join = toDateOnly(joinDate);
    if (moveOut <= join) {
      throw new BadRequestException(
        'Move-out date must be after the tenant joining date',
      );
    }

    return moveOut;
  }

  private resolveUserfromPerFlight(
    dto: AddTenantDto,
    existingByPhone: {
      id: number;
      role: string;
      fullName: string;
      isActive: boolean;
      isBlockedByAdmin: boolean;
      tenancy: {
        id: number;
        tenancyStatus: string;
        joinedAt: Date;
        room: { roomNumber: string };
      }[];
    } | null,
    emailConflict: { id: number } | null,
  ): { existingUserId: number | null; isNewUser: boolean } {
    if (!existingByPhone) {
      if (emailConflict) {
        throw new ConflictException(
          `Email ${dto.email} is already registered with another account`,
        );
      }
      return { existingUserId: null, isNewUser: true };
    }

    if (existingByPhone.isBlockedByAdmin) {
      throw new ForbiddenException(
        `User with phone ${dto.phoneNumber} has been blocked by admin`,
      );
    }

    if (existingByPhone.role !== UserRole.TENANT) {
      throw new ForbiddenException('This user cannot be added as a tenant');
    }

    const blockingTenancy = existingByPhone.tenancy.find((t) =>
      BLOCKING_TENANCY_STATUSES.has(t.tenancyStatus),
    );
    if (blockingTenancy) {
      throw new ConflictException(
        `${existingByPhone.fullName} already has a ${blockingTenancy.tenancyStatus} tenancy in this property (room ${blockingTenancy.room.roomNumber})`,
      );
    }

    return { existingUserId: existingByPhone.id, isNewUser: false };
  }

  private async runPreFlightChecks(
    dto: AddTenantDto,
    requestingOwnerId: number,
  ) {
    const [existingByPhone, emailConflict, propertyRoom] = await Promise.all([
      // look by phone - fetch tenancy details for conflict messages
      this.prisma.user.findFirst({
        where: {
          phoneNumber: { in: phoneSearchVariants(dto.phoneNumber) },
          deletedAt: null,
        },
        select: {
          id: true,
          role: true,
          fullName: true,
          isBlockedByAdmin: true,
          isActive: true,
          tenancy: {
            where: {
              propertyId: dto.propertyId,
              tenancyStatus: { in: ['ACTIVE', 'NOTICE_PERIOD'] },
            },
            select: {
              id: true,
              tenancyStatus: true,
              joinedAt: true,
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
        id: roomId,
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

        const todayLocal = toLocalDateOnly(new Date());
        const isFutureJoin = joinDate.getTime() > todayLocal.getTime();

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
            tenancyStatus: isFutureJoin
              ? TenancyStatus.PENDING
              : TenancyStatus.ACTIVE,
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

        // ** create move-in tracker for future-dated (PENDING) tenancies
        if (isFutureJoin) {
          const now = new Date();
          await tx.tenantMoveInTracker.create({
            data: {
              propertyId: dto.propertyId,
              tenancyId: tenancy.id,
              month: joinDate.getMonth() + 1,
              year: joinDate.getFullYear(),
              moveInDate: joinDate,
              status: MoveInstatus.WAITING,
            },
          });
        }

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
    dto.phoneNumber = normalizePhoneNumber(dto.phoneNumber);
    const joinDate = toDateOnly(new Date(dto.joiningDate));
    this.validateDates(dto, joinDate);
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
    const { periodStart, periodEnd, proratedAmount: rawProrated } = calculateProratedRent(
      joinDate,
      dto.rentCycleDay,
      dto.rentAmount,
    );
    const proratedAmount = Math.ceil(rawProrated);
    dto.rentAmount = Math.ceil(Number(dto.rentAmount));
    dto.securityDeposit = Math.ceil(Number(dto.securityDeposit));
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
      tenantPhone: dto.phoneNumber,
      tenantName: dto.fullName,
      propertyName: property.name,
      roomNumber: preflight.roomNumber,
      billingCycleDay: dto.rentCycleDay,
      dueDate: formatDate(periodEnd),
    };
    this.events.emitTenancyCreated(tenantCreateEventPayload);

    this.eventEmitter.emit(
      'due.created',
      new DueCreatedEvent(
        txResult.rentDueId,
        txResult.tenancyId,
        dto.propertyId,
        'RENT',
        proratedAmount,
        currentMonthNumber,
        currentYear,
      ),
    );

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
    tenancyId: number,
    ownerId: number,
    dto: EditTenancyDto,
  ) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        tenancyStatus: {
          in: [TenancyStatus.ACTIVE, TenancyStatus.NOTICE_PERIOD],
        },
        deletedAt: null,
        property: { ownerId },
      },
      select: { id: true, tenentId: true, joinedAt: true, tenancyStatus: true },
    });

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found');
    }

    const tenancyUpdate: Prisma.TenancyUpdateInput = {};
    const tenantProfileUpdate: Prisma.TenentProfileUpdateInput = {};

    if (dto.agreementPeriod !== undefined)
      tenantProfileUpdate.agreementPeriodinMonths = dto.agreementPeriod;

    if (dto.moveoutDate !== undefined) {
      if (dto.moveoutDate) {
        tenantProfileUpdate.moveOutDate = this.parseAndValidateMoveOutDate(
          dto.moveoutDate,
          tenancy.joinedAt,
        );
        tenancyUpdate.tenancyStatus = TenancyStatus.NOTICE_PERIOD;
      } else {
        tenantProfileUpdate.moveOutDate = null;
        tenancyUpdate.tenancyStatus = TenancyStatus.ACTIVE;
      }
    }

    if (dto.rentalType !== undefined)
      tenantProfileUpdate.RentalType = dto.rentalType;

    if (dto.lockInPeriodInMonths !== undefined)
      tenancyUpdate.lockInPeriodsInMonths = dto.lockInPeriodInMonths;

    if (dto.noticePeriodInDays !== undefined) {
      tenancyUpdate.noticePeriodInDays = dto.noticePeriodInDays;
      tenantProfileUpdate.noticePeriodInDays = dto.noticePeriodInDays;
    }

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
          where: { userId: tenancy.tenentId },
          data: tenantProfileUpdate,
        });
      }
    });

    return { success: true };
  }

  private validateDates(dto: AddTenantDto, joinDate: Date): void {
    if (isNaN(joinDate.getTime())) {
      throw new BadRequestException('joiningDate is not a valid date');
    }

    const today = toLocalDateOnly(new Date());
    const maxFuture = new Date(today);
    maxFuture.setUTCDate(maxFuture.getUTCDate() + MAX_FUTURE_JOINING_DAYS);
    if (joinDate > maxFuture) {
      throw new BadRequestException(
        `Joining date cannot be more than ${MAX_FUTURE_JOINING_DAYS} days in the future`,
      );
    }

    if (dto.moveOutDate) {
      const moveOut = parseDateUTC(
        String(dto.moveOutDate).split('T')[0],
      );
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

  async shiftTenantRoom(dto: ShiftRoomDto, requestingOwnerId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        id: dto.tenancyId,
        tenancyStatus: {
          in: [TenancyStatus.ACTIVE, TenancyStatus.NOTICE_PERIOD],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        roomId: true,
        propertyId: true,
        property: { select: { ownerId: true, name: true } },
        room: { select: { roomNumber: true } },
      },
    });

    if (!tenancy)
      throw new NotFoundException(
        'No active or notice-period tenancy found for this tenancy ID',
      );

    if (tenancy.property.ownerId !== requestingOwnerId) {
      throw new ForbiddenException(
        "You do not own this tenant's current property",
      );
    }

    const newPropertyId = dto.newPropertyId ?? tenancy.propertyId;
    const isCrossProperty = newPropertyId !== tenancy.propertyId;

    if (dto.newRoomId === tenancy.roomId && !isCrossProperty) {
      throw new BadRequestException('Tenant is already assigned to this room');
    }

    // Validate destination room belongs to owner
    const destRoom = await this.prisma.room.findFirst({
      where: {
        id: dto.newRoomId,
        propertyId: newPropertyId,
        property: { ownerId: requestingOwnerId },
      },
      select: {
        id: true,
        roomNumber: true,
        totalBeds: true,
        occupiedBeds: true,
      },
    });

    if (!destRoom) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.newRoomId },
        select: { id: true, propertyId: true },
      });
      if (!room) throw new NotFoundException(`Room ${dto.newRoomId} not found`);
      if (room.propertyId !== newPropertyId)
        throw new BadRequestException(
          `Room ${dto.newRoomId} does not belong to property ${newPropertyId}`,
        );
      throw new ForbiddenException('You do not own the destination property');
    }

    if (destRoom.occupiedBeds >= destRoom.totalBeds) {
      throw new ConflictException(
        `Room ${destRoom.roomNumber} is full (${destRoom.occupiedBeds}/${destRoom.totalBeds} beds occupied)`,
      );
    }

    // Fetch new property ownerId once before the transaction (needed for metrics upsert)
    let newOwnerId = requestingOwnerId;
    if (isCrossProperty) {
      const newProp = await this.prisma.property.findUnique({
        where: { id: newPropertyId },
        select: { ownerId: true },
      });
      if (!newProp)
        throw new NotFoundException(`Property ${newPropertyId} not found`);
      newOwnerId = newProp.ownerId;
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Lock both rooms to prevent concurrent bed-count races
        const [oldRoomRows, newRoomRows] = await Promise.all([
          tx.$queryRaw<
            {
              id: number;
              occupiedBeds: number;
              totalBeds: number;
              roomNumber: string;
            }[]
          >`
            SELECT id, "occupiedBeds", "totalBeds", "roomNumber" FROM "Room" WHERE id = ${tenancy.roomId} FOR UPDATE
          `,
          tx.$queryRaw<
            {
              id: number;
              occupiedBeds: number;
              totalBeds: number;
              roomNumber: string;
            }[]
          >`
            SELECT id, "occupiedBeds", "totalBeds", "roomNumber" FROM "Room" WHERE id = ${dto.newRoomId} FOR UPDATE
          `,
        ]);

        const oldRoom = oldRoomRows[0];
        const newRoom = newRoomRows[0];
        if (!oldRoom || !newRoom) throw new NotFoundException('Room not found');

        if (newRoom.occupiedBeds >= newRoom.totalBeds) {
          throw new ConflictException(
            `Room ${newRoom.roomNumber} is full (${newRoom.occupiedBeds}/${newRoom.totalBeds} beds)`,
          );
        }

        // Fetch all open dues for this tenancy
        const pendingDues = await tx.tenantDue.findMany({
          where: {
            tenancyId: tenancy.id,
            status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
          },
          select: {
            id: true,
            month: true,
            year: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
          },
        });

        // Update tenancy: new room (and property if cross-property shift)
        await tx.tenancy.update({
          where: { id: tenancy.id },
          data: {
            roomId: dto.newRoomId,
            ...(isCrossProperty && { propertyId: newPropertyId }),
          },
        });

        // Adjust room bed counts
        await Promise.all([
          tx.room.update({
            where: { id: tenancy.roomId },
            data: { occupiedBeds: { decrement: 1 } },
          }),
          tx.room.update({
            where: { id: dto.newRoomId },
            data: { occupiedBeds: { increment: 1 } },
          }),
        ]);

        if (isCrossProperty) {
          // Re-assign all open dues to the new property
          if (pendingDues.length > 0) {
            await tx.tenantDue.updateMany({
              where: {
                tenancyId: tenancy.id,
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
              },
              data: { propertyId: newPropertyId },
            });
          }

          // Group open dues by (month, year) for metrics adjustment
          const buckets = new Map<
            string,
            { totalAmount: number; paidAmount: number; balanceAmount: number }
          >();
          for (const due of pendingDues) {
            const key = `${due.month}:${due.year}`;
            const b = buckets.get(key) ?? {
              totalAmount: 0,
              paidAmount: 0,
              balanceAmount: 0,
            };
            b.totalAmount += Number(due.totalAmount);
            b.paidAmount += Number(due.paidAmount);
            b.balanceAmount += Number(due.balanceAmount);
            buckets.set(key, b);
          }

          for (const [key, amounts] of Array.from(buckets.entries())) {
            const [m, y] = key.split(':').map(Number);

            // Subtract from old property metrics
            await tx.propertyMetrics.updateMany({
              where: { propertyId: tenancy.propertyId, month: m, year: y },
              data: {
                totalDuesGenerated: { decrement: amounts.totalAmount },
                totalDuesPaid: { decrement: amounts.paidAmount },
                totalDuesUnpaid: { decrement: amounts.balanceAmount },
              },
            });

            // Add to new property metrics (upsert so it's created if missing)
            await tx.propertyMetrics.upsert({
              where: {
                propertyId_month_year: {
                  propertyId: newPropertyId,
                  month: m,
                  year: y,
                },
              },
              create: {
                propertyId: newPropertyId,
                ownerId: newOwnerId,
                month: m,
                year: y,
                totalDuesGenerated: amounts.totalAmount,
                totalDuesPaid: amounts.paidAmount,
                totalDuesUnpaid: amounts.balanceAmount,
              },
              update: {
                totalDuesGenerated: { increment: amounts.totalAmount },
                totalDuesPaid: { increment: amounts.paidAmount },
                totalDuesUnpaid: { increment: amounts.balanceAmount },
              },
            });
          }

          // Adjust activeTenants + occupiedBeds on current-month metrics
          const now = new Date();
          const curMonth = now.getMonth() + 1;
          const curYear = now.getFullYear();

          await tx.propertyMetrics.updateMany({
            where: {
              propertyId: tenancy.propertyId,
              month: curMonth,
              year: curYear,
            },
            data: {
              activeTenants: { decrement: 1 },
              occupiedBeds: { decrement: 1 },
            },
          });

          await tx.propertyMetrics.upsert({
            where: {
              propertyId_month_year: {
                propertyId: newPropertyId,
                month: curMonth,
                year: curYear,
              },
            },
            create: {
              propertyId: newPropertyId,
              ownerId: newOwnerId,
              month: curMonth,
              year: curYear,
              activeTenants: 1,
              occupiedBeds: 1,
            },
            update: {
              activeTenants: { increment: 1 },
              occupiedBeds: { increment: 1 },
            },
          });
        }

        const totalPendingBalance = pendingDues.reduce(
          (s, d) => s + Number(d.balanceAmount),
          0,
        );

        return {
          message: 'Tenant shifted successfully',
          tenancyId: tenancy.id,
          fromRoom: oldRoom.roomNumber,
          toRoom: newRoom.roomNumber,
          fromPropertyId: tenancy.propertyId,
          toPropertyId: newPropertyId,
          isCrossProperty,
          pendingDuesTransferred: isCrossProperty ? pendingDues.length : 0,
          totalPendingBalanceTransferred: isCrossProperty
            ? totalPendingBalance
            : 0,
        };
      },
      { isolationLevel: 'ReadCommitted', timeout: 15_000 },
    );
  }




  

  async putOnNoticePeriod(
    tenancyId: number,
    ownerUserId: number,
    dto: MoveOutTenantDto,
  ) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        tenancyStatus: {
          in: [TenancyStatus.ACTIVE, TenancyStatus.NOTICE_PERIOD],
        },
        deletedAt: null,
        property: { ownerId: ownerUserId },
      },
      select: {
        id: true,
        tenentId: true,
        joinedAt: true,
        tenancyStatus: true,
        tenent: {
          select: { tenentProfile: { select: { id: true } } },
        },
      },
    });

    if (!tenancy) {
      throw new NotFoundException(
        'Active tenancy not found or access denied',
      );
    }

    if (!tenancy.tenent.tenentProfile) {
      throw new BadRequestException(
        'Tenant profile is incomplete — update tenant profile before scheduling move-out',
      );
    }

    const moveOut = this.parseAndValidateMoveOutDate(
      dto.moveOutDate,
      tenancy.joinedAt,
    );

    await this.prisma.$transaction(async (tx) => {
      if (tenancy.tenancyStatus === TenancyStatus.ACTIVE) {
        await tx.tenancy.update({
          where: { id: tenancyId },
          data: { tenancyStatus: TenancyStatus.NOTICE_PERIOD },
        });
      }
      await tx.tenentProfile.update({
        where: { userId: tenancy.tenentId },
        data: { moveOutDate: moveOut },
      });
      await tx.moveOutRequest.updateMany({
        where: { tenancyId, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Superseded by owner-scheduled move-out',
        },
      });
    });

    return {
      message:
        tenancy.tenancyStatus === TenancyStatus.NOTICE_PERIOD
          ? 'Move-out date updated'
          : 'Tenant placed on notice period',
      tenancyId,
      moveOutDate: formatDate(moveOut),
    };
  }

  async cancelNoticePeriod(tenancyId: number, ownerUserId: number) {
    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        tenancyStatus: TenancyStatus.NOTICE_PERIOD,
        deletedAt: null,
        property: { ownerId: ownerUserId },
      },
      select: { id: true, tenentId: true },
    });

    if (!tenancy) {
      throw new NotFoundException(
        'Tenancy on notice not found or access denied',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.tenancy.update({
        where: { id: tenancyId },
        data: { tenancyStatus: TenancyStatus.ACTIVE },
      });
      await tx.tenentProfile.update({
        where: { userId: tenancy.tenentId },
        data: { moveOutDate: null },
      });
      await tx.moveOutRequest.updateMany({
        where: { tenancyId, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Move-out cancelled by property owner',
        },
      });
    });

    return {
      message: 'Move-out cancelled — tenant is active again',
      tenancyId,
    };
  }

  async getMoveOutRequests(propertyId: number, ownerUserId: number) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: ownerUserId },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Property not found or access denied');

    return this.prisma.moveOutRequest.findMany({
      where: { propertyId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        requestedMoveOutDate: true,
        createdAt: true,
        tenant: {
          select: { id: true, fullName: true, phoneNumber: true, email: true },
        },
        tenancy: {
          select: {
            id: true,
            rentAmount: true,
            joinedAt: true,
            room: { select: { roomNumber: true, floorNumber: true } },
          },
        },
      },
    });
  }

  async getMoveOutRequestDetails(requestId: number, ownerUserId: number) {
    const request = await this.prisma.moveOutRequest.findFirst({
      where: {
        id: requestId,
        property: { ownerId: ownerUserId },
      },
      select: {
        id: true,
        status: true,
        requestedMoveOutDate: true,
        rejectionReason: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            tenentProfile: {
              select: { profileImage: true, profession: true, JoiningDate: true },
            },
          },
        },
        tenancy: {
          select: {
            id: true,
            rentAmount: true,
            securityDeposit: true,
            joinedAt: true,
            tenancyStatus: true,
            room: { select: { roomNumber: true, floorNumber: true, sharingType: true } },
            dues: {
              select: {
                id: true,
                dueType: true,
                title: true,
                totalAmount: true,
                paidAmount: true,
                balanceAmount: true,
                status: true,
                dueDate: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        property: { select: { id: true, name: true } },
      },
    });

    if (!request) throw new NotFoundException('Move-out request not found or access denied');
    return request;
  }

  async approveMoveOutRequest(requestId: number, ownerUserId: number) {
    const request = await this.prisma.moveOutRequest.findFirst({
      where: { id: requestId, status: 'PENDING', property: { ownerId: ownerUserId } },
      select: {
        id: true,
        tenancyId: true,
        tenantId: true,
        requestedMoveOutDate: true,
        tenancy: {
          select: {
            joinedAt: true,
            tenancyStatus: true,
            deletedAt: true,
            tenent: {
              select: { tenentProfile: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Pending move-out request not found or access denied',
      );
    }

    if (request.tenancy.deletedAt) {
      throw new BadRequestException('Tenancy is no longer active');
    }

    if (request.tenancy.tenancyStatus !== TenancyStatus.ACTIVE) {
      throw new BadRequestException(
        'Move-out request can only be approved for active tenancies',
      );
    }

    if (!request.tenancy.tenent.tenentProfile) {
      throw new BadRequestException(
        'Tenant profile is incomplete — cannot approve move-out request',
      );
    }

    const moveOut = this.parseAndValidateMoveOutDate(
      formatDate(toDateOnly(request.requestedMoveOutDate)),
      request.tenancy.joinedAt,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.moveOutRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });
      await tx.tenancy.update({
        where: { id: request.tenancyId },
        data: { tenancyStatus: TenancyStatus.NOTICE_PERIOD },
      });
      await tx.tenentProfile.update({
        where: { userId: request.tenantId },
        data: { moveOutDate: moveOut },
      });
    });

    return {
      message: 'Move-out request approved — tenant placed on notice period',
      requestId,
      moveOutDate: formatDate(moveOut),
    };
  }

  async rejectMoveOutRequest(requestId: number, ownerUserId: number, dto: RejectMoveOutDto) {
    const request = await this.prisma.moveOutRequest.findFirst({
      where: { id: requestId, status: 'PENDING', property: { ownerId: ownerUserId } },
      select: { id: true },
    });

    if (!request) throw new NotFoundException('Pending move-out request not found or access denied');

    await this.prisma.moveOutRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', rejectionReason: dto.reason ?? null },
    });

    return { message: 'Move-out request rejected', requestId };
  }

  async getRoomShiftRequests(propertyId: number, ownerUserId: number) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: ownerUserId },
      select: { id: true },
    });
    if (!property) throw new NotFoundException('Property not found or access denied');

    return this.prisma.roomShiftRequest.findMany({
      where: { propertyId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        tenant: {
          select: { id: true, fullName: true, phoneNumber: true, email: true },
        },
        tenancy: {
          select: {
            id: true,
            room: { select: { roomNumber: true, floorNumber: true } },
          },
        },
        requestedRoom: {
          select: { id: true, roomNumber: true, floorNumber: true },
        },
        requestedProperty: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });
  }

  async getRoomShiftRequestDetails(requestId: number, ownerUserId: number) {
    const request = await this.prisma.roomShiftRequest.findFirst({
      where: {
        id: requestId,
        property: { ownerId: ownerUserId },
      },
      select: {
        id: true,
        status: true,
        reason: true,
        rejectionReason: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            email: true,
            tenentProfile: {
              select: { profileImage: true, profession: true, JoiningDate: true },
            },
          },
        },
        tenancy: {
          select: {
            id: true,
            rentAmount: true,
            joinedAt: true,
            tenancyStatus: true,
            room: { select: { roomNumber: true, floorNumber: true, sharingType: true } },
          },
        },
        requestedRoom: {
          select: {
            id: true,
            roomNumber: true,
            floorNumber: true,
            sharingType: true,
            totalBeds: true,
            occupiedBeds: true,
          },
        },
        requestedProperty: { select: { id: true, name: true } },
        property: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Room shift request not found or access denied');
    }
    return request;
  }

  async approveRoomShiftRequest(requestId: number, ownerUserId: number) {
    const request = await this.prisma.roomShiftRequest.findFirst({
      where: {
        id: requestId,
        status: 'PENDING',
        property: { ownerId: ownerUserId },
      },
      select: {
        id: true,
        tenancyId: true,
        requestedRoomId: true,
        requestedPropertyId: true,
        tenancy: {
          select: {
            deletedAt: true,
            tenancyStatus: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        'Pending room shift request not found or access denied',
      );
    }

    if (request.tenancy.deletedAt) {
      throw new BadRequestException('Tenancy is no longer active');
    }

    if (
      request.tenancy.tenancyStatus !== TenancyStatus.ACTIVE &&
      request.tenancy.tenancyStatus !== TenancyStatus.NOTICE_PERIOD
    ) {
      throw new BadRequestException(
        'Room shift can only be approved for active or notice-period tenancies',
      );
    }

    const shiftResult = await this.shiftTenantRoom(
      {
        tenancyId: request.tenancyId,
        newRoomId: request.requestedRoomId,
        newPropertyId: request.requestedPropertyId ?? undefined,
      },
      ownerUserId,
    );

    await this.prisma.roomShiftRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    await this.prisma.roomShiftRequest.updateMany({
      where: {
        tenancyId: request.tenancyId,
        status: 'PENDING',
        id: { not: requestId },
      },
      data: {
        status: 'REJECTED',
        rejectionReason: 'Superseded by an approved room shift request',
      },
    });

    return {
      message: 'Room shift request approved — tenant moved successfully',
      requestId,
      fromRoom: shiftResult.fromRoom,
      toRoom: shiftResult.toRoom,
    };
  }

  async rejectRoomShiftRequest(
    requestId: number,
    ownerUserId: number,
    dto: RejectRoomShiftDto,
  ) {
    const request = await this.prisma.roomShiftRequest.findFirst({
      where: {
        id: requestId,
        status: 'PENDING',
        property: { ownerId: ownerUserId },
      },
      select: { id: true },
    });

    if (!request) {
      throw new NotFoundException(
        'Pending room shift request not found or access denied',
      );
    }

    await this.prisma.roomShiftRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', rejectionReason: dto.reason ?? null },
    });

    return { message: 'Room shift request rejected', requestId };
  }

  async confirmMoveIn(tenancyId: number, ownerUserId: number) {
    const todayDate = toLocalDateOnly(new Date());

    const tenancy = await this.prisma.tenancy.findFirst({
      where: {
        id: tenancyId,
        deletedAt: null,
        property: { ownerId: ownerUserId },
        tenancyStatus: {
          notIn: [
            TenancyStatus.EXITED,
            TenancyStatus.EVICTED,
            TenancyStatus.NOTICE_PERIOD,
          ],
        },
      },
      select: {
        id: true,
        propertyId: true,
        tenentId: true,
        joinedAt: true,
        tenancyStatus: true,
        tenent: { select: { fullName: true } },
        property: { select: { ownerId: true } },
      },
    });

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found or access denied');
    }

    const wasPending = tenancy.tenancyStatus === TenancyStatus.PENDING;
    const isFutureActiveJoin =
      tenancy.tenancyStatus === TenancyStatus.ACTIVE &&
      toDateOnly(tenancy.joinedAt).getTime() > todayDate.getTime();

    if (!wasPending && !isFutureActiveJoin) {
      throw new BadRequestException('Tenant is not waiting to move in');
    }

    const alreadyMovedIn = await this.prisma.tenantMoveInTracker.findFirst({
      where: { tenancyId, status: MoveInstatus.MOVED_IN },
      select: { id: true },
    });
    if (alreadyMovedIn) {
      throw new BadRequestException('Move-in has already been confirmed');
    }

    const now = new Date();
    const movedInDate = now;
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const scheduledMoveInDate = tenancy.joinedAt;

    await this.prisma.$transaction(async (tx) => {
      await tx.tenancy.update({
        where: { id: tenancyId },
        data: {
          tenancyStatus: TenancyStatus.ACTIVE,
        },
      });

      const existingTracker = await tx.tenantMoveInTracker.findFirst({
        where: { tenancyId, status: MoveInstatus.WAITING },
        select: { id: true },
      });

      if (existingTracker) {
        await tx.tenantMoveInTracker.update({
          where: { id: existingTracker.id },
          data: { movedInDate, status: MoveInstatus.MOVED_IN, month, year },
        });
      } else {
        await tx.tenantMoveInTracker.create({
          data: {
            propertyId: tenancy.propertyId,
            tenancyId,
            month,
            year,
            moveInDate: scheduledMoveInDate,
            movedInDate,
            status: MoveInstatus.MOVED_IN,
          },
        });
      }

      if (wasPending) {
        await tx.propertyOtherMetrics.updateMany({
          where: { propertyId: tenancy.propertyId },
          data: {
            totalTenantsReadyToMoveIn: { decrement: 1 },
            totalActiveTenants: { increment: 1 },
          },
        });

        await tx.propertyMetrics.upsert({
          where: {
            propertyId_month_year: {
              propertyId: tenancy.propertyId,
              month,
              year,
            },
          },
          create: {
            propertyId: tenancy.propertyId,
            ownerId: tenancy.property.ownerId,
            month,
            year,
            activeTenants: 1,
          },
          update: {
            activeTenants: { increment: 1 },
          },
        });
      }
    });

    return {
      message: `${tenancy.tenent.fullName} has been moved in successfully`,
      tenancyId,
      joinedAt: formatDate(toLocalDateOnly(scheduledMoveInDate)),
      movedInDate: formatDate(toLocalDateOnly(movedInDate)),
    };
  }

  async getMoveInHistory(propertyId: number, ownerUserId: number) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId: ownerUserId },
      select: { id: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found or access denied');
    }

    return this.prisma.tenantMoveInTracker.findMany({
      where: { propertyId, status: MoveInstatus.MOVED_IN },
      orderBy: { movedInDate: 'desc' },
      select: {
        id: true,
        month: true,
        year: true,
        moveInDate: true,
        movedInDate: true,
        status: true,
        createdAt: true,
        tenancy: {
          select: {
            id: true,
            rentAmount: true,
            securityDeposit: true,
            joinedAt: true,
            tenancyStatus: true,
            room: { select: { roomNumber: true, floorNumber: true } },
            tenent: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
                tenentProfile: {
                  select: { profileImage: true, profession: true },
                },
              },
            },
          },
        },
      },
    }).then((records) =>
      records.map((record) => ({
        id: record.id,
        month: record.month,
        year: record.year,
        moveInDate: formatDate(toLocalDateOnly(record.moveInDate)),
        movedInDate: record.movedInDate
          ? formatDate(toLocalDateOnly(record.movedInDate))
          : null,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        tenancy: {
          ...record.tenancy,
          joinedAt: formatDate(toLocalDateOnly(record.tenancy.joinedAt)),
        },
      })),
    );
  }
}
