import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class RequestRoomShiftDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  propertyId: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  requestedRoomId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  requestedPropertyId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
