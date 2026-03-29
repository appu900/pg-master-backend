import { Module, Global } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { EVENT_STRATEGY } from './publisher/strategies/event-strategy.interface';
import { NotificationEventsStrategy } from './publisher/strategies/notification-events.starategy';
import { EventPublisher } from './publisher/event-publisher';

@Global()
@Module({
  imports: [QueueModule],
  controllers: [],
  providers: [
    EventPublisher,
    {
      provide: EVENT_STRATEGY,
      useClass: NotificationEventsStrategy,
      multiple: true,
    } as any,
  ],
  exports: [EventPublisher],
})
export class EventsModule {}
