import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  SendMessageBatchCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  Message,
} from '@aws-sdk/client-sqs';

import {
  SQSMessageEnvelope,
  SQSMessageType,
} from 'src/common/sqs/message-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SqsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsService.name);
  private client!: SQSClient;
  private queueUrl = process.env.SQS_URL!;
  private readonly maxMessages = 10;
  private readonly waitTimeSeconds = 20;
  private readonly visibilityTimeOut = 300;

  async onModuleInit() {
    this.client = new SQSClient({
      region: process.env.AWS_REGION || 'ap-south-1',
    });
    console.log('SQS connected');
  }

  async sendMessage(
    messageType: SQSMessageType,
    messageGroupId:string,
    payload: any,
    messageId?: string,
  ) {
    const id = messageId || uuidv4();
    const envelope: SQSMessageEnvelope = {
      messageType,
      messageId: id,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      payload,
    };
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(envelope),
      MessageGroupId:messageGroupId,
      MessageDeduplicationId:id,
      MessageAttributes: {
        MessageType: { DataType: 'String', StringValue: messageType },
      },
    });

    try {
      const result = await this.client.send(command);
      console.log("sent message to sqs")
      this.logger.debug(
        `SQS sent: type=${messageType} id=${id} sqsId=${result.MessageId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `SQS send failed: type=${messageType} id=${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendBatch(
    messageGroupId:string,
    messages: Array<{ messageType: SQSMessageType; payload: any }>,
  ): Promise<void> {
    // SQS max 10 per batch
    for (let i = 0; i < messages.length; i += 10) {
      const batch = messages.slice(i, i + 10);

      const entries = batch.map((msg, idx) => {
        const id = uuidv4();
        const envelope: SQSMessageEnvelope = {
          messageType: msg.messageType,
          messageId: id,
          timestamp: new Date().toISOString(),
          retryCount: 0,
          payload: msg.payload,
        };

        return {
          Id: `msg_${i}_${idx}`,
          MessageBody: JSON.stringify(envelope),
          MessageGroupId:messageGroupId,
          MessageAttributes: {
            MessageType: { DataType: 'String', StringValue: msg.messageType },
          },
        };
      });

      const command = new SendMessageBatchCommand({
        QueueUrl: this.queueUrl,
        Entries: entries,
      });

      const result = await this.client.send(command);

      if (result.Failed && result.Failed.length > 0) {
        this.logger.error(
          `Batch send failures: ${result.Failed.length}`,
          result.Failed,
        );
      }
    }
  }
 
  async sendMessageWithDelay(
    messageType: SQSMessageType,
    payload: any,
    delaySeconds: number,
  ) {
    const id = uuidv4();
    const envelope: SQSMessageEnvelope = {
      messageType,
      messageId: id,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      payload,
    };
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(envelope),
      DelaySeconds: Math.min(delaySeconds, 900),
      MessageAttributes: {
        messageType: { DataType: 'String', StringValue: messageType },
      },
    });
    const result = await this.client.send(command);
    this.logger.log('send delayed message to sqs', result);
    return id;
  }

  async reciveMessages(): Promise<Message[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: this.maxMessages,
      WaitTimeSeconds: this.waitTimeSeconds,
      VisibilityTimeout: this.visibilityTimeOut,
      MessageAttributeNames: ['All'],
      AttributeNames: ['All'],
    });

    const result = await this.client.send(command);
    return result.Messages || [];
  }

  async deleteMessage(receipthandle: string) {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receipthandle,
    });
    await this.client.send(command);
  }

  onModuleDestroy() {
    console.log('to be destroyed');
  }
}
