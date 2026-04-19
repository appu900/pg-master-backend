import { Inject, Logger,Injectable } from "@nestjs/common";
import { IQueueProducer, QUEUE_PRODUCER } from "../ports/queue-producer.port";
import { OnEvent } from "@nestjs/event-emitter";
import { RoomCreatedEvent } from "../events/metrics.events";
import { QUEUES } from "../queue/queue.constants";

@Injectable()
export class MetricsListner {
    private readonly logger = new Logger(MetricsListner.name);
    constructor(@Inject(QUEUE_PRODUCER) private readonly queue:IQueueProducer){}

    @OnEvent('room.created')
    async onRoomCreated(event:RoomCreatedEvent){
        await this.queue.enqueue(QUEUES.METRICS,'room-created',{
            roomId:event.roomId,
            propertyId:event.propertyId,
            ownerId:event.ownerId,
            month:event.month,
            year:event.year
        },{jobId:`metrics-room-added-${event.roomId}`})
    }
}