import { Logger,Injectable, Inject } from "@nestjs/common";
import { IQueueProducer, QUEUE_PRODUCER } from "../ports/queue-producer.port";
import { TenantAddedEvent } from "../events/domain-events";
import { OnEvent } from "@nestjs/event-emitter";
import { QUEUES } from "../queue/queue.constants";

@Injectable()
export class NotificationListner {
    private readonly logger = new Logger(NotificationListner.name);
    constructor(@Inject(QUEUE_PRODUCER) private readonly queue:IQueueProducer){}
    
    @OnEvent('tenant.added')
    async onTenantAdded(event:TenantAddedEvent){
        // await this.queue.enqueue(QUEUES.NOTIFICATION,'')
    }
}