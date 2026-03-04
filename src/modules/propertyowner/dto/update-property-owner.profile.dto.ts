import { IsOptional, IsString, IsBoolean, IsPhoneNumber } from 'class-validator';

export class UpdatePropertyOwnerProfileDto {
  @IsOptional()
  @IsString()
  Gender?: string;

  @IsOptional()
  @IsString()
  Profession?: string;

  @IsOptional()
  @IsString()
  pinCode?: string;

  @IsOptional()
  @IsString()
  State?: string;

  @IsOptional()
  @IsString()
  BusinessName?: string;

  @IsOptional()
  @IsString()
  BusinessType?: string;

  @IsOptional()
  @IsBoolean()
  BusinessProfileStatus?: boolean;

  @IsOptional()
  @IsString()
  fullName?: string;


  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?:string;

  @IsOptional()
  @IsString()
  email?: string;
}
