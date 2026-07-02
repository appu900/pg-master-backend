import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UPLOAD_FILE_SIZE_LIMITS } from 'src/common/constants/upload.constants';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddRoomDto } from './dto/AddRoom.dto';
import { CreatePropertyDto } from './dto/create.property.dto';
import { editRoomDto } from './dto/edit.room.dto';
import { PropertyService } from './property.service';
import { StaffService } from '../staff/staff.service';

@Controller('property')
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly staffService: StaffService,
  ) {}

  @Post('')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async createProperty(
    @Body() payload: CreatePropertyDto,
    @GetUser() user: any,
  ) {
    return this.propertyService.createProperty(user.userId, payload);
  }

  @Get('owner')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchAllPropertyOfOwner(@GetUser() user: any) {
    let ownerId = user.userId;
    if (!ownerId) throw new BadRequestException();
    if (user.role === Role.MAINTENANCE_STAFF) {
      ownerId = await this.staffService.validateStaffManageStaffModuleAccess(
        user.userId,
        'edit',
      );
    }
    return this.propertyService.getPropertiesByPropertyOwner(ownerId);
  }

  @Post('/:propertyId/room')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async createRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: AddRoomDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user: any,
  ) {
    let effectiveUserId = user.userId;
    if (!effectiveUserId) throw new BadRequestException('User ID not found');
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomsModuleAccess(user.userId, propertyId, 'edit');
      effectiveUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.propertyService.addRooms(effectiveUserId, propertyId, dto, images);
  }

  @Get('/:propertyId/rooms')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchAllRoomsOfProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @GetUser() user: any,
  ) {
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomListAccessForPicker(
        user.userId,
        propertyId,
      );
    }
    return this.propertyService.fetchAllRoomsOfProperty(propertyId);
  }

  @Patch('/room/:roomId/')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  async editRoom(
    @Body() dto: editRoomDto,
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let effectiveUserId = user.userId;
    if (!effectiveUserId) throw new BadRequestException('User ID not found');
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomInventoryAccess(user.userId, id, 'edit');
      effectiveUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.propertyService.editRoom(id, dto, effectiveUserId, files);
  }


  @Put('/room/:roomId/')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, { limits: UPLOAD_FILE_SIZE_LIMITS }),
  )
  editRoomPut(
    @Body() dto: editRoomDto,
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.editRoom(dto, id, user, files);
  }

  @Delete('/room/:roomId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteRoom(
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
  ) {
    if (!user.userId) throw new BadRequestException();
    let effectiveUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomInventoryAccess(user.userId, id, 'delete');
      effectiveUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.propertyService.deleteRoom(id, effectiveUserId);
  }

  @Delete('/room/:roomId/image/:imageId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteRoomImage(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @GetUser() user: any,
  ) {
    if (!user.userId) throw new BadRequestException('User ID not found');
    let effectiveUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomInventoryAccess(user.userId, roomId, 'delete');
      effectiveUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.propertyService.deleteRoomImage(roomId, imageId, effectiveUserId);
  }

  @Get('/room/:roomId')
  @Roles(Role.PROPERTY_OWNER, Role.MAINTENANCE_STAFF)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async GetRoomById(
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
  ) {
    if (!user.userId) throw new BadRequestException();
    let effectiveUserId = user.userId;
    if (user.role === Role.MAINTENANCE_STAFF) {
      await this.staffService.validateStaffRoomInventoryAccess(user.userId, id, 'view');
      effectiveUserId = await this.staffService.resolveOwnerFromStaff(user.userId);
    }
    return this.propertyService.getRoomDetails(id, effectiveUserId);
  }
}
