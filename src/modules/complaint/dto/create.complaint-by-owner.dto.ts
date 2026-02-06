import { ComplaintStatus } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ComplaintCreateByOwnerDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  tenantId: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  propertyId: number;

  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @IsEnum(ComplaintStatus)
  @IsNotEmpty()
  status: ComplaintStatus;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  assignedMaintenanceStaffProfileId?: number;
}
