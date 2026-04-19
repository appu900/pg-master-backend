import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';


@Injectable()
export class DueService {
  private readonly logger = new Logger(DueService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async runTenantOwnerShipValidation(
    tenancyId: number,
    propertyOwnerId: number,
  ) {
   
  }
 
  async addDueToTenant(tenancyId: number, dto: any) {}

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
        status: 'UNPAID',
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
    return dues.length > 0 ? dues : 'No pending dues found';
  }
}
