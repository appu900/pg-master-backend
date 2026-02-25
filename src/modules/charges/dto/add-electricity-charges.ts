import { IsInt, IsNotEmpty } from 'class-validator';

export class ElectricityChargeDto {
  @IsNotEmpty()
  @IsInt()
  perUnitCost!: number;

  @IsNotEmpty()
  @IsInt()
  currentMeterReading!: number;

  @IsNotEmpty()
  @IsInt()
  roomId!: number;

  @IsNotEmpty()
  @IsInt()
  propertyId!: number;

  @IsNotEmpty()
  @IsInt()
  startDate!: Date;

  @IsNotEmpty()
  @IsInt()
  endDate!: Date;
}
