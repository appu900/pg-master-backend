import { IsDateString, IsNotEmpty } from 'class-validator';

export class MoveOutTenantDto {
  @IsNotEmpty()
  @IsDateString()
  moveOutDate: string;
}
