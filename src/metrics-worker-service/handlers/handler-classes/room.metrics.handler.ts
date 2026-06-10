import { Logger,Injectable } from "@nestjs/common";
import { PayloadOf } from "src/core/events/app.event.payloads";
import { Appevents } from "src/core/events/app.events";
import { PrismaService } from "src/infra/Database/prisma/prisma.service";
import { RedisService } from "src/infra/redis/redis.service";
import { MetricsHandler } from "../interface/metrics.handler.interface";

@Injectable()
export class RoomMetricsHandler implements MetricsHandler{
    private readonly logger = new Logger(RoomMetricsHandler.name)
    constructor(private readonly prisma:PrismaService,private readonly redis:RedisService){}
    handlerName: string = "ROOM_METRICS_HANDLER"
    supportedEvents: string[] = [
        Appevents.ROOM_CREATED_EVENT,
        Appevents.ROOM_DELETED_EVENT
    ]
    
    private readonly ops:Record<string,(data:any) => Promise<void>> = {
       'room.created':(data) => this.handleRoomCreated(data),
       'room.deleted':(data) => this.handleRoomDeleted(data),
    }


    async handle(eventType:string,data:unknown):Promise<void>{
        await this.ops[eventType]?.(data)
    }

    async handleRoomCreated(data:PayloadOf<'room.created'>){}
    async handleRoomDeleted(data:PayloadOf<'room.deleted'>){}

    

}