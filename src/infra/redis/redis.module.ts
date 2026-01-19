
import { Module,Global } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { RedisInitService } from "./redis.init.service";

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [RedisService,RedisInitService],
  exports: [RedisService,RedisInitService],
})
export class RedisModule {}
