import {
  TemplatePayloadMap,
  WhatsappTemplateKey,
} from '../types/Notifications/whatsapp_templates';
export type WhatsappNotificationPayload<
  K extends WhatsappTemplateKey = WhatsappTemplateKey,
> = {
  channel: 'whatsapp';
  to: string;
  templateKey: K;
  data: TemplatePayloadMap[K];
};
