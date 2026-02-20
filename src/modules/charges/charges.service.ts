import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { SqsService } from 'src/infra/Queue/SQS/sqs.service';
import { AddChargeDto } from './dto/add-charge.dto';
import { TenantStatus } from '@prisma/client';

@Injectable()
export class ChargesService {
    private readonly logger = new Logger(ChargesService.name);
    constructor(private readonly prisma:PrismaService,private readonly sqsService:SqsService){}

    async addCharge(ownerId:number,propertyId:number,dto:AddChargeDto){
        const tenancy = await this.prisma.tenancy.findFirst({
            where:{tenentId:dto.tenantId,propertyId:propertyId,status:TenantStatus.ACTIVE},
            select:{
                id:true,
                propertyId:true,
                status:true,
                tenentId:true,
                property:{
                    select:{
                        id:true,
                        ownerId:true,
                    }
                }
            }
        })
        if(!tenancy){throw new NotFoundException("Tenancy not found for this tenant")}
        if(tenancy.property.ownerId !== ownerId){throw new NotFoundException("You don't have permission to add charge for this tenant")}
        
    }
}
