import { PropertyAccessScope } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  isNotEmpty,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class EditStaffAccessDto {
  @IsNumber()
  @IsNotEmpty()
  staffProfileId: number;

  @IsArray()
  @IsNotEmpty()
  removedAccessPropetyIds: number[];

  @IsArray()
  @IsNotEmpty()
  newAccessPropertyIds: number[];
}
