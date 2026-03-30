import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  IsPositive,
  Min,
  Max,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';


export enum RentalType {
  PG = 'PG',
  HOSTEL = 'HOSTEL',
  FLAT = 'FLAT',
  BED = 'BED',
  ROOM = 'ROOM',
  OTHER = 'OTHER',
}

export class AddTenantDto {
 

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  // @Matches(/^[6-9]\d{9}$/, { message: 'phoneNumber must be a valid 10-digit Indian mobile number' })
  phoneNumber!: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gender?: string;



  @IsOptional()
  @IsString()
  pinCode?:string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  profession?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  address!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  state!: string;



  @IsInt()
  @IsPositive()
  @Type(() => Number)
  propertyId!: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  roomId!: number;



  @IsDateString({}, { message: 'joiningDate must be a valid ISO date (YYYY-MM-DD)' })
  joiningDate!: string; 

  @IsOptional()
  @IsDateString({}, { message: 'moveOutDate must be a valid ISO date (YYYY-MM-DD)' })
  moveOutDate?: string;

  

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  @Type(() => Number)
  lockInPeriodInMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  @Type(() => Number)
  noticePeriodInDays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  @Type(() => Number)
  agreementPeriodInMonths?: number;

  @IsOptional()
  @IsEnum(RentalType, {
    message: `rentalType must be one of: ${Object.values(RentalType).join(', ')}`,
  })
  rentalType?: RentalType;



  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'rentAmount must be greater than 0' })
  @Type(() => Number)
  rentAmount!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'securityDeposit cannot be negative' })
  @Type(() => Number)
  securityDeposit!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  electricityReading?: number;



  @IsInt({ message: 'rentCycleDay must be an integer' })
  @Min(1, { message: 'rentCycleDay must be between 1 and 28' })
  @Max(28, { message: 'rentCycleDay must be between 1 and 28' })
  @Type(() => Number)
  rentCycleDay!: number; 
}