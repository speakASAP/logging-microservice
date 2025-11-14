/**
 * Logs Controller
 */

import { Controller, Post, Get, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { LogsService } from './logs.service';
import { LogEntryDto } from './dto/log-entry.dto';

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

  @Get('query')
  async queryLogs(
    @Query('service') service?: string,
    @Query('level') level?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    try {
      const logs = await this.logsService.query({
        service,
        level,
        startDate,
        endDate,
        limit: limit ? Number(limit) : 100,
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
