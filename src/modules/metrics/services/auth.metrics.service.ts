import { Logger,Injectable } from "@nestjs/common";
import { RedisService } from "src/infra/redis/redis.service";


@Injectable()
export class AuthMetrics{
    private readonly logger = new Logger(AuthMetrics.name);
    constructor(private readonly redis:RedisService){}


    async getLoginDetailsOfProperty(propertyId:number){
       // to be implemented here ** 
    }
}