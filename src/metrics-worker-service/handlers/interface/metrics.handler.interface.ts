export interface MetricsHandler {
  readonly handlerName: string;
  readonly supportedEvents: string[];
  handle(eventType: string, data: unknown): Promise<void>;
}