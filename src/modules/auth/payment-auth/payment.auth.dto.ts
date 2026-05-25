import { IsNotEmpty } from 'class-validator';

export class PayUserVerificationDto {
  @IsNotEmpty()
  phoneNumber!: string;
}
