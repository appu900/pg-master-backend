import { Module, Global } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { EVENT_STRATEGY } from './publisher/strategies/event-strategy.interface';
import { NotificationEventsStrategy } from './publisher/strategies/notification-events.starategy';
import { EventPublisher } from './publisher/event-publisher';
import { RentDueEventStrategy } from './publisher/strategies/rent-due-strategy';

const STRATEGIES = [NotificationEventsStrategy, RentDueEventStrategy];
@Global()
@Module({
  imports: [QueueModule],
  controllers: [],
  providers: [
    ...STRATEGIES,
    {
      provide: EVENT_STRATEGY,
      useFactory: (...strategies: any[]) => {
        return strategies;
      },
      inject: STRATEGIES,
    },
    EventPublisher,
  ],
  exports: [EventPublisher],
})
export class EventsModule {}
