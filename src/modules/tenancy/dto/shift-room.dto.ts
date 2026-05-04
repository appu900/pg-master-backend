import { IsInt, IsOptional, Min } from 'class-validator';

export class ShiftRoomDto {
  @IsInt()
  @Min(1)
  tenantId: number;

  @IsInt()
  @Min(1)
  newRoomId: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  newPropertyId?: number;
}
