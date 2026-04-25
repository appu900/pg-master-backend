import { IsInt, IsNumber, Min, Max } from 'class-validator'
 
export class SubmitRoomMeterDto {
  @IsNumber()
  @Min(0)
  previousReading!: number
 
  @IsNumber()
  @Min(0)
  currentReading!: number
 
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number
 
  @IsInt()
  @Min(2020)
  year!: number
}