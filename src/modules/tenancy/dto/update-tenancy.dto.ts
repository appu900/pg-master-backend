import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { RentalType, normalizeRentalType } from './add.tenant.dto';

export class EditTenancyDto {
  @IsOptional()
  @IsString()
  moveoutDate?: string;

  @IsOptional()
  @IsInt()
  rentAmount?: number;

  @IsOptional()
  @IsInt()
  lockInPeriodInMonths?: number;

  @IsOptional()
  @IsInt()
  noticePeriodInDays?: number;

  @IsOptional()
  @IsInt()
  agreementPeriod?: number;

  @IsOptional()
  @Transform(({ value }) => normalizeRentalType(value))
  @IsEnum(RentalType, {
    message: 'rentalType must be Short Term or Long Term',
  })
  rentalType?: RentalType;

  @IsOptional()
  @IsInt()
  agreementPeriodinMonths?: number;
}
