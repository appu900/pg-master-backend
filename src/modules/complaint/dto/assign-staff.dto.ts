import { IsIn, IsInt, IsNotEmpty } from 'class-validator';

export class assignMaintenanceStaffDto {
  @IsNotEmpty()
  @IsInt()
  complaintId: number;

  @IsNotEmpty()
  @IsInt()
  staffProfileId: number;
}
