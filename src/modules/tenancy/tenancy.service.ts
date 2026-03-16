import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EditTenancyDto } from './dto/update-tenancy.dto';
import { AddTenantDto } from './dto/add.tenant.dto';
import { toDateOnly } from 'src/utils/Proration.utils';
import { join } from 'path';

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);
  constructor(private readonly prisma: PrismaService) {}

  async createTenant(dto: AddTenantDto) {
    const joinDate = toDateOnly(new Date(dto.joiningDate));
    console.log(joinDate)
    
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
}
