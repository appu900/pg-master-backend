import { SettelmentService } from './settelment.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Injectable,
  Post,
} from '@nestjs/common';

@Controller('settelment')
export class SettelmentController {
  constructor(private readonly settelmentService: SettelmentService) {}

  @Post('/webhook')
  @HttpCode(HttpStatus.OK)
  async settelmentwebhook(@Body() body: any) {
    const res = await this.settelmentService.HandleSettelmentwebHook(body);
    return true;
  }
}
