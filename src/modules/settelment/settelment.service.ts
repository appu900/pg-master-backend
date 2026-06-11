import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SettlementCacheManager } from './cache/settlement.cachemanager';
import { randomUUID } from 'node:crypto';
import { payeeCategory, Prisma } from '@prisma/client';
import { IQueueProducer, QUEUE_PRODUCER } from 'src/core/ports/queue-producer.port';
import { QUEUES } from 'src/core/queue/queue.constants';
import { Appevents } from 'src/core/events/app.events';


@Injectable()
export class SettleMentService {
  private readonly logger = new Logger(SettleMentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: SettlementCacheManager,
    @Inject(QUEUE_PRODUCER) private readonly queue:IQueueProducer
  ) {}

  // ** webhook handler recived
  async setWebhookPayload(data: any) {
    try {
      const webhookPayload = typeof data === 'string' ? JSON.parse(data) : data;
      const payoutId = webhookPayload?.payout_id ?? null;
      const eventId = randomUUID();
      const webhook = await this.prisma.webhookData.create({
        data: {
          eventId:eventId,
          payoutId:payoutId,
          data:webhookPayload,
          status:'RECEIVED',
          provider: 'eazybuzz',
        }
      })
      const webHookProcessPayload = {
        webhookId:webhook.id
      }
      await this.queue.enqueue(QUEUES.WEBHOOK_PROCESSING, Appevents.PROCESS_WEBHOOK, webHookProcessPayload)
      return true;
    } catch (error:any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(`Duplicate payoutWebhook recived`);
        return true;
      }
      this.logger.error("failed to persist the webhook data", error);
      throw error;
    }
  }

  async getSettlementByPropertyID(propertyId: number) {
    // const cached = await this.cache.getCachedData(propertyId);
    // if (cached) return cached;

    const [settlementLedgerData, settelmentTransactions] = await Promise.all([
      this.prisma.propertySettlementLedger.findUnique({
        where: { propertyId },
      }),
      this.prisma.settlementTransactions.findMany({
        where: { propertyId },
        take: 100,
      }),
    ]);

    const result = { settlementLedgerData, settelmentTransactions };
    // await this.cache.setCache(propertyId, result);
    return result;
  }
}
