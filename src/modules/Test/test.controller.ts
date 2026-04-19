import { InjectQueue } from '@nestjs/bullmq';
import { Body, Injectable, Post, Controller } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from 'src/core/queue/queue.constants';

@Controller('test')
export class TestController {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('notification', {
      connection: {
        host: process.env.REDIS_HOST! || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        tls:{}
      },
    });
  }

  @Post('whatsapp')
  async testWhatsapp(@Body() body: { phone: string }) {
    console.log(body);
    const job = await this.queue.add('send', {
      type: 'TENANT_WELCOME',
      phone: body.phone,
      channels: ['whatsapp'],
      data: {
        tenantName: 'Test User',
        propertyName: 'Test Property',
        appLink: 'https://app.rentpe.com',
        pg_name: 'Test PG',
      },
    });
    return { message: 'job enqueued', job: job.id };
  }
}
