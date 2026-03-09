import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/infra/Database/prisma/prisma.service';
import { S3Service } from 'src/infra/s3/s3.service';
import { CreateExpensesDto } from './dto/expenses.dto';
import { executionAsyncId } from 'async_hooks';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async createExpenses(dto: CreateExpensesDto, image?: Express.Multer.File) {
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) throw new NotFoundException('property not found');
    let imageurl: string | null = null;
    if (image) {
      imageurl = await this.s3.uploadFile(image, 'expenses');
    }
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const expenses = await this.prisma.expenses.create({
      data: {
        propertyId: dto.propertyId,
        expenseCategory: dto.expenseCategory,
        image: imageurl,
        modeOfPayment: dto.modeOfPayment,
        transactionId: dto.transactionId,
        paymentDate: dto.paymentDate,
        payerUserId: dto.payerUserId,
        RecipientName: dto.payeeName,
        month: currentMonth,
        year: currentYear,
        description: dto.description,
        amount:dto.amount
      },
    });
    return expenses;
  }

  async fetchAllExpensesByPropertyId(propertyId: number) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear = currentYear - 1;
    }

    const expenses = await this.prisma.expenses.findMany({
      where: {
        propertyId: propertyId,
        OR: [
          { year: currentYear, month: currentMonth },
          { year: previousYear, month: previousMonth },
        ],
      },
      select: {
        id: true,
        propertyId: true,
        month: true,
        year: true,
        amount: true,
        description: true,
        expenseCategory: true,
        modeOfPayment: true,
        transactionId: true,
        paymentDate: true,
        image: true,
        payer: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    let TotalcurrentMonthExpenses = 0;
    let TotalpreviousMonthExpenses = 0;
    for (const expense of expenses) {
      if (expense.month === currentMonth && expense.year === currentYear) {
        TotalcurrentMonthExpenses+= expense.amount.toNumber();
      }
      if(expense.month === previousMonth && expense.year === previousYear){
        TotalpreviousMonthExpenses += expense.amount.toNumber()
      }
    }
    return {
       TotalcurrentMonthExpenses,
       TotalpreviousMonthExpenses,
       expenses
    }
  }
}
