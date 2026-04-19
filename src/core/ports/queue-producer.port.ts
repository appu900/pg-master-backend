export interface QueueJobOptions {
  jobId?: string;
  delay?: number;
  priority?: number;
  attempts?: number;
  backOff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
}

export interface BulkJobInput {
  name: string;
  data: any;
  opts?: QueueJobOptions;
}

export interface IQueueProducer {
  enqueue(
    queueName: string,
    jobName: string,
    data: any,
    opts?:QueueJobOptions,
  ): Promise<void>;
  bulkEnqueue(queueName: string, jobs:BulkJobInput[]):Promise<void>;
  getWaitingCount(queueName: string): Promise<number>;
  getActiveCount(queueName: string): Promise<number>;
}





export const QUEUE_PRODUCER = Symbol('QUEUE_PRODUCER')
