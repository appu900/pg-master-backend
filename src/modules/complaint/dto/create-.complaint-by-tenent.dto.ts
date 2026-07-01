import { MaintenancePriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateComplaintDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  requestedVisitDate?: string;

  @IsOptional()
  @IsString()
  requestedVisitTime?: string;

  @IsEnum(MaintenancePriority)
  @IsNotEmpty()
  priority: MaintenancePriority;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  propertyId?: number;
}
