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
  SHORT_TERM = 'SHORT_TERM',
  LONG_TERM = 'LONG_TERM',
}

const RENTAL_TYPE_ALIASES: Record<string, RentalType> = {
  'Short Term': RentalType.SHORT_TERM,
  'Short term': RentalType.SHORT_TERM,
  SHORT_TERM: RentalType.SHORT_TERM,
  'Long Term': RentalType.LONG_TERM,
  'Long term': RentalType.LONG_TERM,
  LONG_TERM: RentalType.LONG_TERM,
};

export const normalizeRentalType = (value: unknown): RentalType | undefined => {
  if (value == null || value === '') return undefined;
  const trimmed = String(value).trim();
  return RENTAL_TYPE_ALIASES[trimmed];
};

export class AddTenantDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsNotEmpty()
  gender?: string;

  @IsOptional()
  @IsString()
  pinCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  profession?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  state?: string;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  propertyId!: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  roomId!: number;

  @IsDateString(
    {},
    { message: 'joiningDate must be a valid ISO date (YYYY-MM-DD)' },
  )
  joiningDate!: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'moveOutDate must be a valid ISO date (YYYY-MM-DD)' },
  )
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

  @Transform(({ value }) => normalizeRentalType(value))
  @IsEnum(RentalType, {
    message: 'rentalType must be Short Term or Long Term',
  })
  @IsNotEmpty({ message: 'rentalType is required' })
  rentalType!: RentalType;

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
