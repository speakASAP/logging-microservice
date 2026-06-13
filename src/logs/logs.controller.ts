/**
 * Logs Controller
 */

import { Controller, Post, Get, Body, Query, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogEntryDto } from './dto/log-entry.dto';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('api/logs')
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Post()
  async ingestLog(@Body() logEntryDto: LogEntryDto) {
    try {
      await this.logsService.ingest(logEntryDto);
      return {
        success: true,
        message: 'Log ingested successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to ingest log',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('marathon-events/summary')
  async getMarathonEventsSummary(
    @Query('windowMinutes') windowMinutes?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      return {
        success: true,
        data: await this.logsService.getMarathonEventSummary({
          windowMinutes: windowMinutes ? Number(windowMinutes) : undefined,
          limit: limit ? Number(limit) : undefined,
        }),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to summarize Marathon events',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('query')
  @UseGuards(AdminRoleGuard)
  async queryLogs(
    @Query('service') service?: string,
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
    @Query('task_id') taskId?: string,
    @Query('project_id') projectId?: string,
  ) {
    try {
      const logs = await this.logsService.query({
        service,
        level,
        startDate,
        endDate,
        limit: limit ? Number(limit) : 100,
        taskId,
        projectId,
      });
      return {
        success: true,
        data: logs,
        count: logs.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to query logs',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('services')
  @UseGuards(AdminRoleGuard)
  async getServices() {
    try {
      const services = await this.logsService.getServices();
      return {
        success: true,
        data: services,
        count: services.length,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get services',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
