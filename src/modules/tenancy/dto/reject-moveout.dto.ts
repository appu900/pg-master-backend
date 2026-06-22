import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectMoveOutDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
