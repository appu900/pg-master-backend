import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
       log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
      ],
    });
  }
  async onModuleInit() {
    await this.$connect();
    this.$on('query' as never, (e: any) => {
      console.log(`Query: ${e.query} | Duration: ${e.duration}ms`);
    });
    console.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
