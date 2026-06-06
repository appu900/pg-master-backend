import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SettelmentService } from './settelment.service';
import { SettelmentWebhookDto } from './dto/settelment-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';

@Controller('settelment')
export class SettelmentController {
  constructor(private readonly settelmentService: SettelmentService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async settelmentwebhook(@Body() body:any) {
    await this.settelmentService.saveToWebhookData(body);
  
  }

  @Get('property/:propertyId')
  @Roles(Role.PROPERTY_OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getPropertySettlements(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.settelmentService.getPropertySettlements(propertyId, month, year);
  }
}
