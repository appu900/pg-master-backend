import { Logger,Injectable } from "@nestjs/common";
import { RedisService } from "src/infra/redis/redis.service";


@Injectable()
export class TenancyCachingService{
    private readonly logger = new Logger(TenancyCachingService.name)
    constructor(private readonly redis:RedisService){}

    async cacheTenancyDetails(){

    }
}