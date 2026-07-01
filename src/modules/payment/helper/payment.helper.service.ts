import { BadRequestException, Logger, Injectable } from '@nestjs/common';
import { DueStatus, TenancyStatus, UserRole } from '@prisma/client';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';

export interface PaymentDueDetails {
  dueId: number;
  amount: number;
}

@Injectable()
export class PaymentHelperService {
  private readonly logger = new Logger(PaymentHelperService.name);
  constructor(private prisma: PrismaService) {}

  async validateTenant(tenantUserId: number) {
    const tenant = await this.prisma.user.findUnique({
      where: {
        id: tenantUserId,
        isActive: true,
        isBlockedByAdmin: false,
        role: UserRole.TENANT,
      },
      select: {
        tenancy: {
          where: {
            tenancyStatus: {
              in: [
                TenancyStatus.ACTIVE,
                TenancyStatus.NOTICE_PERIOD,
                TenancyStatus.PENDING,
              ],
            },
            deletedAt: null,
          },
          select: { id: true, propertyId: true },
        },
      },
    });
    if (!tenant) throw new BadRequestException('invalid user');
    if (!tenant.tenancy.length)
      throw new BadRequestException(
        'We could not found any billable tenancy for this request',
      );

    return {
      tenant,
      tenancies: tenant.tenancy,
    };
  }

  async validateDueAndAmount(
    totalAmount: number,
    dues: PaymentDueDetails[],
    tenancyIds: number[],
  ): Promise<{ tenancyId: number; propertyId: number }> {
    if (!dues.length) throw new BadRequestException('no dues provided');

    // Validate that each amount is non-zero and the declared total matches
    if (dues.length === 1) {
      if (dues[0].amount === 0)
        throw new BadRequestException('you cant pay 0 amount');
      if (totalAmount !== dues[0].amount)
        throw new BadRequestException('total amount does not match due amount');
    } else {
      let sumOfAmounts = 0;
      for (const item of dues) {
        if (item.amount === 0)
          throw new BadRequestException(
            `amount for due ${item.dueId} cannot be 0`,
          );
        sumOfAmounts = Number((sumOfAmounts + item.amount).toFixed(2));
      }
      if (totalAmount !== sumOfAmounts)
        throw new BadRequestException(
          'total amount does not match sum of individual due amounts',
        );
    }

    const dueIds = dues.map((d) => d.dueId);
    const fetchedDues = await this.prisma.tenantDue.findMany({
      where: { id: { in: dueIds }, tenancyId: { in: tenancyIds } },
      select: {
        id: true,
        tenancyId: true,
        propertyId: true,
        status: true,
        balanceAmount: true,
      },
    });

    if (fetchedDues.length !== dueIds.length)
      throw new BadRequestException('one or more dues not found');

    const uniquePropertyIds = new Set(fetchedDues.map((d) => d.propertyId));
    if (uniquePropertyIds.size > 1)
      throw new BadRequestException(
        'all dues in a single payment must belong to the same property',
      );

    const dueMap = new Map(fetchedDues.map((d) => [d.id, d]));

    for (const item of dues) {
      const due = dueMap.get(item.dueId)!;
      if (due.status === DueStatus.PAID || due.status === DueStatus.WAIVED)
        throw new BadRequestException(`due ${due.id} is already cleared`);
      if (item.amount > Number(due.balanceAmount))
        throw new BadRequestException(
          `amount for due ${due.id} cannot be more than the balance amount`,
        );
    }

    const first = fetchedDues[0];
    return { tenancyId: first.tenancyId, propertyId: first.propertyId };
  }
}
