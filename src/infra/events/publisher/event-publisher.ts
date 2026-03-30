import { Inject, Logger, OnModuleInit, Injectable } from '@nestjs/common';
import {
  EVENT_STRATEGY,
  IEventStrategy,
} from './strategies/event-strategy.interface';
import {
  IQueueService,
  JobOptions,
  QUEUE_SERVICE,
} from 'src/infra/queue/queue.interface';
import e from 'express';

@Injectable()
export class EventPublisher implements OnModuleInit {
  private readonly logger = new Logger(EventPublisher.name);
  private readonly registry = new Map<string, IEventStrategy>();

  constructor(
    @Inject(EVENT_STRATEGY) private readonly strategies: IEventStrategy[],
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
  ) {}

  onModuleInit() {
    const strategies = Array.isArray(this.strategies)
      ? this.strategies
      : [this.strategies];
    for (const starategy of strategies) {
      for (const eventName of starategy.supports) {
        if (this.registry.has(eventName)) {
          this.logger.warn(
            `Event ${eventName} already has a strategy registered. Overriding with ${starategy.constructor.name}`,
          );
        }
        this.registry.set(eventName, starategy);
        this.logger.log(
          `Registered ${eventName} => ${starategy.constructor.name} strategy`,
        );
      }
    }

    this.logger.debug(
      `EventPublisher initialized with ${this.registry.size} strategies`,
    );
  }

  async publish<TPayload = unknown>(
    eventName: string,
    payload: TPayload,
    opts?: JobOptions,
  ): Promise<void> {
    const strategy = this.registry.get(eventName);
    if (!strategy) {
      throw new Error(
        `EventPublisher: no strategy registered for event "${eventName}". ` +
          `Did you forget to add it to a strategy's "supports" list and register it in EventsModule?`,
      );
    }
    const envelope = strategy.resolve(eventName, payload);
    this.logger.debug(
      `Publishing event ${eventName} with jobname ${JSON.stringify(envelope.jobName)} to queue ${envelope.queue}`,
    );
    await this.queueService.enqueue(
      envelope.queue,
      envelope.jobName,
      envelope.data,
      opts,
    );
  }

  async publishAll(events: Array<{ name: string; payload: unknown }>) {
    await Promise.all(
      events.map((event) => this.publish(event.name, event.payload)),
    );
  }
}
