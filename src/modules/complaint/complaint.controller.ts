import { Controller,Body,Get,Post, UseGuards, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-.complaint-by-tenent.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { UserRole } from '@prisma/client';


@Controller('complaint')
export class ComplaintController {
    constructor(private readonly complaintService:ComplaintService){}

    @Post('/tenant')
    @Roles(Role.TENANT)
    @UseGuards(JwtAuthGuard,RolesGuard)
    async crateComplaintByTenant(@GetUser() user:any){
         const userId = user.userId;
         if(!userId) throw new UnauthorizedException();     
    }
    
    
}
