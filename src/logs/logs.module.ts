/**
 * Logs Module
 */

import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { CustomerLogsController } from './customer-logs.controller';
import { ErrorIndex } from './error-index';
import { LogsService } from './logs.service';

@Module({
  controllers: [LogsController, CustomerLogsController],
  providers: [ErrorIndex, LogsService],
  exports: [ErrorIndex, LogsService],
})
export class LogsModule {}

