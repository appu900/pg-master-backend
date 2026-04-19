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
  meterReadingDate!: Date;

  @Type(() => Number)
  @IsNumber()
  lastMeterReading!: number;

  @IsOptional()
  @IsBoolean()
  isAcRoom?: boolean;

  @IsOptional()
  @IsBoolean()
  hasMeter?: boolean;

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
