import { DueType } from '@prisma/client';
import { IsDate, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateDueForRoomDto {
  @IsEnum(DueType)
  @IsNotEmpty()
  dueType!: DueType;

  @IsNumber()
  @IsNotEmpty()
  roomId!: number;

  @IsNumber()
  @IsNotEmpty()
  totalAmount!: number;

  @IsNotEmpty()
  @IsDate()
  DuesFromDate!: Date;

  @IsDate()
  @IsNotEmpty()
  DuesToDate!: Date;
}

export class CreateDueForTenantDto {
  @IsEnum(DueType)
  @IsNotEmpty()
  dueType!: DueType;

  @IsNumber()
  @IsNotEmpty()
  tenantId!: number;

  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsNotEmpty()
  @IsDate()
  DuesFromDate!: Date;

  @IsDate()
  @IsNotEmpty()
  DuesToDate!: Date;
}
