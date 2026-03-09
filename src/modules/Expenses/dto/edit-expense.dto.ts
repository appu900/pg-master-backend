import { ExpenseCategory, ModeOfPayment } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class EditExpensesDto {
  @IsOptional()
  @IsInt()
  payerUserId?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ExpenseCategory)
  expenseCategory?: ExpenseCategory;

  @IsOptional()
  @IsInt()
  @Type(()=>Number)
  amount?: number;

  @IsEnum(ModeOfPayment)
  @IsOptional()
  modeOfPayment?: ModeOfPayment;

  @IsOptional()
  @IsString()
  payeeName?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsDate()
  @IsOptional()
  paymentDate?: Date;

  @IsOptional()
  @IsInt()
  propertyId?:number;
}
