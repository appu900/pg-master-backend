import { IsNotEmpty, IsString } from 'class-validator';

export class OtpLoginDto {
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsString()
  otp:string;
}
