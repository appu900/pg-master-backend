import { IsOptional, IsString } from 'class-validator';

export class BusinessRejectionReasonDto {
  @IsString()
  @IsOptional()
  description?: string;
}
