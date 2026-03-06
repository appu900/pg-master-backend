import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EditTenancyDto } from './dto/update-tenancy.dto';

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

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
        propertyId: propertyId,
      },
    });
    if (!tenancy) {
      throw new NotFoundException('tenancy not found');
    }

    const updateTenancyPayload: Prisma.TenancyUpdateInput = {};
    const tenantProfileUpdate: Prisma.TenentProfileUpdateInput = {};

    if (dto.agreementPeriod)
      tenantProfileUpdate.agreementPeriodinMonths = dto.agreementPeriod;
    if (dto.moveoutDate)
      tenantProfileUpdate.moveOutDate = new Date(dto.moveoutDate);
    if (dto.rentalType) tenantProfileUpdate.RentalType = dto.rentalType;

    if (dto.lockInPeriodInMonths)
      updateTenancyPayload.lockInPeriodsInMonths = dto.lockInPeriodInMonths;
    if (dto.noticePeriodInDays)
      updateTenancyPayload.noticePeriodInDays = dto.noticePeriodInDays;
    if (dto.rentAmount) updateTenancyPayload.rentAmount = dto.rentAmount;

    const hastenentProfileChanges = Object.keys(tenantProfileUpdate).length > 0;
    const hastenancyChanges = Object.keys(updateTenancyPayload).length > 0;

    const result = await this.prisma.$transaction(async (tx) => {
      if (hastenancyChanges) {
        await tx.tenancy.update({
          where: { tenentId: tenantId },
          data: updateTenancyPayload,
        });
      }

      if (hastenentProfileChanges) {
        await tx.tenentProfile.update({
          where: { userId: tenantId },
          data: tenantProfileUpdate,
        });
      }
    });

    return true;
  }
}
