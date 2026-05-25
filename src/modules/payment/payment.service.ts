import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DueStatus, PaymentMode } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { EasebuzzService } from 'src/infra/payment/easebuzz/easebuzz.service';
import { PaymentConfigService } from '../payment-config/payment-config.service';
import { DuePaymentCollectedEvent } from 'src/core/events/domain-events';
import { EasebuzzWebhookPayload } from 'src/infra/payment/easebuzz/easebuzz.types';
import { MakePaymentDto } from './dto/initiate-payment.dto';
import { PaymentHelperService } from './helper/payment.helper.service';
import { Appevents } from 'src/core/events/app.events';
import { DuePaymentCollectedPayload } from 'src/core/events/app.event.payloads';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly easebuzz: EasebuzzService,
    private readonly paymentConfigService: PaymentConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
    private readonly paymentHelperService:PaymentHelperService
  ) {}


   
  async makePayment(data: MakePaymentDto, tenantUserId: number) {
    const { tenancy } = await this.paymentHelperService.validateTenant(tenantUserId);
    await this.paymentHelperService.validateDueAndAmount(
      data.totalAmount,
      data.dues,
      tenancy.id,
    );

    const tenantUser = await this.prisma.user.findUnique({
      where: { id: tenantUserId },
      select: { fullName: true, phoneNumber: true, email: true },
    });
    if (!tenantUser) throw new BadRequestException('tenant user not found');

    const gatewayConfig = await this.paymentConfigService.getConfigForPayment(
      tenancy.propertyId,
    );

    const txnId = uuidv4().replace(/-/g, '').substring(0, 32);
    const amountStr = data.totalAmount.toFixed(2);
    const email = tenantUser.email ?? 'noemail@pgmaster.in';
    const firstname = tenantUser.fullName.split(' ')[0];
    const baseUrl =
      this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000/api';
    const surl = `${baseUrl}/payment/webhook`;
    const furl = `${baseUrl}/payment/status`;

    const transaction = await this.prisma.paymentGatewayTransaction.create({
      data: {
        tenancyId: tenancy.id,
        propertyId: tenancy.propertyId,
        txnId,
        amount: data.totalAmount,
        status: 'INITIATED',
      },
    });

    await this.prisma.paymentGatewayTransactionDue.createMany({
      data: data.dues.map((d) => ({
        transactionId: transaction.id,
        dueId: d.dueId,
        amount: d.amount,
      })),
    });

    const { accessKey, paymentUrl } = await this.easebuzz.initiatePayment({
      key: gatewayConfig.merchantKey,
      salt: gatewayConfig.merchantSalt,
      txnid: txnId,
      amount: amountStr,
      productinfo: 'due payment',
      firstname,
      email,
      phone: tenantUser.phoneNumber,
      surl,
      furl,
      environment: gatewayConfig.environment,
      udf1: String(transaction.id),
      udf2: String(tenancy.propertyId),
    });

    await this.prisma.paymentGatewayTransaction.update({
      where: { id: transaction.id },
      data: { accessKey },
    });

    return {
      txnId,
      paymentUrl,
      totalAmount: data.totalAmount,
      dues: data.dues.map((d) => ({ dueId: d.dueId, amount: d.amount })),
    };
  }
  async initiatePayment(dueId: number, tenantUserId: number) {
    // 1. Fetch due and verify it belongs to this tenant
    const due = await this.prisma.tenantDue.findUnique({
      where: { id: dueId },
      include: {
        tenancy: {
          include: {
            tenent: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
        property: { select: { id: true, name: true } },
      },
    });

    if (!due) throw new NotFoundException('Due not found');

    if (due.tenancy.tenentId !== tenantUserId) {
      throw new UnauthorizedException('You can only pay your own dues');
    }

    if (due.status === DueStatus.PAID || due.status === DueStatus.WAIVED) {
      throw new BadRequestException(
        `Due is already ${due.status.toLowerCase()}`,
      );
    }

    const balanceAmount = Number(due.balanceAmount);
    if (balanceAmount <= 0) {
      throw new BadRequestException('No outstanding balance on this due');
    }

    // 2. Fetch gateway config for this property
    const gatewayConfig = await this.paymentConfigService.getConfigForPayment(
      due.propertyId,
    );

    // 3. Build transaction record
    const txnId = uuidv4().replace(/-/g, '').substring(0, 32);
    const amountStr = balanceAmount.toFixed(2);
    const tenant = due.tenancy.tenent;
    const email = tenant.email ?? 'noemail@pgmaster.in';
    const firstname = tenant.fullName.split(' ')[0];
    const productinfo = 'due for payment'; // ← removed trailing space
    const environment = gatewayConfig.environment; // ← use config value

    const baseUrl =
      this.config.get<string>('APP_BASE_URL') ?? 'http://localhost:3000/api';
    console.log('this is base url', baseUrl);
    const surl = `${baseUrl}/payment/webhook`;
    const furl = `${baseUrl}/payment/status`;

    // 4. Save INITIATED transaction before calling EaseBuzz
    const transaction = await this.prisma.paymentGatewayTransaction.create({
      data: {
        dueId: due.id,
        tenancyId: due.tenancyId,
        propertyId: due.propertyId,
        txnId,
        amount: balanceAmount,
        status: 'INITIATED',
      },
    });

    // 5. Call EaseBuzz
    const { accessKey, paymentUrl } = await this.easebuzz.initiatePayment({
      key: gatewayConfig.merchantKey,
      salt: gatewayConfig.merchantSalt,
      txnid: txnId,
      amount: amountStr,
      productinfo,
      firstname,
      email,
      phone: tenant.phoneNumber,
      surl,
      furl,
      environment: 'PRODUCTION', // ← was hardcoded 'PRODUCTION'
      udf1: String(due.id), // dueId — used in webhook lookup
      udf2: String(due.propertyId), // propertyId — used to fetch config for hash verify
    });

    // 6. Persist accessKey
    await this.prisma.paymentGatewayTransaction.update({
      where: { id: transaction.id },
      data: { accessKey },
    });

    return {
      txnId,
      paymentUrl,
      amount: balanceAmount,
      dueType: due.dueType,
      propertyName: due.property.name,
    };
  }

  async handleWebhook(webhook: EasebuzzWebhookPayload) {
    const { txnid, status, easepayid } = webhook;

    this.logger.log(`Webhook received: txnid=${txnid} status=${status}`);

    // 1. Find the transaction
    const transaction = await this.prisma.paymentGatewayTransaction.findUnique({
      where: { txnId: txnid },
    });

    if (!transaction) {
      this.logger.warn(`Webhook for unknown txnId: ${txnid}`);
      return { received: true };
    }

    // Idempotency: already processed
    if (transaction.status === 'SUCCESS' || transaction.status === 'FAILED') {
      this.logger.log(`Webhook already processed for txnId: ${txnid}`);
      return { received: true };
    }

    // 2. Fetch property config for hash verification
    const gatewayConfig =
      await this.prisma.propertyPaymentGatewayConfig.findUnique({
        where: { propertyId: transaction.propertyId },
      });

    if (!gatewayConfig) {
      this.logger.error(
        `No gateway config for propertyId=${transaction.propertyId}`,
      );
      return { received: true };
    }

    // 3. Verify hash
    const isValid = this.easebuzz.verifyResponseHash({
      key: gatewayConfig.merchantKey,
      salt: gatewayConfig.merchantSalt,
      ...this.easebuzz.buildWebhookHashParams(webhook),
    });

    if (!isValid) {
      this.logger.error(
        `Hash mismatch for txnId=${txnid} — possible tampered request`,
      );
      await this.prisma.paymentGatewayTransaction.update({
        where: { txnId: txnid },
        data: { status: 'FAILED', rawResponse: webhook as any },
      });
      return { received: true };
    }

    // 4. Handle success
    if (status === 'success') {
      await this.processSuccessfulPayment(transaction, webhook, easepayid);
    } else {
      await this.prisma.paymentGatewayTransaction.update({
        where: { txnId: txnid },
        data: {
          status: status === 'userCancelled' ? 'CANCELLED' : 'FAILED',
          easepayId: easepayid,
          rawResponse: webhook as any,
        },
      });
      this.logger.log(`Payment ${status} for txnId=${txnid}`);
    }

    return { received: true };
  }

  private async processSuccessfulPayment(
    transaction: {
      id: number;
      dueId: number | null;
      tenancyId: number;
      propertyId: number;
      amount: any;
    },
    webhook: EasebuzzWebhookPayload,
    easepayid: string,
  ) {
    const isMultiDue = transaction.dueId === null;

    if (isMultiDue) {
      await this.processMultiDuePayment(transaction, webhook, easepayid);
    } else {
      await this.processSingleDuePayment(
        transaction as typeof transaction & { dueId: number },
        webhook,
        easepayid,
      );
    }
  }

  private async processSingleDuePayment(
    transaction: {
      id: number;
      dueId: number;
      tenancyId: number;
      propertyId: number;
      amount: any;
    },
    webhook: EasebuzzWebhookPayload,
    easepayid: string,
  ) {
    const due = await this.prisma.tenantDue.findUnique({
      where: { id: transaction.dueId },
      include: {
        tenancy: {
          include: {
            tenent: { select: { id: true, fullName: true, phoneNumber: true } },
          },
        },
      },
    });

    if (!due) {
      this.logger.error(`Due not found for dueId=${transaction.dueId}`);
      return;
    }

    if (due.status === DueStatus.PAID) {
      this.logger.log(`Due ${due.id} already marked PAID, skipping`);
      await this.prisma.paymentGatewayTransaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCESS', easepayId: easepayid, rawResponse: webhook as any },
      });
      return;
    }

    const paidAmount = Number(transaction.amount);
    const newPaid = Number(due.paidAmount) + paidAmount;
    const newBalance = Math.max(0, Number(due.balanceAmount) - paidAmount);
    const newStatus: DueStatus = newBalance === 0 ? DueStatus.PAID : DueStatus.PARTIAL;

    await this.prisma.$transaction(async (tx) => {
      await tx.duePayment.create({
        data: {
          dueId: due.id,
          tenancyId: due.tenancyId,
          propertyId: due.propertyId,
          month: due.month,
          year: due.year,
          amount: paidAmount,
          paymentMode: PaymentMode.ONLINE_GATEWAY,
          transactionId: easepayid,
          notes: `EaseBuzz | txnId: ${transaction.id}`,
          paidAt: new Date(),
          recordedById: due.tenancy.tenentId,
        },
      });
      await tx.tenantDue.update({
        where: { id: due.id },
        data: { paidAmount: newPaid, balanceAmount: newBalance, status: newStatus },
      });
      await tx.paymentGatewayTransaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCESS', easepayId: easepayid, paymentSource: webhook.payment_source, rawResponse: webhook as any },
      });
    });

    this.eventEmitter.emit(
      'due.payment.collected',
      new DuePaymentCollectedEvent(
        due.id,
        due.tenancyId,
        due.propertyId,
        due.tenancy.tenent.phoneNumber,
        due.tenancy.tenent.fullName,
        paidAmount,
        newBalance,
        due.dueType,
        PaymentMode.ONLINE_GATEWAY,
        newStatus === DueStatus.PAID,
        due.month,
        due.year,
      ),
    );

    this.logger.log(`Payment SUCCESS: dueId=${due.id} amount=${paidAmount} easepayid=${easepayid}`);
  }

  private async processMultiDuePayment(
    transaction: { id: number; tenancyId: number; propertyId: number },
    webhook: EasebuzzWebhookPayload,
    easepayid: string,
  ) {
    const transactionDues = await this.prisma.paymentGatewayTransactionDue.findMany({
      where: { transactionId: transaction.id },
      include: {
        due: {
          include: {
            tenancy: { select: { tenentId: true } },
          },
        },
      },
    });

    if (transactionDues.length === 0) {
      this.logger.error(`No transaction dues found for transactionId=${transaction.id}`);
      return;
    }

    const eventsToEmit: DuePaymentCollectedPayload[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const td of transactionDues) {
        const due = td.due;
        if (due.status === DueStatus.PAID) {
          this.logger.log(`Due ${due.id} already PAID, skipping`);
          continue;
        }

        const paidAmount = Number(td.amount);
        const newPaid = Number(due.paidAmount) + paidAmount;
        const newBalance = Math.max(0, Number(due.balanceAmount) - paidAmount);
        const newStatus: DueStatus = newBalance === 0 ? DueStatus.PAID : DueStatus.PARTIAL;

        await tx.duePayment.create({
          data: {
            dueId: due.id,
            tenancyId: due.tenancyId,
            propertyId: due.propertyId,
            month: due.month,
            year: due.year,
            amount: paidAmount,
            paymentMode: PaymentMode.ONLINE_GATEWAY,
            transactionId: easepayid,
            notes: `EaseBuzz | txnId: ${transaction.id}`,
            paidAt: new Date(),
            recordedById: due.tenancy.tenentId,
          },
        });

        await tx.tenantDue.update({
          where: { id: due.id },
          data: { paidAmount: newPaid, balanceAmount: newBalance, status: newStatus },
        });

        eventsToEmit.push({
          dueId: due.id,
          propertyId: due.propertyId,
          dueType: due.dueType,
          amountPaid: paidAmount,
          month: due.month,
          year: due.year,
        });
      }

      await tx.paymentGatewayTransaction.update({
        where: { id: transaction.id },
        data: { status: 'SUCCESS', easepayId: easepayid, paymentSource: webhook.payment_source, rawResponse: webhook as any },
      });
    });

    for (const payload of eventsToEmit) {
      this.eventEmitter.emit(Appevents.DUE_PAYMENT_COLLECTED_EVENT, payload satisfies DuePaymentCollectedPayload);
    }

    this.logger.log(`Multi-due payment SUCCESS: transactionId=${transaction.id} easepayid=${easepayid}`);
  }

  async getTenantPaymentHistory(tenantUserId: number) {
    const tenancies = await this.prisma.tenancy.findMany({
      where: { tenentId: tenantUserId },
      select: { id: true },
    });

    if (tenancies.length === 0) {
      return { total: 0, payments: [] };
    }

    const tenancyIds = tenancies.map((t) => t.id);

    const payments = await this.prisma.duePayment.findMany({
      where: { tenancyId: { in: tenancyIds } },
      take: 20,
      orderBy: { paidAt: 'desc' },
      select: {
        id: true,
        amount: true,
        paymentMode: true,
        upiApp: true,
        transactionId: true,
        notes: true,
        paidAt: true,
        month: true,
        year: true,
        due: {
          select: {
            id: true,
            dueType: true,
            title: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
            property: { select: { id: true, name: true } },
            tenancy: {
              select: {
                room: { select: { roomNumber: true } },
              },
            },
            gatewayTransactions: {
              where: { status: 'SUCCESS' },
              select: {
                txnId: true,
                status: true,
                easepayId: true,
                paymentSource: true,
                createdAt: true,
              },
              take: 1,
            },
          },
        },
      },
    });

    return {
      total: payments.length,
      payments: payments.map((p) => ({
        paymentId: p.id,
        amount: Number(p.amount),
        paymentMode: p.paymentMode,
        upiApp: p.upiApp ?? null,
        transactionId: p.transactionId ?? null,
        notes: p.notes ?? null,
        paidAt: p.paidAt,
        month: p.month,
        year: p.year,
        due: {
          id: p.due.id,
          type: p.due.dueType,
          title: p.due.title,
          totalAmount: Number(p.due.totalAmount),
          paidAmount: Number(p.due.paidAmount),
          balanceAmount: Number(p.due.balanceAmount),
          status: p.due.status,
        },
        property: p.due.property,
        roomNumber: p.due.tenancy.room.roomNumber,
        gateway: p.due.gatewayTransactions[0] ?? null,
      })),
    };
  }

  async getTransactionStatus(txnId: string, tenantUserId: number) {
    const transaction = await this.prisma.paymentGatewayTransaction.findUnique({
      where: { txnId },
      select: {
        txnId: true,
        amount: true,
        status: true,
        tenancyId: true,
        easepayId: true,
        paymentSource: true,
        createdAt: true,
        updatedAt: true,
        due: { select: { id: true, dueType: true, status: true } },
        transactionDues: {
          select: { dueId: true, amount: true, due: { select: { dueType: true, status: true } } },
        },
      },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    const tenancy = await this.prisma.tenancy.findUnique({
      where: { tenentId: tenantUserId },
      select: { id: true },
    });
    if (!tenancy || tenancy.id !== transaction.tenancyId) {
      throw new UnauthorizedException('Access denied');
    }

    const isMultiDue = transaction.transactionDues.length > 0;

    return {
      txnId: transaction.txnId,
      amount: Number(transaction.amount),
      gatewayStatus: transaction.status,
      easepayId: transaction.easepayId,
      paymentSource: transaction.paymentSource,
      initiatedAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      ...(isMultiDue
        ? {
            dues: transaction.transactionDues.map((td) => ({
              dueId: td.dueId,
              amount: Number(td.amount),
              dueType: td.due.dueType,
              dueStatus: td.due.status,
            })),
          }
        : {
            dueStatus: transaction.due?.status,
            dueType: transaction.due?.dueType,
          }),
    };
  }
}
