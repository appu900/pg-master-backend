import { PaymentMode, UpiApp } from '@prisma/client';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CollectDueDto {
  @IsNumber()
  @IsPositive()
  dueId!: number;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsDate()
  @Type(() => Date)
  paidAt!: Date;

  @IsEnum(PaymentMode)
  paymentMode!: PaymentMode;

  @ValidateIf((o) => o.paymentMode === PaymentMode.UPI)
  @IsEnum(UpiApp)
  upiApp?: UpiApp;

  // UPI: transaction id | BANK_TRANSFER: UTR number | CHEQUE: cheque number
  @ValidateIf(
    (o) =>
      o.paymentMode === PaymentMode.UPI ||
      o.paymentMode === PaymentMode.BANK_TRANSFER ||
      o.paymentMode === PaymentMode.CHEQUE,
  )
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  proofImageUrl?: string;
}
