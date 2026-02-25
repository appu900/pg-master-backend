import { ChargeType } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ChargesType } from 'src/common/enum/charges.enum';

export class AddChargeDto {
  @IsEnum(ChargeType)
  @IsNotEmpty()
  chargeCategory!: ChargesType;

  @IsNotEmpty()
  @IsInt()
  amount!: number;

  @IsOptional()
  @IsInt()
  currentMeterReading?: number;

  @IsOptional()
  @IsInt()
  perUnitCost?: number;

  @IsOptional()
  @IsInt()
  roomId?: number;

  @IsOptional()
  @IsInt()
  tenantId?: number;

  @IsString()
  @IsInt()
  startDate!: Date;

  @IsString()
  @IsNotEmpty()
  endDate!: Date;
}
