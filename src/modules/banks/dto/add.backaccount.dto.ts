import { payeeCategory } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class AddBankAccountDto {
  @IsString()
  @IsNotEmpty()
  accountHolderName!: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsEnum(payeeCategory)
  @IsNotEmpty()
  payeeCategory!: payeeCategory;

  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @IsString()
  @IsNotEmpty()
  IFSC_code!: string;

  @IsString()
  @IsNotEmpty()
  upiId!: string;
}

export class AddUPIdetailsDto {
  @IsString()
  @IsNotEmpty()
  accountHolderName!: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsEnum(payeeCategory)
  @IsNotEmpty()
  payeeCategory!: payeeCategory;

  @IsString()
  @IsOptional()
  UPIId?: string;
}
