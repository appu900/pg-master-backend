import { Transform, Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';

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
  amenity?: string[];
}
