import { payeeCategory } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from "class-validator";





export class UpdateBankAccountDto{


    @IsString()
    @IsOptional()
    accountHolderName?:string;

    @IsPhoneNumber()
    @IsOptional()
    phoneNumber?:string;

    @IsEnum(payeeCategory)
    @IsOptional()
    PayeeCategory?:payeeCategory

    @IsString()
    @IsOptional()
    AccountNumber?:string;

    @IsString()
    @IsOptional()
    IFSCcode?:string;

    @IsString()
    @IsOptional()
    UPIid?:string;
}