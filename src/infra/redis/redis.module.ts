
import { Module,Global } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { RedisInitService } from "./redis.init.service";
import { RedisController } from "./redis.controller";

@Global()
@Module({
  imports: [],
  controllers: [RedisController],
  providers: [RedisService,RedisInitService],
  exports: [RedisService,RedisInitService],
})
export class RedisModule {}
