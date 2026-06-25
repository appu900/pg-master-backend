import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { UpsertLateFineDto } from './dto/upsert-late-fine.dto';

@Injectable()
export class PropertySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLateFineConfig(propertyId: number, ownerId: number) {
    await this.verifyOwnership(propertyId, ownerId);

    const config = await this.prisma.propertyLateFineConfig.findUnique({
      where: { propertyId },
    });

    return {
      propertyId,
      isEnabled: config?.isEnabled ?? false,
      fineType: config?.fineType ?? 'FIXED',
      fineAmount: config?.fineAmount ? Number(config.fineAmount) : 0,
      gracePeriod: config?.gracePeriod ?? 0,
      maxFineAmount: config?.maxFineAmount ? Number(config.maxFineAmount) : null,
    };
  }

  async upsertLateFineConfig(
    propertyId: number,
    ownerId: number,
    dto: UpsertLateFineDto,
  ) {
    await this.verifyOwnership(propertyId, ownerId);

    const config = await this.prisma.propertyLateFineConfig.upsert({
      where: { propertyId },
      create: {
        propertyId,
        isEnabled: dto.isEnabled,
        fineType: dto.fineType ?? 'FIXED',
        fineAmount: dto.fineAmount ?? 0,
        gracePeriod: dto.gracePeriod ?? 0,
        maxFineAmount: dto.maxFineAmount ?? null,
      },
      update: {
        isEnabled: dto.isEnabled,
        ...(dto.fineType !== undefined && { fineType: dto.fineType }),
        ...(dto.fineAmount !== undefined && { fineAmount: dto.fineAmount }),
        ...(dto.gracePeriod !== undefined && { gracePeriod: dto.gracePeriod }),
        ...(dto.maxFineAmount !== undefined && {
          maxFineAmount: dto.maxFineAmount,
        }),
      },
    });

    return {
      message: 'Late fine config updated successfully',
      propertyId: config.propertyId,
      isEnabled: config.isEnabled,
      fineType: config.fineType,
      fineAmount: Number(config.fineAmount),
      gracePeriod: config.gracePeriod,
      maxFineAmount: config.maxFineAmount ? Number(config.maxFineAmount) : null,
    };
  }

  private async verifyOwnership(propertyId: number, ownerId: number) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });
    if (!property) {
      throw new NotFoundException(
        'Property not found or you do not have access',
      );
    }
    return property;
  }
}
