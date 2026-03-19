import { GetUser } from 'src/common/decorators/Getuser.decorator';
import { DueService } from './due.service';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';


@Controller('dues')
export class DuesController {
  constructor(private readonly dueService: DueService) {}

  @Get('/tenant/:tenantId')
  async fetchTenantDuesByTenancyId(
    @GetUser() user: any,
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.dueService.fetchAllDuesByTenantId(tenantId);
  }
}
