import { IsIn, IsInt, IsNotEmpty } from 'class-validator';

export class LinkBankAccountDto {
  @IsInt()
  @IsNotEmpty()
  bankAccountId!: number;
}
