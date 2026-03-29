import { Logger,Injectable } from "@nestjs/common";
import { EventEnvelope, IEventStrategy } from "./event-strategy.interface";
import { TemplatePayloadMap, WhatsappTemplateKey } from "src/common/types/Notifications/whatsapp_templates";
import { DOMAIN_EVENTS } from "../../domain-events";
import { NOTIFICATION_JOBS, QUEUES } from "src/infra/queue/queue.constants";

export interface WhatsappNotifyPayload<K extends WhatsappTemplateKey = WhatsappTemplateKey>{
    to:string;
    templateKey:K;
    templateData:TemplatePayloadMap[K];
    reminderId?:number;
    isReminder?:boolean;
    externalId?:string;
}

@Injectable()
export class NotificationEventsStrategy implements IEventStrategy<WhatsappNotifyPayload>{
    private readonly logger = new Logger(NotificationEventsStrategy.name);
    readonly supports = [DOMAIN_EVENTS.NOTIFY_WHATSAPP] as const;
    resolve(_eventName: string, payload:WhatsappNotifyPayload): EventEnvelope<WhatsappNotifyPayload> {
        const jobData:WhatsappNotifyPayload = {
            to: payload.to,
            templateKey: payload.templateKey,
            templateData: payload.templateData,
            reminderId: payload.reminderId,
            isReminder: payload.isReminder,
            externalId:payload.externalId
        }
        return {
            queue:QUEUES.NOTIFICATION,
            jobName:NOTIFICATION_JOBS.SEND_WHATSAPP,
            data: jobData
        }
    }
}