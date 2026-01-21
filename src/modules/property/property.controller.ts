import {
  Controller,
  Body,
  Post,
  Get,
  Delete,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  Param,
  ParseIntPipe,
  UploadedFiles,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePropertyDto } from './dto/create.property.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AddRoomDto } from './dto/AddRoom.dto';

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

  @Post('/room/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FilesInterceptor('images'))
  async createRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: AddRoomDto,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    return this.propertyService.addRooms(propertyId, dto, images);
  }

  @Get('/room/:propertyId')
  @UseGuards(JwtAuthGuard)
  async fetchAllRoomsOfProperty(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.propertyService.fetchAllRoomsOfProperty(propertyId)
  }
}
