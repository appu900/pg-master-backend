import { Inject, Logger, Injectable } from '@nestjs/common';
import { IQueueProducer, QUEUE_PRODUCER } from '../ports/queue-producer.port';
import { OnEvent } from '@nestjs/event-emitter';





@Injectable()
export class CacheListener {
  private readonly logger = new Logger(CacheListener.name);
  constructor(@Inject(QUEUE_PRODUCER) private readonly queue: IQueueProducer) {}

  @OnEvent('tenant.added')
  @OnEvent('tenant.removed')
  async onTenantChanged() {}
}
