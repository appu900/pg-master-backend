import { SettelmentService } from "./settelment.service";
import {Body, Controller, Injectable, Post} from "@nestjs/common"




@Controller('settelment')
export class SettelmentController{
  constructor(private readonly settelmentService: SettelmentService) { }

  @Post("/webhook")
  async settelmentwebhook(@Body() body: any) {
    console.log(body)
  }
}