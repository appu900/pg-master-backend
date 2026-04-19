import { Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";



interface TenantAddedEvent{

}

export class TenancyEvents {
    private readonly logger = new Logger(TenancyEvents.name)
    constructor(private readonly eventBus:EventEmitter2){}

}