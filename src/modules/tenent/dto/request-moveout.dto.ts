import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsPositive } from 'class-validator';

export class RequestMoveOutDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  propertyId: number;

  @IsDateString()
  requestedMoveOutDate: string;
}
