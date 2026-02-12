import {
  Controller,
  Body,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BanksService } from './banks.service';
import { AddBankAccountDto, AddUPIdetailsDto } from './dto/add.backaccount.dto';
import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('banks')
export class BanksController {
  constructor(private readonly bankService: BanksService) {}

  @Post('/add')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addAccountDetails(
    @Body() dto: AddBankAccountDto,
    @GetUser() user: any,
  ) {
    const userId = user.userId;
    if (!userId) throw new UnauthorizedException();
    return this.bankService.addBankAccount(userId, dto);
  }

  @Post('/add/upi')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async addUpIAccount(@Body() dto: AddUPIdetailsDto, @GetUser() user: any) {
    const userId = user.userId;
    if (!userId) throw new UnauthorizedException();
    return this.bankService.addUpiId(userId, dto);
  }
}
