import { IsNotEmpty, IsString } from "class-validator";




export class AddLogsDto{

  @IsString()
  @IsNotEmpty()
  title!: string;
}
