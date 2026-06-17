import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { LoggingDashboardGuard, LoggingDashboardUser } from '../auth/logging-dashboard.guard';
import { EntitlementsService } from './entitlements.service';

@Controller('api/v1/entitlements')
@UseGuards(LoggingDashboardGuard)
export class EntitlementsController {
  constructor(private readonly entitlementsService: EntitlementsService) {}

  @Get('current')
  getCurrentEntitlement(@Req() request: Request & { user: LoggingDashboardUser }) {
    return this.entitlementsService.getCurrentEntitlement(request.user);
  }
}
