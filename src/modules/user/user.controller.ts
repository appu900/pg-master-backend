import { ConflictException, Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async fetchAllUsers() {
    return this.userService.getAllUsers();
  }
  @Get('owner/profile')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getProfileOwnerDetails() {
    const userId = 1;
    return this.userService.getPropertyOwnerDetails(userId);
  }
}
