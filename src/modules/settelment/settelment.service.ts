import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SettelmentWebhookDto } from './dto/settelment-webhook.dto';






@Injectable()
export class SettelmentService {
  private readonly logger = new Logger(SettelmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async HandleSettelmentwebHook(payload: SettelmentWebhookDto) {
    const { data } = payload;

    // Idempotency — skip if already processed
    const existing = await this.prisma.propertySettlement.findUnique({
      where: { payoutId: data.payout_id },
    });
    if (existing) {
      this.logger.log(`Settlement already processed: payoutId=${data.payout_id}`);
      return { received: true };
    }

    if (!data.settled_transactions?.length) {
      this.logger.warn(`No settled_transactions in payload: payoutId=${data.payout_id}`);
      return { received: true };
    }

    // Resolve propertyId by matching txnIds to our PaymentGatewayTransaction records
    const txnIds = data.settled_transactions.map((t) => t.txnid);
    const gatewayTxns = await this.prisma.paymentGatewayTransaction.findMany({
      where: { txnId: { in: txnIds } },
      select: { txnId: true, propertyId: true },
    });

    if (!gatewayTxns.length) {
      this.logger.warn(`No matching gateway transactions for payoutId=${data.payout_id}`);
      return { received: true };
    }

    // One payout = one merchant key = one property
    const propertyId = gatewayTxns[0].propertyId;

    const payoutDate = new Date(data.payout_date);
    const month = payoutDate.getMonth() + 1;
    const year = payoutDate.getFullYear();

    await this.prisma.$transaction(async (tx) => {
      const settlement = await tx.propertySettlement.create({
        data: {
          propertyId,
          payoutId: data.payout_id,
          payoutDate,
          month,
          year,
          totalAmount: data.total_amount,
          payoutAmount: data.payout_amount,
          refundAmount: data.refund_amount,
          serviceChargeAmount: data.service_charge_amount,
          serviceTaxAmount: data.service_tax_amount,
          bankName: data.bank_name,
          ifscCode: data.ifsc_code,
          accountNumber: data.account_number,
          bankTransactionId: data.bank_transaction_id,
        },
      });

      await tx.settledTransaction.createMany({
        data: data.settled_transactions.map((t) => ({
          settlementId: settlement.id,
          txnId: t.txnid,
          easepayId: t.easepayid,
          transactionType: t.transaction_type,
          transactionAmount: t.transaction_amount,
          settlementAmount: t.settlement_amount,
          serviceCharge: t.service_charge,
          serviceTax: t.service_tax,
        })),
      });
    });

    this.logger.log(
      `Settlement recorded: payoutId=${data.payout_id} propertyId=${propertyId} amount=${data.payout_amount}`,
    );

    return { received: true };
  }

  async getPropertySettlements(propertyId: number, month?: number, year?: number) {
    const settlements = await this.prisma.propertySettlement.findMany({
      where: {
        propertyId,
        ...(month && year ? { month, year } : {}),
      },
      include: { settledTransactions: true },
      orderBy: { payoutDate: 'desc' },
    });

    // Pending = SUCCESS transactions not yet in any SettledTransaction
    const settledTxnIds = await this.prisma.settledTransaction.findMany({
      where: { settlement: { propertyId } },
      select: { txnId: true },
    });
    const settledSet = new Set(settledTxnIds.map((s) => s.txnId));

    const pendingTransactions = await this.prisma.paymentGatewayTransaction.findMany({
      where: {
        propertyId,
        status: 'SUCCESS',
        txnId: { notIn: [...settledSet] },
      },
      select: { txnId: true, amount: true, createdAt: true },
    });

    const pendingAmount = pendingTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    return {
      propertyId,
      pendingSettlementAmount: pendingAmount,
      pendingTransactionCount: pendingTransactions.length,
      settlements: settlements.map((s) => ({
        id: s.id,
        payoutId: s.payoutId,
        payoutDate: s.payoutDate,
        month: s.month,
        year: s.year,
        totalAmount: Number(s.totalAmount),
        payoutAmount: Number(s.payoutAmount),
        refundAmount: Number(s.refundAmount),
        bankName: s.bankName,
        bankTransactionId: s.bankTransactionId,
        transactionCount: s.settledTransactions.length,
      })),
    };
  }
}
