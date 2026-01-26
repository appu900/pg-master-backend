import { IsArray, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateStaffDto {



  @IsString()
  @IsNotEmpty()
  fullName: string;


  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  whatsappNumber: string;

  @IsNumber()
  @IsNotEmpty()
  monthlySalary: number;

  @IsString()
  @IsNotEmpty()
  staffType: string;

  @IsString()
  @IsNotEmpty()
  jobPosition: string;

  @IsString()
  @IsNotEmpty()
  propertyScope: string;

  @IsArray()
  allowedProperties: number[];
}
