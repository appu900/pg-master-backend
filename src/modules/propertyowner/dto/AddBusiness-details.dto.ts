import { BusinessType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString } from 'class-validator';
export class AddBusinessDetails {
  @IsString()
  @IsNotEmpty()
  businessName!: string;

  @IsEnum(BusinessType)
  @IsNotEmpty()
  businessType!: BusinessType;

  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  propertyId!: number;
}
