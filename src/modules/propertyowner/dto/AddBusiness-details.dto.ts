import { BusinessType } from '@prisma/client';
import { IsEnum, IsNegative, IsNotEmpty, IsString } from 'class-validator';
import { BusinessApprovalStatus } from '@prisma/client';
export class AddBusinessDetails {
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsEnum(BusinessType)
  @IsNotEmpty()
  businessType!:BusinessType;
}
