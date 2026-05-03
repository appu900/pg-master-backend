import { IsInt, IsPositive } from 'class-validator';

export class InitiatePaymentDto {
  @IsInt()
  @IsPositive()
  dueId!: number;
}
