import { ExpenseCategory, ModeOfPayment } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateExpensesDto {
  @IsNotEmpty()
  @IsInt()
  payerUserId!: number;

  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsNotEmpty()
  @IsEnum(ExpenseCategory)
  expenseCategory!: ExpenseCategory;

  @IsNotEmpty()
  @IsInt()
  @Type(()=>Number)
  amount!: number;

  @IsEnum(ModeOfPayment)
  @IsNotEmpty()
  modeOfPayment!: ModeOfPayment;

  @IsNotEmpty()
  @IsString()
  payeeName!: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsDate()
  @IsNotEmpty()
  paymentDate!: Date;



  @IsNotEmpty()
  @IsInt()
  propertyId!:number;
}
