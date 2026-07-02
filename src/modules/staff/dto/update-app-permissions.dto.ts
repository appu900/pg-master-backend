import { IsBoolean, IsInt, IsObject, IsOptional, IsPositive, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RoomsPermissionsDto {
  @IsBoolean() view: boolean;
  @IsBoolean() edit: boolean;
}

export class TenantsPermissionsDto {
  @IsBoolean() view: boolean;
  @IsBoolean() add: boolean;
  @IsBoolean() edit: boolean;
}

export class FinancePermissionsDto {
  @IsBoolean() viewDues: boolean;
  @IsBoolean() collectPayments: boolean;
  @IsBoolean() viewExpenses: boolean;
  @IsBoolean() addExpenses: boolean;
}

export class ComplaintsPermissionsDto {
  @IsBoolean() view: boolean;
  @IsBoolean() add: boolean;
  @IsBoolean() handle: boolean;
}

export class GranularPermissionsDto {
  @IsObject() @ValidateNested() @Type(() => RoomsPermissionsDto)
  rooms: RoomsPermissionsDto;

  @IsObject() @ValidateNested() @Type(() => TenantsPermissionsDto)
  tenants: TenantsPermissionsDto;

  @IsObject() @ValidateNested() @Type(() => FinancePermissionsDto)
  finance: FinancePermissionsDto;

  @IsObject() @ValidateNested() @Type(() => ComplaintsPermissionsDto)
  complaints: ComplaintsPermissionsDto;
}

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

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GranularPermissionsDto)
  granularPermissions?: GranularPermissionsDto;
}
