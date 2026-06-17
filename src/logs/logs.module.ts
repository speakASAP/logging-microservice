/**
 * Logs Module
 */

import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { CustomerLogsController } from './customer-logs.controller';
import { LogsService } from './logs.service';

@Module({
  controllers: [LogsController, CustomerLogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}

