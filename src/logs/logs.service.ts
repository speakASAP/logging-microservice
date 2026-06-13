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


type MarathonEventSummaryOptions = {
  windowMinutes?: number;
  limit?: number;
};

type MarathonEventSummaryRow = {
  eventCode: string;
  level: string;
  count: number;
  lastSeenAt: string;
};

const MARATHON_EVENT_PREFIXES = [
  'marathon.registration.',
  'marathon.checkout.',
];

const SAFE_MARATHON_EVENT_FIELDS = new Set([
  'amount',
  'currency',
  'error',
  'hasEmail',
  'hasPhone',
  'hasRedirect',
  'languageCode',
  'method',
  'notificationRequested',
  'paymentErrorCode',
  'paymentErrorMessage',
  'paymentStatus',
  'reason',
  'userBound',
]);

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
      const resolvedMessage = logEntry.message || logEntry.msg || '(no message)';
      const logData = {
        level: logEntry.level,
        message: resolvedMessage,
        service: logEntry.service,
        timestamp: logEntry.timestamp || new Date().toISOString(),
        task_id: logEntry.task_id,
        project_id: logEntry.project_id,
        business_id: logEntry.business_id,
        agent_id: logEntry.agent_id,
        correlation_id: logEntry.correlation_id,
        duration_ms: logEntry.duration_ms,
        metadata: logEntry.metadata || {},
      };

      this.logger.log(logEntry.level, resolvedMessage, {
        service: logEntry.service,
        task_id: logEntry.task_id,
        project_id: logEntry.project_id,
        ...logEntry.metadata,
      });

      const serviceLogPath = path.join(
        this.logStoragePath,
        `${logEntry.service}.log`,
      );
      fs.appendFileSync(
        serviceLogPath,
        JSON.stringify(logData) + '\n',
        'utf8',
      );

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
    taskId?: string;
    projectId?: string;
  }): Promise<any[]> {
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

            if (filters.level && logEntry.level !== filters.level) continue;
            if (filters.startDate && logEntry.timestamp < filters.startDate) continue;
            if (filters.endDate && logEntry.timestamp > filters.endDate) continue;
            if (filters.taskId && logEntry.task_id !== filters.taskId) continue;
            if (filters.projectId && logEntry.project_id !== filters.projectId) continue;

            logs.push(logEntry);

            if (logs.length >= (filters.limit || 100)) break;
          } catch {
            continue;
          }
        }

        if (logs.length >= (filters.limit || 100)) break;
      }
    } catch (error) {
      console.error('Error querying logs:', error);
      this.logger.error('Error querying logs', { error: error instanceof Error ? error.message : String(error) });
    }

    // Sort ascending (oldest first) for timeline rendering
    return logs
      .sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
      .slice(0, filters.limit || 100);
  }


  async getMarathonEventSummary(options: MarathonEventSummaryOptions = {}): Promise<{
    service: string;
    generatedAt: string;
    windowMinutes: number;
    totals: { events: number; errors: number; warnings: number };
    codes: MarathonEventSummaryRow[];
    recent: Array<{ timestamp: string; level: string; eventCode: string; fields: Record<string, string> }>;
  }> {
    const windowMinutes = Math.max(1, Math.min(Number(options.windowMinutes) || 60, 24 * 60));
    const limit = Math.max(1, Math.min(Number(options.limit) || 25, 100));
    const cutoffMs = Date.now() - windowMinutes * 60 * 1000;
    const serviceLogPath = path.join(this.logStoragePath, 'marathon.log');
    const rows: Array<{ timestamp: string; level: string; message: string }> = [];

    if (fs.existsSync(serviceLogPath)) {
      const content = fs.readFileSync(serviceLogPath, 'utf8');
      for (const line of content.split('\n')) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line) as { timestamp?: string; level?: string; message?: string };
          const timestamp = entry.timestamp || '';
          const message = entry.message || '';
          if (!timestamp || Number.isNaN(Date.parse(timestamp)) || Date.parse(timestamp) < cutoffMs) continue;
          if (!MARATHON_EVENT_PREFIXES.some((prefix) => message.startsWith(prefix))) continue;
          rows.push({ timestamp, level: entry.level || 'info', message });
        } catch {
          continue;
        }
      }
    }

    const grouped = new Map<string, MarathonEventSummaryRow>();
    let errors = 0;
    let warnings = 0;

    for (const row of rows) {
      if (row.level === 'error') errors += 1;
      if (row.level === 'warn') warnings += 1;
      const eventCode = this.extractMarathonEventCode(row.message);
      const key = `${eventCode}\t${row.level}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        if (row.timestamp > existing.lastSeenAt) existing.lastSeenAt = row.timestamp;
      } else {
        grouped.set(key, { eventCode, level: row.level, count: 1, lastSeenAt: row.timestamp });
      }
    }

    return {
      service: 'marathon',
      generatedAt: new Date().toISOString(),
      windowMinutes,
      totals: { events: rows.length, errors, warnings },
      codes: Array.from(grouped.values()).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)),
      recent: rows
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, limit)
        .map((row) => ({
          timestamp: row.timestamp,
          level: row.level,
          eventCode: this.extractMarathonEventCode(row.message),
          fields: this.extractSafeMarathonEventFields(row.message),
        })),
    };
  }

  private extractMarathonEventCode(message: string): string {
    return message.split(/\s+/, 1)[0] || 'unknown';
  }

  private extractSafeMarathonEventFields(message: string): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const token of message.split(/\s+/).slice(1)) {
      const separator = token.indexOf('=');
      if (separator <= 0) continue;
      const key = token.slice(0, separator);
      const value = token.slice(separator + 1);
      if (SAFE_MARATHON_EVENT_FIELDS.has(key)) {
        fields[key] = value.slice(0, 160);
      }
    }
    return fields;
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

