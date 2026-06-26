import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectRoomShiftDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
