import { IsInt, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  rentalType?: string;

  @IsOptional()
  @IsInt()
  agreementPeriodinMonths?: number;
}
