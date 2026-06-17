import { Module } from '@nestjs/common';
import { EntitlementsController } from './entitlements.controller';
import { EntitlementsService } from './entitlements.service';
import { LoggingDashboardGuard } from '../auth/logging-dashboard.guard';

@Module({
  controllers: [EntitlementsController],
  providers: [EntitlementsService, LoggingDashboardGuard],
})
export class EntitlementsModule {}
