import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPassportNumber, IsString } from "class-validator";
import { MaintenanceJobPosition,MaintenanceStaffType } from "@prisma/client";




export class EditEmployeeProfileDto{
    @IsNumber()
    @IsNotEmpty()
    empProfileId:number

    @IsEnum(MaintenanceStaffType)
    @IsOptional()
    staffType:MaintenanceStaffType;

    @IsEnum(MaintenanceJobPosition)
    @IsOptional()
    jobPosition:MaintenanceJobPosition;

    @IsString()
    @IsOptional()
    name:string;

    @IsString()
    @IsOptional()
    phoneNumber:string;
    
    @IsNumber()
    @IsOptional()
    salary:number;

}