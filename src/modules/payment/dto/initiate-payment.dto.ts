import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class PaymentRedirectUrlsDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  successRedirectUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  failureRedirectUrl?: string;
}

export class InitiatePaymentDto extends PaymentRedirectUrlsDto {
  @IsInt()
  @IsPositive()
  dueId!: number;
}

export class DuePaymentDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  dueId!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;
}

export class MakePaymentDto extends PaymentRedirectUrlsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DuePaymentDto)
  dues!: DuePaymentDto[];

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  totalAmount!: number;
}
