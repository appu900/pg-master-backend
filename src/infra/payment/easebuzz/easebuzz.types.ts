export interface EasebuzzInitiatePayload {
  key: string;
  salt: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  environment: 'TEST' | 'PRODUCTION';
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  udf8?: string;
  udf9?: string;
  udf10?: string;
}

export interface EasebuzzInitiateResponse {
  accessKey: string;
  paymentUrl: string;
}

export interface EasebuzzWebhookPayload {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  status: 'success' | 'failure' | 'userCancelled';
  hash: string;
  easepayid: string;
  payment_source?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  udf8?: string;
  udf9?: string;
  udf10?: string;
  [key: string]: string | undefined;
}