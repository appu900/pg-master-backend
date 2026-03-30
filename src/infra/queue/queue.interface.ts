export interface JobOptions {
  delay?: number;
  jobId?: string;
  attempts?: number;
  priority?: number;
}

export interface IQueueService {
  enqueue<T>(
    queue: string,
    jobName: string,
    data: T,
    opts?: JobOptions,
  ): Promise<void>;
}

export const QUEUE_SERVICE = Symbol('QUEUE_SERVICE');
