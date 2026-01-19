import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  propertyName: string;


  @IsString()
  @IsNotEmpty()
  pinCode:string;
}
