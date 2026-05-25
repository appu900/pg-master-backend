import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MetricsHandler } from '../handlers/interface/metrics.handler.interface';

export const METRICS_HANDLERS = 'METRICS_HANDLERS';







// need to check the logger here 
@Injectable()
export class MetricsHandlerRegistry implements OnModuleInit {

  private readonly logger = new Logger(MetricsHandlerRegistry.name);
  private readonly handlers = new Map<string, MetricsHandler>();

  constructor(
    @Inject(METRICS_HANDLERS) private readonly allHandlers: MetricsHandler[],
  ) {}

  onModuleInit() {
    console.log("hello from registry class")
    for (const handler of this.allHandlers) {
      for (const eventType of handler.supportedEvents) {
        this.handlers.set(eventType, handler);
        this.logger.debug(`Registered: ${handler.handlerName} → ${eventType}`);
      }
    }
  }

  getHandler(eventType: string): MetricsHandler | undefined {
    return this.handlers.get(eventType);
  }
}
