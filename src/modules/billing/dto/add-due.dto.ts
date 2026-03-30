import { DueType } from '@prisma/client';
import { IsBoolean, IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class AddDueDto {
  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  @IsNumber()
  @IsNotEmpty()
  propertyId!: number;

  @IsEnum(DueType)
  @IsNotEmpty()
  dueType!: DueType;

  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsDate()
  @IsNotEmpty()
  dueStartDate!: Date;

  @IsDate()
  @IsNotEmpty()
  dueEndDate!: Date;

  @IsBoolean()
  @IsOptional()
  override?:boolean
}
