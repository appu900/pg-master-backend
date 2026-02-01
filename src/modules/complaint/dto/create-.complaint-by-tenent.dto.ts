import { MaintenancePriority } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
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
  priority: MaintenancePriority;
}
