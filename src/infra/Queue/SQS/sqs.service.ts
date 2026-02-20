import { Logger, OnModuleInit } from '@nestjs/common';
import {
  GetQueueAttributesCommand,
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import { v4 as uuid4 } from 'uuid';
import { timestamp } from 'rxjs';

export interface SQSMessagePayload {
  messageType: string;
  payload: Record<string, any>;
  messageId?: string;
}

export class SqsService implements OnModuleInit {
  private readonly logger = new Logger(SqsService.name);
  private readonly client: SQSClient;
  private readonly queueURL: string;

  constructor() {
    this.client = new SQSClient({
      region: process.env.AWS_REGION || 'ap-south-1',
    });
    this.queueURL = process.env.SQS_URL!;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: this.queueURL,
        AttributeNames: ['QueueArn'],
      });
      await this.client.send(command);
      this.logger.log('SQS connection OK ');
      return true;
    } catch (error) {
      this.logger.warn('SQS is NOT reachable', error);
      return false;
    }
  }

  async onModuleInit() {
    const isSQSAvailable = await this.checkConnection();
    if (!isSQSAvailable) {
      this.logger.warn(
        'SQS is not available. The application will continue to run, but SQS-related features will be disabled.',
      );
    }
  }

  async sendEvent(params: SQSMessagePayload): Promise<string | null> {
    const messageId = params.messageId || uuid4();
    const message = {
      messageType: params.messageType,
      messageId,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      payload: params.payload,
    };

    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueURL,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          MessageType: {
            DataType: 'String',
            StringValue: params.messageType,
          },
        },
      });
      const result = await this.client.send(command);
      this.logger.log(
        `SQS message sent: type ${params.messageType}, message ID: ${result.MessageId}`,
      );
      return result.MessageId || null;
    } catch (error) {
      this.logger.error('Error sending message to SQS:', error);
      return null;
    }
  }
}
