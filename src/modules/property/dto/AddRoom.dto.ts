import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { isSetIterator } from 'util/types';

export class AddRoomDto {
  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @Type(() => Number)
  @IsNumber()
  floorNumber!: number;

  @Type(() => Number)
  @IsNumber()
  totalBeds!: number;

  @Type(() => Number)
  @IsNumber()
  rentPricePerBed!: number;

  @IsString()
  @IsNotEmpty()
  sharingType!: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  meterReadingDate?: Date;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lastMeterReading?: number;

  @IsOptional()
  @IsString()
  isAcRoom?:string;

  @IsOptional()
  @IsString()
  hasMeter?:string;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').filter(Boolean);
      }
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  amenity?: string[];
}
