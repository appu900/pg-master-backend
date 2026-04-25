import { DueType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class EditDueDto {
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  fromDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  toDate?: Date;

  @IsNumber()
  @IsOptional()
  dueAmount?: number;

  @IsEnum(DueType)
  @IsOptional()
  dueType?: DueType;
}
