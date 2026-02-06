import { Transform, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class editRoomDto {

  @IsOptional()
  @IsString()
  roomNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  floorNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalBeds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rentPricePerBed?: number;

  @IsOptional()
  @IsString()
  sharingType?: string;

  @IsOptional()
  @Type(() => Date)
  meterReadingDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lastMeterReading?: number;

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
