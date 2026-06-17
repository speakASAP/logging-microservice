import { Controller, Get, Param, Query, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { CustomerLogAccess, CustomerLogReadGuard } from '../auth/customer-log-read.guard';
import { LogsService } from './logs.service';

type CustomerLogRequest = Request & {
  customerLogAccess: CustomerLogAccess;
};

@Controller('api/v1/customer/logs')
@UseGuards(CustomerLogReadGuard)
export class CustomerLogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async listLogs(
    @Req() request: CustomerLogRequest,
    @Query('level') level?: string,
    @Query('service') service?: string,
    @Query('start_time') startTime?: string,
    @Query('end_time') endTime?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
  ) {
    return this.logsService.queryCustomerLogs(request.customerLogAccess, {
      level,
      service,
      startTime,
      endTime,
      limit: limit ? Number(limit) : undefined,
      cursor,
      q,
    });
  }

  @Get('facets')
  async getFacets(
    @Req() request: CustomerLogRequest,
    @Query('start_time') startTime?: string,
    @Query('end_time') endTime?: string,
    @Query('q') q?: string,
  ) {
    return this.logsService.getCustomerLogFacets(request.customerLogAccess, {
      startTime,
      endTime,
      q,
    });
  }

  @Get('summary')
  async getSummary(
    @Req() request: CustomerLogRequest,
    @Query('start_time') startTime?: string,
    @Query('end_time') endTime?: string,
    @Query('q') q?: string,
  ) {
    return this.logsService.getCustomerLogSummary(request.customerLogAccess, {
      startTime,
      endTime,
      q,
    });
  }

  @Get(':log_id')
  async getLog(@Req() request: CustomerLogRequest, @Param('log_id') logId: string) {
    const log = await this.logsService.getCustomerLogDetail(request.customerLogAccess, logId);
    if (!log) {
      throw new NotFoundException('Log not found');
    }
    return log;
  }
}
