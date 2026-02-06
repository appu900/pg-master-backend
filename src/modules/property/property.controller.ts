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
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddRoomDto } from './dto/AddRoom.dto';
import { CreatePropertyDto } from './dto/create.property.dto';
import { editRoomDto } from './dto/edit.room.dto';
import { PropertyService } from './property.service';

@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

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
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async fetchAllPropertyOfOwner(@GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException();
    return this.propertyService.getPropertiesByPropertyOwner(userId);
  }

  @Post('/:propertyId/room')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FilesInterceptor('images', 10)) // Allow up to 10 images
  async createRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: AddRoomDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user:any
  ) {
    const userId = user.userId;
    if(!userId) throw new BadRequestException('User ID not found');
    
    return this.propertyService.addRooms(Number(userId),propertyId, dto, images);
  }

  @Get('/:propertyId/rooms')
  @UseGuards(JwtAuthGuard)
  async fetchAllRoomsOfProperty(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    return this.propertyService.fetchAllRoomsOfProperty(propertyId);
  }

  @Patch('/room/:roomId/')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  editRoom(
    @Body() dto: editRoomDto,
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException('User ID not found');
    
    return this.propertyService.editRoom(id, dto, userId, files);
  }

  // NOTE: React Native (axios/XHR) can be flaky with multipart PATCH.
  // Provide a PUT alias for the same operation when uploading images.
  @Put('/room/:roomId/')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  editRoomPut(
    @Body() dto: editRoomDto,
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.editRoom(dto, id, user, files);
  }

  @Delete('/room/:roomId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteRoom(
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
  ) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException();
    return this.propertyService.deleteRoom(id, userId);
  }

  @Delete('/room/:roomId/image/:imageId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async deleteRoomImage(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @GetUser() user: any,
  ) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException('User ID not found');
    return this.propertyService.deleteRoomImage(roomId, imageId, userId);
  }

  @Get('/room/:roomId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async GetRoomById(
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
  ) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException();
    return this.propertyService.getRoomDetails(id, userId);
  }
}
