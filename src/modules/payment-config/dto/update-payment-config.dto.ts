import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { GatewayEnvironment } from '@prisma/client';

export class UpdatePaymentConfigDto {
  @IsString()
  @IsOptional()
  merchantKey?: string;

  @IsString()
  @IsOptional()
  merchantSalt?: string;

  @IsEnum(GatewayEnvironment)
  @IsOptional()
  environment?: GatewayEnvironment;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
