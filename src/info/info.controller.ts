/**
 * Info Controller
 * Provides service information and API documentation endpoints
 */

import { Controller, Get } from '@nestjs/common';

@Controller()
export class InfoController {
  @Get()
  getServiceInfo() {
    return {
      service: 'logging-microservice',
      description: 'Centralized logging service for collecting, storing, and querying logs from all microservices',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/health',
        api: '/api/',
        ingest: 'POST /api/logs',
        query: 'GET /api/logs/query',
        services: 'GET /api/logs/services',
      },
      documentation: {
        healthCheck: 'GET /health - Check service health status',
        ingestLog: 'POST /api/logs - Send logs to the service',
        queryLogs: 'GET /api/logs/query - Query logs with filters',
        listServices: 'GET /api/logs/services - List all services that have sent logs',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('api')
  getApiInfo() {
    return {
      success: true,
      service: 'logging-microservice',
      apiVersion: '1.0.0',
      endpoints: [
        {
          method: 'GET',
          path: '/health',
          description: 'Health check endpoint',
          response: {
            success: true,
            status: 'ok',
            timestamp: 'ISO 8601 string',
            service: 'logging-microservice',
          },
        },
        {
          method: 'POST',
          path: '/api/logs',
          description: 'Ingest a log entry',
          contentType: 'application/json',
          requestBody: {
            level: 'error|warn|info|debug (required)',
            message: 'string (required)',
            service: 'string (required)',
            timestamp: 'ISO 8601 string (optional)',
            metadata: 'object (optional)',
          },
          response: {
            success: true,
            message: 'Log ingested successfully',
          },
        },
        {
          method: 'GET',
          path: '/api/logs/query',
          description: 'Query logs with optional filters',
          queryParameters: {
            service: 'string (optional) - Filter by service name',
            level: 'string (optional) - Filter by log level: error, warn, info, debug',
            startDate: 'string (optional) - Start date in ISO 8601 format',
            endDate: 'string (optional) - End date in ISO 8601 format',
            limit: 'number (optional) - Maximum number of logs to return (default: 100)',
          },
          response: {
            success: true,
            data: 'array of log entries',
            count: 'number of logs returned',
          },
        },
        {
          method: 'GET',
          path: '/api/logs/services',
          description: 'List all services that have sent logs',
          response: {
            success: true,
            data: 'array of service names',
            count: 'number of services',
          },
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }
}

