/**
 * Logs Controller
 */

import { Controller, Post, Get, Body, Query, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogEntryDto } from './dto/log-entry.dto';
import { AdminRoleGuard, LogReadRoleGuard } from '../auth/admin-role.guard';
import { LogIngestGuard } from '../auth/log-ingest.guard';

@Controller('api/logs')
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Post()
  @UseGuards(LogIngestGuard)
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
  @UseGuards(LogReadRoleGuard)
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
    @Query('correlation_id') correlationId?: string,
    @Query('q') q?: string,
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
        correlationId,
        q,
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

  /**
   * Ingest coverage + staleness (TASK-LOG-004).
   * Returns 503 when a known sender has gone quiet or an expected one never shipped —
   * a degraded pipeline must not report 200.
   */
  @Get('coverage')
  @UseGuards(AdminRoleGuard)
  async getCoverage() {
    let report: Awaited<ReturnType<LogsService['getCoverage']>>;
    try {
      report = await this.logsService.getCoverage();
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to compute log ingest coverage',
          error: error instanceof Error ? error.message : String(error),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!report.healthy) {
      throw new HttpException(
        {
          success: false,
          message: 'Log ingest coverage is degraded',
          data: report,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { success: true, data: report };
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
