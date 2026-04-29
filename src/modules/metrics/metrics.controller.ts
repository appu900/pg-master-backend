import { Controller, Param, ParseIntPipe, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('property/:propertyId')
  async getPropertyDashBoardMetrics(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const previosMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [currentMonthStats, previosMonthStats] = await Promise.all([
      this.metricsService.getPropertyDashBoard(
        propertyId,
        currentMonth,
        currentYear,
      ),
      this.metricsService.getPropertyDashBoard(
        propertyId,
        previosMonth,
        previousYear,
      ),
    ]);
    return {
      message: 'stats fetched sucessfully',
      currentMonthStats,
      previosMonthStats,
    };
  }

  // Total expenses for current and previous month/year, property-wise and overall
  @Get('owner/:ownerId/expenses')
  async getExpensesSummary(@Param('ownerId', ParseIntPipe) ownerId: number) {
    const data = await this.metricsService.getExpensesSummary(ownerId);
    return { message: 'Expenses summary fetched successfully', data };
  }

  // Total dues and collections for current and previous month across all owner properties
  @Get('owner/:ownerId/dues-summary')
  async getDuesSummary(@Param('ownerId', ParseIntPipe) ownerId: number) {
    const data = await this.metricsService.getDuesSummary(ownerId);
    return { message: 'Dues summary fetched successfully', data };
  }

  // Tenant rent payment status for the current month (paid vs not paid)
  @Get('owner/:ownerId/rent-payment-status')
  async getRentPaymentStatus(
    @Param('ownerId', ParseIntPipe) ownerId: number,
  ) {
    const data = await this.metricsService.getRentPaymentStatus(ownerId);
    return { message: 'Rent payment status fetched successfully', data };
  }

  // Total complaints — resolved vs unresolved across all owner properties
  @Get('owner/:ownerId/complaints')
  async getComplaintsSummary(
    @Param('ownerId', ParseIntPipe) ownerId: number,
  ) {
    const data = await this.metricsService.getComplaintsSummary(ownerId);
    return { message: 'Complaints summary fetched successfully', data };
  }

  // Pending security deposits for a specific property
  @Get('property/:propertyId/security-deposits')
  async getSecurityDepositsPending(
    @Param('propertyId', ParseIntPipe) propertyId: number,
  ) {
    const data =
      await this.metricsService.getSecurityDepositsPending(propertyId);
    return { message: 'Security deposits fetched successfully', data };
  }
}
