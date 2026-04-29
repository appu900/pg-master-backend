import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  Patch,
  BadRequestException,
  UnauthorizedException,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateStaffDto } from './dto/create.staff.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { EditStaffAccessDto } from './dto/edit-Staff_Access.dto';
import { EditEmployeeProfileDto } from './dto/edit.staff.profile.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly maintenanceStaffService: StaffService) {}

  @Post('')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addMaintenanceStaff(@Body() dto: CreateStaffDto, @GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException('please login again and try');
    return this.maintenanceStaffService.createMaintenanceStaff(userId, dto);
  }



  @Get('profile/:id')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async getStaffDetails(@Param('id', ParseIntPipe) staffProfileId:number){
      return this.maintenanceStaffService.getStaffDetailsById(staffProfileId)
  }

  @Get('owner')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllMaintenanceStaffOfaOwner(@GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException('please login and try again');
    return this.maintenanceStaffService.getMaintenanceStaffsByOwner(userId);
  }

  @Get('/by/property/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async fetchAllStaffsForProperty(@Param('propertyId',ParseIntPipe) propertyId:number,@GetUser() user:any){
     const ownerId = user.userId;
     if(!ownerId || !propertyId) throw new BadRequestException()
     return this.maintenanceStaffService.fetchAllocatedStaffByPropertyId(propertyId,ownerId)
  }

  @Patch('/property/access')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async editPropertyPermission(@Body() dto:EditStaffAccessDto,@GetUser() user:any){
       const ownerId = user.userId;
       if(!ownerId) throw new UnauthorizedException();
       return this.maintenanceStaffService.editStaffAccess(ownerId,dto)
  }


  @Patch('profile')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard,RolesGuard)
  async editEmpProfile(@Body() dto:EditEmployeeProfileDto,@GetUser() user:any){
      const ownerId = user.userId;
      if(!ownerId) throw new UnauthorizedException();
      return this.maintenanceStaffService.editMaintenanceStaffProfile(dto,ownerId,dto.empProfileId)
  }

  @Get('user/:userId/expenses')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStaffExpenses(@Param('userId', ParseIntPipe) userId: number) {
    return this.maintenanceStaffService.getExpensesByStaffUserId(userId);
  }

  @Get('user/:userId/collections')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getStaffCollections(@Param('userId', ParseIntPipe) userId: number) {
    return this.maintenanceStaffService.getPaymentsCollectedByStaff(userId);
  }

}
