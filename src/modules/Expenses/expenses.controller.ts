import { FileInterceptor } from '@nestjs/platform-express';
import { CreateExpensesDto } from './dto/expenses.dto';
import { ExpensesService } from './expenses.service';
import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Param,
  ParseIntPipe,
  BadRequestException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesServices: ExpensesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @UseGuards(JwtAuthGuard)
  async createExpense(
    @Body() dto: CreateExpensesDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.expensesServices.createExpenses(dto, image);
  }





  @Get('/property/:propertyId')
  @UseGuards(JwtAuthGuard,RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async fetchExpensesByPropertyId(@Param('propertyId', ParseIntPipe) propertyId:number){
      if(!propertyId) throw new BadRequestException('property details is required')
      const result = await this.expensesServices.fetchAllExpensesByPropertyId(propertyId)
      return {
        success:true,
        message:"fetched all property expenses details",
        result
      }
  }
}
