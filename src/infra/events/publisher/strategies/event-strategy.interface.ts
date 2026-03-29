import { JobOptions } from 'src/infra/queue/queue.interface';

export interface EventEnvelope<T = unknown> {
  queue: string;
  jobName: string;
  data: T;
  opts?: JobOptions;
}

export interface IEventStrategy<TPayload = unknown> {
  supports: readonly string[];
  resolve(eventName: string, payload: TPayload): EventEnvelope;
}

export const EVENT_STRATEGY = Symbol('EVENT_STRATEGY');
