import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsNumber,
  IsInt,
  Min,
  Max,
  IsDate,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

enum RentalType {
  MONTHLY = 'MONTHLY',
  DAILY = 'DAILY',
}

export class AddTenantDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  profession?: string;

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

  @Type(() => Date)
  @IsDate()
  joiningDate: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  moveoutDate?: Date;

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
  lockinPeriodMonths: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  noticePeriodInDays: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  roomElectricityReading: number;
}
