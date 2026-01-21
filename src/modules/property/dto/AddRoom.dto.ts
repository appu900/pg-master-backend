import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class AddRoomDto {
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @Type(() => Number)
  @IsNumber()
  floorNumber: number;

  @Type(() => Number)
  @IsNumber()
  totalBeds: number;

  @Type(() => Number)
  @IsNumber()
  rentPricePerBed: number;

  @IsString()
  @IsNotEmpty()
  sharingType: string;

  @Type(() => Date)
  @IsDate()
  meterReadingDate: Date;

  @Type(() => Number)
  @IsNumber()
  lastMeterReading: number;

  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value);
    } catch {
      return value?.split(',');
    }
  })
  @IsArray()
  @IsString({ each: true })
  amenity: string[];
}
