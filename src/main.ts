/**
 * Logging Microservice Main Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Enable CORS
    const corsOrigin = process.env.CORS_ORIGIN || '*';
    app.enableCors({
      origin: corsOrigin === '*' ? true : corsOrigin.split(','),
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    const port = process.env.PORT || 3009;
    const nodeEnv = process.env.NODE_ENV || 'development';
    const logStoragePath = process.env.LOG_STORAGE_PATH || './logs';

    await app.listen(port);

    console.log('========================================');
    console.log('Logging Microservice Started');
    console.log('========================================');
    console.log(`Environment: ${nodeEnv}`);
    console.log(`Port: ${port}`);
    console.log(`CORS Origin: ${corsOrigin}`);
    console.log(`Log Storage: ${logStoragePath}`);
    console.log(`Health Check: http://localhost:${port}/health`);
    console.log(`API Endpoint: http://localhost:${port}/api/logs`);
    console.log('========================================');
  } catch (error) {
    console.error('Failed to start Logging Microservice:', error);
    process.exit(1);
  }
}

bootstrap();
