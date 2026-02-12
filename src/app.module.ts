import { Module } from '@nestjs/common';
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


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per minute
    }]),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
