import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { PaymentConfigService } from './payment-config.service';
import { CreatePaymentConfigDto } from './dto/create-payment-config.dto';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';

@Controller('payment-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PaymentConfigController {
  constructor(private readonly paymentConfigService: PaymentConfigService) {}

  @Post('/property/:propertyId')
  async create(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: CreatePaymentConfigDto,
  ) {
    return this.paymentConfigService.create(propertyId, dto);
  }

  @Get('/property/:propertyId')
  async findByProperty(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.paymentConfigService.findByProperty(propertyId);
  }

  @Put('/property/:propertyId')
  async update(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: UpdatePaymentConfigDto,
  ) {
    return this.paymentConfigService.update(propertyId, dto);
  }

  @Get()
  async listAll() {
    return this.paymentConfigService.listAll();
  }
}
