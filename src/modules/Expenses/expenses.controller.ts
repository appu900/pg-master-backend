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
  BadRequestException,
  Delete,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { Roles } from 'src/common/decorators/roles.decorator';
import { EditExpensesDto } from './dto/edit-expense.dto';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async fetchExpensesByPropertyId(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    if (!propertyId)
      throw new BadRequestException('property details is required');
    const result =
      await this.expensesServices.fetchAllExpensesByPropertyId(propertyId);
    return {
      success: true,
      message: 'fetched all property expenses details',
      result,
    };
  }

  @Delete(':expenseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async deleteExpense(@Param('expenseId', ParseIntPipe) expenseId: number) {
    if (!expenseId) throw new BadRequestException('expense id is required');
    return this.expensesServices.deleteExpenses(expenseId);
  }

  @Put(':expenseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROPERTY_OWNER)
  async updateExpense(
    @Body() dto: EditExpensesDto,
    @Param('expenseId', ParseIntPipe) expenseId: number,
  ) {
    if (!expenseId) throw new BadRequestException('expense id is required');
    return this.expensesServices.editExpenses(expenseId, dto);
  }
}
