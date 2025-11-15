/**
 * Logs Service
 * Handles log ingestion, storage, and querying
 */

import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';
import { LogEntryDto, LogLevel } from './dto/log-entry.dto';

@Injectable()
export class LogsService {
  private logger: winston.Logger;
  private logStoragePath: string;

  constructor() {
    this.logStoragePath = process.env.LOG_STORAGE_PATH || './logs';

    // Ensure log directory exists
    if (!fs.existsSync(this.logStoragePath)) {
      fs.mkdirSync(this.logStoragePath, { recursive: true });
    }

    // Configure Winston logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        // Daily rotate file for all logs
        new DailyRotateFile({
          filename: path.join(this.logStoragePath, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: process.env.LOG_ROTATION_MAX_SIZE || '100m',
          maxFiles: process.env.LOG_ROTATION_MAX_FILES || '10',
        }),
        // Separate file for errors
        new DailyRotateFile({
          filename: path.join(this.logStoragePath, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: process.env.LOG_ROTATION_MAX_SIZE || '100m',
          maxFiles: process.env.LOG_ROTATION_MAX_FILES || '10',
        }),
        // Console output in development
        ...(process.env.NODE_ENV === 'development'
          ? [new winston.transports.Console()]
          : []),
      ],
    });
  }

  /**
   * Format log entry as human-readable string
   * Format: [YYYY-MM-DD HH:mm:ss] [LEVEL] [SERVICE] message
   */
  private formatHumanReadable(logData: {
    level: string;
    message: string;
    service: string;
    timestamp: string;
    metadata?: Record<string, any>;
  }): string {
    const timestampFormat = process.env.LOG_TIMESTAMP_FORMAT || 'YYYY-MM-DD HH:mm:ss';
    let formattedTimestamp: string;

    try {
      const date = new Date(logData.timestamp);
      // Format timestamp according to LOG_TIMESTAMP_FORMAT
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      formattedTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch {
      formattedTimestamp = logData.timestamp;
    }

    const levelUpper = logData.level.toUpperCase().padEnd(5);
    const serviceName = logData.service.padEnd(20);

    let humanReadable = `[${formattedTimestamp}] [${levelUpper}] [${serviceName}] ${logData.message}`;

    // Append metadata if present
    if (logData.metadata && Object.keys(logData.metadata).length > 0) {
      const metadataStr = JSON.stringify(logData.metadata);
      humanReadable += ` | ${metadataStr}`;
    }

    return humanReadable;
  }

  async ingest(logEntry: LogEntryDto): Promise<void> {
    try {
      const logData = {
        level: logEntry.level,
        message: logEntry.message,
        service: logEntry.service,
        timestamp: logEntry.timestamp || new Date().toISOString(),
        metadata: logEntry.metadata || {},
      };

      // Write to Winston logger
      this.logger.log(logEntry.level, logEntry.message, {
        service: logEntry.service,
        ...logEntry.metadata,
      });

      // Write JSON format to service-specific file
      const serviceLogPath = path.join(
        this.logStoragePath,
        `${logEntry.service}.log`,
      );
      fs.appendFileSync(
        serviceLogPath,
        JSON.stringify(logData) + '\n',
        'utf8',
      );

      // Write human-readable format to service-specific human-readable file
      const serviceHumanLogPath = path.join(
        this.logStoragePath,
        `${logEntry.service}.human.log`,
      );
      const humanReadable = this.formatHumanReadable(logData);
      fs.appendFileSync(
        serviceHumanLogPath,
        humanReadable + '\n',
        'utf8',
      );
    } catch (error) {
      // Log error to console and Winston, but don't throw to avoid breaking the caller
      console.error('Error ingesting log:', error);
      this.logger.error('Error ingesting log', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  async query(filters: {
    service?: string;
    level?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any[]> {
    // Simple file-based query (can be enhanced with database)
    const logs: any[] = [];

    try {
      const logFiles = fs.readdirSync(this.logStoragePath).filter(
        (file) => file.endsWith('.log') && !file.includes('error') && !file.includes('.human.log'),
      );

      for (const file of logFiles) {
        if (filters.service && !file.includes(filters.service)) {
          continue;
        }

        const filePath = path.join(this.logStoragePath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const logEntry = JSON.parse(line);

            // Apply filters
            if (filters.level && logEntry.level !== filters.level) {
              continue;
            }
            if (filters.startDate && logEntry.timestamp < filters.startDate) {
              continue;
            }
            if (filters.endDate && logEntry.timestamp > filters.endDate) {
              continue;
            }

            logs.push(logEntry);

            if (logs.length >= (filters.limit || 100)) {
              break;
            }
          } catch {
            // Skip invalid JSON lines
            continue;
          }
        }

        if (logs.length >= (filters.limit || 100)) {
          break;
        }
      }
    } catch (error) {
      console.error('Error querying logs:', error);
      this.logger.error('Error querying logs', { error: error instanceof Error ? error.message : String(error) });
    }

    // Sort by timestamp descending
    return logs
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, filters.limit || 100);
  }

  async getServices(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.logStoragePath)) {
        return [];
      }

      const logFiles = fs.readdirSync(this.logStoragePath).filter(
        (file) => file.endsWith('.log') && !file.includes('application') && !file.includes('error') && !file.includes('.human.log'),
      );

      return logFiles.map((file) => file.replace('.log', ''));
    } catch (error) {
      console.error('Error getting services:', error);
      this.logger.error('Error getting services', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}

