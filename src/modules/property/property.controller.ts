import {
  Controller,
  Body,
  Post,
  Get,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { UserRole } from '@prisma/client';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePropertyDto } from './dto/create.property.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { GetUser } from 'src/common/decorators/Getuser.decorator';

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
  @UseGuards(JwtAuthGuard,RolesGuard)
  async fetchAllPropertyOfOwner(@GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new BadRequestException();
    return this.propertyService.getPropertiesByPropertyOwner(userId);
  }
}
