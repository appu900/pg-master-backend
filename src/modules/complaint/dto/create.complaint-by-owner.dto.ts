import { ComplaintStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ComplaintCreateByOwnerDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  tenantId?: number;

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  propertyId: number;

  @IsString()
  @IsOptional()
  roomNumber?: string;

  @IsEnum(ComplaintStatus)
  @IsNotEmpty()
  status: ComplaintStatus;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  assignedMaintenanceStaffProfileId?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  assignToSelf?: boolean;
}
