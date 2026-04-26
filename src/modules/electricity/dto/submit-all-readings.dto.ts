import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class MainMeterReadingDto {
  @IsNumber()
  @Min(0)
  previousReading!: number;

  @IsNumber()
  @Min(0)
  currentReading!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class RoomReadingDto {
  @IsInt()
  roomId!: number;

  @IsNumber()
  @Min(0)
  previousReading!: number;

  @IsNumber()
  @Min(0)
  currentReading!: number;
}

export class SubmitAllReadingsDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2020)
  year!: number;

  @ValidateNested()
  @Type(() => MainMeterReadingDto)
  mainMeter!: MainMeterReadingDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomReadingDto)
  rooms!: RoomReadingDto[];
}
