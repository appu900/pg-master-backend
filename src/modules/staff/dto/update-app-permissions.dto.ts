import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoomsPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
  @IsOptional() @IsBoolean() edit?: boolean;
  @IsOptional() @IsBoolean() delete?: boolean;
}

export class TenantsPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
  @IsOptional() @IsBoolean() add?: boolean;
  @IsOptional() @IsBoolean() edit?: boolean;
  @IsOptional() @IsBoolean() delete?: boolean;
}

export class FinancePermissionsDto {
  @IsOptional() @IsBoolean() viewDues?: boolean;
  @IsOptional() @IsBoolean() editDues?: boolean;
  @IsOptional() @IsBoolean() collectPayments?: boolean;
  @IsOptional() @IsBoolean() viewExpenses?: boolean;
  @IsOptional() @IsBoolean() addExpenses?: boolean;
  @IsOptional() @IsBoolean() deleteDues?: boolean;
  @IsOptional() @IsBoolean() deleteExpenses?: boolean;
}

export class ManageStaffPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
  @IsOptional() @IsBoolean() add?: boolean;
  @IsOptional() @IsBoolean() edit?: boolean;
  @IsOptional() @IsBoolean() delete?: boolean;
}

export class ComplaintsPermissionsDto {
  @IsOptional() @IsBoolean() view?: boolean;
  @IsOptional() @IsBoolean() add?: boolean;
  @IsOptional() @IsBoolean() handle?: boolean;
}

export class GranularPermissionsDto {
  @IsOptional() @IsObject() @ValidateNested() @Type(() => RoomsPermissionsDto)
  rooms?: RoomsPermissionsDto;

  @IsOptional() @IsObject() @ValidateNested() @Type(() => TenantsPermissionsDto)
  tenants?: TenantsPermissionsDto;

  @IsOptional() @IsObject() @ValidateNested() @Type(() => FinancePermissionsDto)
  finance?: FinancePermissionsDto;

  @IsOptional() @IsObject() @ValidateNested() @Type(() => ComplaintsPermissionsDto)
  complaints?: ComplaintsPermissionsDto;

  @IsOptional() @IsObject() @ValidateNested() @Type(() => ManageStaffPermissionsDto)
  manageStaff?: ManageStaffPermissionsDto;
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

  /** When provided, update per-property permissions on MaintenanceStaffPropertyAccess */
  @IsOptional()
  @IsInt()
  @IsPositive()
  propertyId?: number;
}
