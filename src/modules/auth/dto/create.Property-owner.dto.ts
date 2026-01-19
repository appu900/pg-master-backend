import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreatePropertyOwnerDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  pinCode: string;

  @IsOptional()
  @IsString()
  referalCode: string;
}
