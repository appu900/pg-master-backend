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

  if (dto.rentAmount !== undefined)
    tenancyUpdate.rentAmount = dto.rentAmount;

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
}
