export const WHATSAPP_TEMPLATES = {
  OTP: {
    templateName: 'oauth_234',

    body: ['otp'] as const,

    buttons: [
      {
        index: 0,
        type: 'url' as const,
        variables: ['otp'] as const,
      },
    ],
  },

  TENANT_WELCOME: {
    templateName: 'tenant_add_notify',
    body: ['tenantName', 'propertyName', 'appLink', 'pg_name'] as const,
  },

  INVOICE_GENERATED: {
    templateName: 'invoice_generated',
    body: ['tenantName', 'amount', 'month', 'dueDate'] as const,
  },

  DUE_REMINDER_3DAYS: {
    templateName: 'due_reminder_3days',
    body: ['tenantName', 'amount', 'dueDate'] as const,
  },

  DUE_REMINDER_TODAY: {
    templateName: 'due_reminder_today',
    body: ['tenantName', 'amount'] as const,
  },

  DUE_OVERDUE: {
    templateName: 'due_overdue',
    body: ['tenantName', 'amount', 'daysOverdue'] as const,
  },

  RENT_REMINDER: {
    templateName: 'rent_reminder',
    body: ['tenantName', 'amount', 'due_date', 'payment_link'] as const,
  },

  PAYMENT_CONFIRMATION: {
    templateName: 'payment_confirmation',
    body: ['tenantName', 'amount', 'paidAt', 'balanceAmount'] as const,
  },

  PAYMENT_PARTIAL: {
    templateName: 'payment_partial',
    body: ['tenantName', 'paidAmount', 'balanceAmount'] as const,
  },

  STAFF_ACCESS: {
    templateName: 'staff_access',
    body: ['staff_name', 'property_name', 'app_link'] as const,
  },

  ADD_DUE_NOTIFY: {
    templateName: 'due_temp3497',
    body: ['tenantName', 'due_type', 'due_amount', 'due_date', 'payment_link'] as const,
  },

  PAYMENT_RECIVED_OWNER: {
    templateName: 'payment_owner',
    body: ['owner_name', 'property_name', 'tenant_name', 'room_number', 'amount'] as const,
  },
} as const;

export type WhatsappTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

type ExtractVars<T> =
  T extends readonly (infer U)[]
    ? U
    : never;

type BodyVars<K extends WhatsappTemplateKey> =
  ExtractVars<(typeof WHATSAPP_TEMPLATES)[K]['body']>;

type ButtonVars<K extends WhatsappTemplateKey> =
  (typeof WHATSAPP_TEMPLATES)[K] extends { buttons: infer B }
    ? B extends readonly any[]
      ? ExtractVars<B[number]['variables']>
      : never
    : never;

export type TemplatePayloadMap = {
  [K in WhatsappTemplateKey]: Record<
    BodyVars<K> | ButtonVars<K>,
    string
  >;
};

export interface ResolvedTemplate {
  templateName: string;
  components: any[];
}


export interface WhatsappNotificationPayload{
    to:string;
    templateKey:WhatsappTemplateKey;
    templateData: TemplatePayloadMap[WhatsappTemplateKey];
    reminderId?:number;
    isReminder?:boolean;
    externalId?:string;
}