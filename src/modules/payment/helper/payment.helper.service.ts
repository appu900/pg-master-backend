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
        },
      },
    });
    if (!tenant) throw new BadRequestException('invalid user');
    const tenancy = tenant.tenancy[0];
    if (!tenancy)
      throw new BadRequestException(
        'We could not found any billable tenancy for this request',
      );

    return {
      tenant,
      tenancy,
    };
  }

  async validateDueAndAmount(
    totalAmount: number,
    dues: PaymentDueDetails[],
    tenancyId: number,
  ) {
    const length = dues.length;

    if (length === 1) {
      const dueId = dues[0].dueId;
      const requestedAmount = dues[0].amount;

      if (requestedAmount === 0) {
        throw new BadRequestException('you cant pay 0 amount');
      }
      if (totalAmount !== requestedAmount) {
        throw new BadRequestException('total amount does not match due amount');
      }

      const due = await this.prisma.tenantDue.findUnique({
        where: { id: dueId, tenancyId },
      });
      if (!due) throw new BadRequestException('due not found');

      if (due.status === DueStatus.PAID || due.status === DueStatus.WAIVED) {
        throw new BadRequestException('due is already cleared');
      }

      const balanceAmount = Number(due.balanceAmount);
      if (requestedAmount > balanceAmount) {
        throw new BadRequestException(
          'amount can not be more than the due amount',
        );
      }

      return true;
    } else {
      // tenant is paying multiple dues at a time
      let sumOfAmounts = 0;

      for (const item of dues) {
        if (item.amount === 0) {
          throw new BadRequestException(
            `amount for due ${item.dueId} cannot be 0`,
          );
        }
        sumOfAmounts += item.amount;
      }

      if (totalAmount !== sumOfAmounts) {
        throw new BadRequestException(
          'total amount does not match sum of individual due amounts',
        );
      }

      const dueIds = dues.map((d) => d.dueId);
      const fetchedDues = await this.prisma.tenantDue.findMany({
        where: { id: { in: dueIds }, tenancyId },
      });

      if (fetchedDues.length !== dueIds.length) {
        throw new BadRequestException('one or more dues not found');
      }

      const dueMap = new Map(fetchedDues.map((d) => [d.id, d]));

      for (const item of dues) {
        const due = dueMap.get(item.dueId);
        if (!due) throw new BadRequestException(`due ${item.dueId} not found`);
        if (due.status === DueStatus.PAID || due.status === DueStatus.WAIVED) {
          throw new BadRequestException(`due ${due.id} is already cleared`);
        }
        if (item.amount > Number(due.balanceAmount)) {
          throw new BadRequestException(
            `amount for due ${due.id} cannot be more than the balance amount`,
          );
        }
      }

      return true;
    }
  }
}
