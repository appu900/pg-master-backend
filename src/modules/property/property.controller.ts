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
  @UseInterceptors(FilesInterceptor('images'))
  async createRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: AddRoomDto,
    @UploadedFiles() images: Express.Multer.File[],
    @GetUser() user:any
  ) {
    const userId = user.userId;
    if(!userId) throw new BadRequestException();
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
  @UseInterceptors(FilesInterceptor('images'))
  editRoom(
    @Body() dto: editRoomDto,
    @Param('roomId', ParseIntPipe) id: number,
    @GetUser() user: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException();
    return this.propertyService.editRoom(id, dto, userId, files);
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
