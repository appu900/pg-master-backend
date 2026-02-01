import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ComplaintCreateByOwnerDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsInt()
  @IsNotEmpty()
  tenantId: number;


  @IsInt()
  @IsNotEmpty()
  propertyId:number;


  @IsString()
  @IsNotEmpty()
  roomNumber:string;

  @IsInt()
  @IsNotEmpty()
  assignedMaintenanceStaffProfileId?: number;
}
