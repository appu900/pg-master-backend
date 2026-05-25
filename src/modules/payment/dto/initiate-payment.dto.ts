import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsPositive, ValidateNested } from 'class-validator';

export class InitiatePaymentDto {
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

export class MakePaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DuePaymentDto)
  dues!: DuePaymentDto[];

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  totalAmount!: number;
}
