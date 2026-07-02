import { IsBoolean, IsInt, IsPositive } from 'class-validator';

export class UpdateStaffAppPermissionsDto {
  @IsInt()
  @IsPositive()
  staffProfileId: number;

  @IsBoolean()
  canAccessRooms: boolean;

  @IsBoolean()
  canAccessTenants: boolean;

  @IsBoolean()
  canAccessFinance: boolean;

  @IsBoolean()
  canAccessComplaints: boolean;

  @IsBoolean()
  canManageStaff: boolean;
}
