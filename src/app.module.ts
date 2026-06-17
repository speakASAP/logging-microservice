/**
 * Logging Microservice App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogsModule } from './logs/logs.module';
import { EntitlementsModule } from "./entitlements/entitlements.module";
import { HealthController } from './health/health.controller';
import { InfoController } from './info/info.controller';
import { FrontendController } from './frontend.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    LogsModule,
    EntitlementsModule,
  ],
  controllers: [FrontendController, HealthController, InfoController],
  providers: [],
})
export class AppModule {}
