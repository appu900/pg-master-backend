import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SettleMentService } from './settelment.service';
import { HttpStatusCode } from 'axios';

@Controller('settlement')
export class SettlementController {
  private readonly logger = new Logger(SettlementController.name);
  constructor(private readonly settlementService: SettleMentService) {}

  @Post('/process-webhook')
  @HttpCode(HttpStatusCode.Ok)
  async reciveWebhookPayload(@Body() body: any) {
    console.log('webhook payload recived', body);
    return await this.settlementService.setWebhookPayload(body);
  }
  
  @Get('/:propertyId')
  @HttpCode(HttpStatusCode.Accepted)
  async getSettlementData(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    if (!propertyId) throw new BadRequestException();
    return this.settlementService.getSettlementByPropertyID(propertyId);
  }
}
