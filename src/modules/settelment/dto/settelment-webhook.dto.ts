import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class SettledTransactionDto {
  @IsString()
  txnid: string;

  @IsString()
  easepayid: string;

  @IsString()
  @IsOptional()
  transaction_type?: string;

  @IsNumber()
  transaction_amount: number;

  @IsNumber()
  settlement_amount: number;

  @IsNumber()
  service_charge: number;

  @IsNumber()
  service_tax: number;
}

export class SettlementDataDto {
  @IsString()
  hash: string;

  @IsNumber()
  paid_out: number;

  @IsString()
  @IsOptional()
  bank_name?: string;

  @IsString()
  @IsOptional()
  ifsc_code?: string;

  @IsString()
  payout_id: string;

  @IsString()
  payout_date: string;

  @IsNumber()
  total_amount: number;

  @IsNumber()
  payout_amount: number;

  @IsNumber()
  refund_amount: number;

  @IsNumber()
  service_tax_amount: number;

  @IsNumber()
  service_charge_amount: number;

  @IsString()
  @IsOptional()
  account_number?: string;

  @IsString()
  @IsOptional()
  bank_transaction_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettledTransactionDto)
  settled_transactions: SettledTransactionDto[];
}

export class SettelmentWebhookDto {
  @IsString()
  status: string;

  @ValidateNested()
  @Type(() => SettlementDataDto)
  data: SettlementDataDto;
}
