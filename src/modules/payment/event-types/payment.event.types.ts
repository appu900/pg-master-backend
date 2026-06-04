export interface PaymentResultPayload {
  transactionId:string;
  amount: number;
  tenantId: number;
  propertyId: number;
}

export interface AgrregationResult {
  tenantName: string;
  tenatPhoneNumber: string;
  propertyName: string;
}
