



import { Module } from "@nestjs/common"
import { SettelmentController } from "./settelment.controller";
import { SettelmentService } from "./settelment.service";


@Module({
  imports: [],
  controllers: [SettelmentController],
  providers: [SettelmentService],
  exports: [],
})
export class SettelmentModule{}