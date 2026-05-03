import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GatewayEnvironment } from '@prisma/client';

export class CreatePaymentConfigDto {
  @IsString()
  @IsNotEmpty()
  merchantKey!: string;

  @IsString()
  @IsNotEmpty()
  merchantSalt!: string;

  @IsEnum(GatewayEnvironment)
  @IsOptional()
  environment?: GatewayEnvironment;
}
