import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { LateFeeType } from '@prisma/client';

export class UpsertLateFineDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsEnum(LateFeeType)
  @IsOptional()
  fineType?: LateFeeType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  fineAmount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  gracePeriod?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxFineAmount?: number;
}
