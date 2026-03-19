import { Module } from '@nestjs/common';
import {EventEmitterModule} from '@nestjs/event-emitter'
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infra/Database/prisma/prisma.module';
import { OtpModule } from './infra/notification/OTP/otp.module';
import { RedisModule } from './infra/redis/redis.module';
import { S3Module } from './infra/s3/s3.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { PropertyModule } from './modules/property/property.module';
import { RoomModule } from './modules/room/room.module';
import { StaffModule } from './modules/staff/staff.module';
import { TenentModule } from './modules/tenent/tenent.module';
import { UserModule } from './modules/user/user.module';
import { PropertyownerModule } from './modules/propertyowner/propertyowner.module';
import { AdminModule } from './modules/admin/admin.module';
import { BanksModule } from './modules/banks/banks.module';
import { SqsModule } from './infra/Queue/SQS/sqs.module';
import { OutboxpollerModule } from './modules/outboxpoller/outboxpoller.module';
import { TenantKycModule } from './modules/TenantKyc/tenantkyc.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { PropertyMatricsController } from './modules/propertyMatrics/propertymatrics.controller';
import { PropertyMatricsModule } from './modules/propertyMatrics/propertymatrics.module';
import { ExpensesModule } from './modules/Expenses/expenses.module';
import { DueModule } from './modules/due/due.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      maxListeners:2,
      verboseMemoryLeak:false,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    SqsModule,
    // OutboxpollerModule,
    PrismaModule,
    RedisModule,
    S3Module,
    AuthModule,
    UserModule,
    OtpModule,
    PropertyModule,
    TenentModule,
    RoomModule,
    StaffModule,
    ComplaintModule,
    PropertyownerModule,
    AdminModule,
    BanksModule,
    OutboxpollerModule,
    TenantKycModule,
    TenancyModule,
    PropertyMatricsModule,
    ExpensesModule,
    DueModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
