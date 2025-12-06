/**
 * Logging Microservice App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogsModule } from './logs/logs.module';
import { HealthController } from './health/health.controller';
import { InfoController } from './info/info.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    LogsModule,
  ],
  controllers: [HealthController, InfoController],
  providers: [],
})
export class AppModule {}
