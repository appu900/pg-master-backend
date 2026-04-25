import { IsInt, IsNumber, Min, Max } from 'class-validator';

export class SubmitMainMeterDto {
  @IsNumber()
  @Min(0)
  previousReading!: number;

  @IsNumber()
  @Min(0)
  currentReading!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number; // price per unit in ₹, entered by owner

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2020)
  year!: number;
}
