import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {ConfigModule} from "@nestjs/config"
import { PrismaModule } from './infra/Database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RedisModule } from './infra/redis/redis.module';
import { OtpModule } from './infra/notification/OTP/otp.module';


@Module({
  imports: [
    ConfigModule.forRoot({isGlobal:true}),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    OtpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
