import { IsBoolean, IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class assignMaintenanceStaffDto {
  @IsNotEmpty()
  @IsInt()
  complaintId!: number;

  @IsOptional()
  @IsInt()
  staffProfileId?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  assignToSelf?: boolean;
}
