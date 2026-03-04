import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTenantProfileByOwnerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian phone number' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pin code must be 6 digits' })
  pinCode?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
