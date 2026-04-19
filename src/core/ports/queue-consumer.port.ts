export interface QueueJob<T = any> {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
  timestamp?: number;
}

export type jobHandler<T = any> = (job: QueueJob<T>) => Promise<void>;

export interface IQueueConsumer {
  registerHandler(queueName: string, handler: jobHandler): void;
  shutDown(): Promise<void>;
}

export const QUEUE_CONSUMER = Symbol('QUEUE_CONSUMER');
