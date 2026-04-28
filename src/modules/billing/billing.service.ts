import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { AddDueDto } from './dto/add-due.dto';
import { EditDueDto } from './dto/edit-due.dto';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { DueStatus, TenancyStatus } from '@prisma/client';
import { BillingEventHandler } from './biiling.eventpublisher';
import { RedisService } from 'src/infra/redis/redis.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  constructor(
    private readonly billingEventHandler: BillingEventHandler,
    private readonly prisma: PrismaService,
    private readonly redis:RedisService
  ) {}

  /**
   * 1. Check if the tenant belongs to the property owner
    2. Check if the due for the tenant for the month and year already exists, if yes return an error response
    3. Check if the rent amount is valid (greater than 0)
    4. Check if the due date is valid (not in the past)
    5. Return success response if all checks are passed

   * @param payload 
   * @param propertyOwnerUserId 
   * @returns 
   */
  private async preFlightCheck(
    payload: AddDueDto,
    ownerUserId: number,
  ): Promise<{ success: boolean; message: string; tenancy: any | null }> {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: {
        tenentId: payload.tenantId,
        propertyId: payload.propertyId,
        tenancyStatus: TenancyStatus.ACTIVE,
        deletedAt: null,
        property: {
          ownerId: ownerUserId,
        },
      },
    });
    if (!tenancy) {
      return {
        success: false,
        message: 'No active tenancy found for the tenant and property',
        tenancy: null,
      };
    }

    if (payload.amount <= 0) {
      return {
        success: false,
        message: 'invalid due amount it must be greater than 0',
        tenancy: null,
      };
    }

    return {
      success: true,
      message: 'pre flight check passed',
      tenancy,
    };
  }
  async createDueForTenant(
    tenanatId: number,
    propertyId: number,
    duePayload: AddDueDto,
    propertyOwnerUserId: number,
  ) {
    // run preflight validation checks
    const validationCheck = await this.preFlightCheck(
      duePayload,
      propertyOwnerUserId,
    );
    if (validationCheck.success === false) {
      this.logger.warn(
        `Pre flight check failed for tenancyId ${tenanatId} and propertyId ${propertyId} with message ${validationCheck.message}`,
      );
      throw new BadRequestException(validationCheck.message);
    }

    const tenancy = validationCheck.tenancy;
    const tenant = await this.prisma.user.findUnique({
      where: { id: duePayload.tenantId },
    });
    if (!tenant) {
      this.logger.error(
        `Tenant with id ${duePayload.tenantId} not found in database`,
      );
      throw new BadRequestException('Tenant not found');
    }

    // check due endDate should not be in the past
    // if past due date then the dueDate will be currentDate + 7days
    let lastDueDate = duePayload.dueEndDate;
    const currentDate = new Date();
    const dueEndDate = new Date(duePayload.dueEndDate);
    if (dueEndDate <= currentDate) {
      lastDueDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
    }

    // craete due in db wirh status pending
    const res = await this.prisma.tenantDue.create({
      data: {
        tenancyId: tenancy.id,
        propertyId: duePayload.propertyId,
        dueType: duePayload.dueType,
        totalAmount: duePayload.amount,
        balanceAmount: duePayload.amount,
        periodStart: duePayload.dueStartDate,
        periodEnd: duePayload.dueEndDate,
        month: duePayload.dueStartDate.getMonth() + 1,
        year: duePayload.dueStartDate.getFullYear(),
        title: `${duePayload.dueType} for ${duePayload.dueStartDate.toLocaleString('default', { month: 'long' })} ${duePayload.dueStartDate.getFullYear()}`,
        dueDate: lastDueDate,
      },
    });

    // 2. Publish Event to create rent due for tenant
    await this.billingEventHandler.publishRentDueEvent(
      tenancy.id,
      duePayload.propertyId,
      tenant.fullName,
      lastDueDate,
      duePayload.amount,
      duePayload.dueType,
      tenant.phoneNumber,
      res.id,
    );
  }

  async deleteDue(dueId: number, ownerUserId: number) {
    const due = await this.prisma.tenantDue.findFirst({
      where: {
        id: dueId,
        property: { ownerId: ownerUserId },
      },
    });
    if (!due) {
      throw new NotFoundException('Due not found');
    }
    const propertyId = due.propertyId;
    const dueMonth = due.month;
    const dueYear = due.year;
    const dueAmount = due.balanceAmount
    if (due.status !== DueStatus.UNPAID) {
      throw new BadRequestException('Only unpaid dues can be deleted');
    }
    await this.prisma.tenantDue.delete({ where: { id: dueId } });
    const propertyKey = `dash:property:${propertyId}:${dueYear}:${dueMonth}`;
    this.redis.getClient().hincrby(propertyKey,'dues_generated',-dueAmount)


    return { message: 'Due deleted successfully' };
  }

  async editDue(dueId: number, dto: EditDueDto, ownerUserId: number) {
    const due = await this.prisma.tenantDue.findFirst({
      where: {
        id: dueId,
        property: { ownerId: ownerUserId },
      },
    });
    if (!due) {
      throw new NotFoundException('Due not found');
    }
    if (due.status === DueStatus.PAID) {
      throw new BadRequestException('Paid dues cannot be edited');
    }

    const updated = await this.prisma.tenantDue.update({
      where: { id: dueId },
      data: {
        ...(dto.fromDate && { periodStart: dto.fromDate }),
        ...(dto.toDate && { periodEnd: dto.toDate }),
        ...(dto.dueAmount !== undefined && {
          totalAmount: dto.dueAmount,
          balanceAmount: dto.dueAmount - Number(due.paidAmount),
        }),
        ...(dto.dueType && { dueType: dto.dueType }),
      },
    });
    return updated;
  }
}
