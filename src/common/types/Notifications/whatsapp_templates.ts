export const WHATSAPP_TEMPLATES = {
  STAFF_ACCESS: {
    name: 'staff_access',
    params: ['name', 'pg_name', 'applink'],
  },
  RENT_REMINDER: {
    name: 'rent_reminder',
    params: ['name', 'amount', 'duedate', 'paylink', 'pgname'],
  },
  ADD_TENANT: {
    name: 'tenant_add_notify',
    params: ['name', 'pgname', 'link', 'pg_name'],
  },
} as const;

export type WhatsappTemplateKey = keyof typeof WHATSAPP_TEMPLATES;

type TemplateParams<T extends readonly string[]> = {
  [K in T[number]]: string;
};

export type TemplatePayloadMap = {
  [K in WhatsappTemplateKey]: TemplateParams<
    (typeof WHATSAPP_TEMPLATES)[K]['params']
  >;
};
