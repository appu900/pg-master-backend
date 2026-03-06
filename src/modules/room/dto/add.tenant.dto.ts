import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Max,
  Min
} from 'class-validator';

enum RentalType {
  MONTHLY = 'MONTHLY',
  DAILY = 'DAILY',
  PER_BED = 'PER_BED',
  FULL_ROOM = 'FULL_ROOM',
}

export class AddTenantDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;


  @IsString()
  gender: string;


  @IsString()
  profession: string;

  @IsPhoneNumber('IN')
  phoneNumber: string;


  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  pinCode: string;


  @IsString()
  state: string;

  @IsString()
  @IsNotEmpty()
  propertyName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  propertyId: number;

  @IsString()
  @IsNotEmpty()
  roomNo: string;

  @IsNotEmpty()
  @IsString()
  joiningDate: string;

  @IsOptional()
  @IsString()
  moveoutDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  agreementPeriodMonths: number;

  @IsEnum(RentalType)
  rentalType: RentalType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rentPrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  lockinPeriodMonths!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticePeriodInDays!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roomElectricityReading!: number;
}
