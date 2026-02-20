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
