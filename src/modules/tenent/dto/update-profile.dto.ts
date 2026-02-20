import {
  IsOptional,
  IsString,
  IsEmail,
  IsPhoneNumber,
  Length,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(Male|Female|Other)$/i, {
    message: 'Gender must be male, female, or other',
  })
  gender?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  profession?: string;

  @IsOptional()
  @IsPhoneNumber('IN', {
    message: 'Phone number must be valid Indian number',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(5, 255)
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[1-9][0-9]{5}$/, {
    message: 'PinCode must be valid 6-digit Indian PIN code',
  })
  pinCode?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  state?: string;
}
