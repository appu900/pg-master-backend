import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['error'],
    });
  }
  async onModuleInit() {
    await this.$connect();
    console.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
