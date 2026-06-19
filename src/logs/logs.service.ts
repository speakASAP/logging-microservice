/**
 * Logs Service
 * Handles log ingestion, storage, and querying
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';
import { CustomerLogAccess } from '../auth/customer-log-read.guard';
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
  'marathon.gift.',
  'marathon.payment_webhook.',
];

const SAFE_MARATHON_EVENT_FIELDS = new Set([
  'amount',
  'status',
  'idempotent',
  'hasOrderId',
  'hasMarathonerId',
  'hasCode',
  'callbackStatus',
  'callbackEvent',
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



type CustomerLogFilters = {
  level?: string;
  service?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  cursor?: string;
  q?: string;
};

type StoredLogEntry = {
  level?: string;
  message?: string;
  service?: string;
  timestamp?: string;
  task_id?: string;
  tenant_id?: string;
  project_id?: string;
  business_id?: string;
  agent_id?: string;
  correlation_id?: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
  [key: string]: unknown;
};

type CustomerLogEntry = {
  raw: StoredLogEntry;
  file: string;
  lineIndex: number;
  log_id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
};

type CustomerLogListItem = {
  log_id: string;
  timestamp: string;
  level: string;
  service: string;
  message_preview: string;
  duration_ms: number | null;
  correlation_ref: string | null;
  redaction_status: 'clean' | 'redacted';
  withheld_field_count: number;
};

type CustomerLogDetail = CustomerLogListItem & {
  message_redacted: string;
  safe_context: Record<string, string | number | boolean>;
  redaction: {
    status: 'clean' | 'redacted';
    withheld_field_count: number;
    policy: string;
  };
};

type CustomerLogListResponse = {
  items: CustomerLogListItem[];
  next_cursor: string | null;
  has_more: boolean;
};

type CustomerLogFacetsResponse = {
  levels: Array<{ value: string; count: number }>;
  services: Array<{ value: string; count: number }>;
};

type CustomerLogSummaryResponse = {
  generated_at: string;
  total: number;
  errors: number;
  warnings: number;
  by_level: Record<string, number>;
  by_service: Record<string, number>;
};

@Injectable()
export class LogsService {
  private logger: winston.Logger;
  private logStoragePath: string;
  private readonly logRotationMaxBytes: number;
  private readonly logRotationMaxFiles: number;

  constructor() {
    this.logStoragePath = process.env.LOG_STORAGE_PATH || './logs';
    this.logRotationMaxBytes = this.parseSizeToBytes(process.env.LOG_ROTATION_MAX_SIZE || '100m');
    this.logRotationMaxFiles = this.parseMaxFiles(process.env.LOG_ROTATION_MAX_FILES || '10');

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
        ...(process.env.NODE_ENV === 'test'
          ? []
          : [
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
            ]),
        // Console output in development
        ...(process.env.NODE_ENV === 'development'
          ? [new winston.transports.Console()]
          : []),
      ],
    });
  }

  private parseSizeToBytes(value: string): number {
    const match = value.trim().match(/^(\d+)([kmg])?$/i);
    if (!match) return 100 * 1024 * 1024;

    const amount = Number(match[1]);
    const unit = (match[2] || '').toLowerCase();
    const multiplier = unit === 'g' ? 1024 ** 3 : unit === 'm' ? 1024 ** 2 : unit === 'k' ? 1024 : 1;
    return amount * multiplier;
  }

  private parseMaxFiles(value: string): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 1 ? parsed : 10;
  }

  private formatDateStamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private appendServiceLog(filePath: string, content: string): void {
    this.rotateServiceLogIfNeeded(filePath, Buffer.byteLength(content, 'utf8'));
    fs.appendFileSync(filePath, content, 'utf8');
  }

  private rotateServiceLogIfNeeded(filePath: string, incomingBytes: number): void {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const stats = fs.statSync(filePath);
    const currentDay = this.formatDateStamp(new Date());
    const fileDay = this.formatDateStamp(stats.mtime);
    const rotateByDay = fileDay != currentDay;
    const rotateBySize = stats.size + incomingBytes > this.logRotationMaxBytes;

    if (!rotateByDay && !rotateBySize) {
      return;
    }

    const archivePath = this.nextArchivePath(filePath, rotateByDay ? fileDay : currentDay);
    fs.renameSync(filePath, archivePath);
    this.pruneServiceLogArchives(filePath);
  }

  private nextArchivePath(filePath: string, dateStamp: string): string {
    const parsed = path.parse(filePath);
    let candidate = path.join(parsed.dir, `${parsed.name}.${dateStamp}${parsed.ext}`);
    let index = 1;

    while (fs.existsSync(candidate)) {
      candidate = path.join(parsed.dir, `${parsed.name}.${dateStamp}.${index}${parsed.ext}`);
      index += 1;
    }

    return candidate;
  }

  private pruneServiceLogArchives(filePath: string): void {
    const parsed = path.parse(filePath);
    const prefix = `${parsed.name}.`;
    const retainedArchiveCount = Math.max(0, this.logRotationMaxFiles - 1);
    const archives = fs.readdirSync(parsed.dir)
      .filter((file) => file.startsWith(prefix) && file.endsWith(parsed.ext))
      .map((file) => ({
        file,
        fullPath: path.join(parsed.dir, file),
        mtimeMs: fs.statSync(path.join(parsed.dir, file)).mtimeMs,
      }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    for (const archive of archives.slice(retainedArchiveCount)) {
      fs.unlinkSync(archive.fullPath);
    }
  }

  private extractServiceNameFromLogFile(file: string): string {
    return file
      .replace(/\.log$/, '')
      .replace(/\.\d{4}-\d{2}-\d{2}(?:\.\d+)?$/, '');
  }

  private listServiceJsonLogFiles(service?: string): Array<{ file: string; filePath: string; service: string }> {
    if (!fs.existsSync(this.logStoragePath)) {
      return [];
    }

    return fs.readdirSync(this.logStoragePath)
      .filter((file) => file.endsWith('.log')
        && !file.startsWith('.')
        && !file.includes('application')
        && !file.includes('error')
        && !file.includes('.human.log'))
      .map((file) => ({
        file,
        filePath: path.join(this.logStoragePath, file),
        service: this.extractServiceNameFromLogFile(file),
      }))
      .filter((entry) => !service || entry.service === service)
      .sort((a, b) => a.file.localeCompare(b.file));
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
        tenant_id: logEntry.tenant_id,
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
        tenant_id: logEntry.tenant_id,
        project_id: logEntry.project_id,
        ...logEntry.metadata,
      });

      const serviceLogPath = path.join(
        this.logStoragePath,
        `${logEntry.service}.log`,
      );
      this.appendServiceLog(
        serviceLogPath,
        JSON.stringify(logData) + '\n',
      );

      const serviceHumanLogPath = path.join(
        this.logStoragePath,
        `${logEntry.service}.human.log`,
      );
      const humanReadable = this.formatHumanReadable(logData);
      this.appendServiceLog(
        serviceHumanLogPath,
        humanReadable + '\n',
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
      const logFiles = this.listServiceJsonLogFiles(filters.service);

      for (const entry of logFiles) {
        const content = fs.readFileSync(entry.filePath, 'utf8');
        const file = entry.file;
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
    const rows: Array<{ timestamp: string; level: string; message: string }> = [];

    for (const serviceLog of this.listServiceJsonLogFiles('marathon')) {
      const content = fs.readFileSync(serviceLog.filePath, 'utf8');
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


  async queryCustomerLogs(access: CustomerLogAccess, filters: CustomerLogFilters = {}): Promise<CustomerLogListResponse> {
    const limit = this.normalizeLimit(filters.limit);
    const cursor = this.decodeCustomerCursor(filters.cursor);
    const entries = this.readCustomerLogEntries(access, filters)
      .sort((a, b) => this.compareCustomerEntriesDesc(a, b));

    const pageWindow = cursor
      ? entries.filter((entry) => this.isAfterCustomerCursor(entry, cursor))
      : entries;
    const page = pageWindow.slice(0, limit + 1);
    const items = page.slice(0, limit).map((entry) => this.toCustomerLogListItem(entry));
    const hasMore = page.length > limit;
    const last = page[Math.min(limit, page.length) - 1];

    return {
      items,
      next_cursor: hasMore && last ? this.encodeCustomerCursor(last) : null,
      has_more: hasMore,
    };
  }

  async getCustomerLogDetail(access: CustomerLogAccess, logId: string): Promise<CustomerLogDetail | null> {
    if (!logId || typeof logId !== 'string') return null;
    const entry = this.readCustomerLogEntries(access, {})
      .find((candidate) => candidate.log_id === logId);
    if (!entry) return null;
    return this.toCustomerLogDetail(entry);
  }

  async getCustomerLogFacets(access: CustomerLogAccess, filters: CustomerLogFilters = {}): Promise<CustomerLogFacetsResponse> {
    const entries = this.readCustomerLogEntries(access, filters);
    const levels = new Map<string, number>();
    const services = new Map<string, number>();

    for (const entry of entries) {
      levels.set(entry.level, (levels.get(entry.level) || 0) + 1);
      services.set(entry.service, (services.get(entry.service) || 0) + 1);
    }

    return {
      levels: Array.from(levels.entries()).sort().map(([value, count]) => ({ value, count })),
      services: Array.from(services.entries()).sort().map(([value, count]) => ({ value, count })),
    };
  }

  async getCustomerLogSummary(access: CustomerLogAccess, filters: CustomerLogFilters = {}): Promise<CustomerLogSummaryResponse> {
    const entries = this.readCustomerLogEntries(access, filters);
    const byLevel = new Map<string, number>();
    const byService = new Map<string, number>();
    let errors = 0;
    let warnings = 0;

    for (const entry of entries) {
      byLevel.set(entry.level, (byLevel.get(entry.level) || 0) + 1);
      byService.set(entry.service, (byService.get(entry.service) || 0) + 1);
      if (entry.level === 'error') errors += 1;
      if (entry.level === 'warn') warnings += 1;
    }

    return {
      generated_at: new Date().toISOString(),
      total: entries.length,
      errors,
      warnings,
      by_level: Object.fromEntries(Array.from(byLevel.entries()).sort()),
      by_service: Object.fromEntries(Array.from(byService.entries()).sort()),
    };
  }

  private readCustomerLogEntries(access: CustomerLogAccess, filters: CustomerLogFilters): CustomerLogEntry[] {
    const entries: CustomerLogEntry[] = [];
    const allowedTenants = new Set(access.tenantIds || []);
    if (allowedTenants.size === 0 || !fs.existsSync(this.logStoragePath)) return entries;

    const logFiles = this.listServiceJsonLogFiles(filters.service);

    for (const entry of logFiles) {
      const content = fs.readFileSync(entry.filePath, 'utf8');
      const lines = content.split('\n');
      const file = entry.file;

      lines.forEach((line, lineIndex) => {
        if (!line.trim()) return;
        try {
          const raw = JSON.parse(line) as StoredLogEntry;
          const tenantId = this.resolveLogTenantId(raw);
          if (!tenantId || !allowedTenants.has(tenantId)) return;
          const entry = this.toCustomerLogEntry(raw, file, lineIndex);
          if (!this.matchesCustomerFilters(entry, filters)) return;
          entries.push(entry);
        } catch {
          return;
        }
      });
    }

    return entries;
  }

  private toCustomerLogEntry(raw: StoredLogEntry, file: string, lineIndex: number): CustomerLogEntry {
    const timestamp = typeof raw.timestamp === 'string' && raw.timestamp ? raw.timestamp : new Date(0).toISOString();
    const level = typeof raw.level === 'string' && raw.level ? raw.level : 'info';
    const service = typeof raw.service === 'string' && raw.service ? raw.service : file.replace(/\.log$/, '');
    const message = typeof raw.message === 'string' ? raw.message : '';
    const idSeed = [file, lineIndex, timestamp, level, service, raw.correlation_id || '', message].join('\u001f');

    return {
      raw,
      file,
      lineIndex,
      log_id: 'log_' + crypto.createHash('sha256').update(idSeed).digest('hex').slice(0, 32),
      timestamp,
      level,
      service,
      message,
    };
  }

  private toCustomerLogListItem(entry: CustomerLogEntry): CustomerLogListItem {
    const redacted = this.redactLogText(entry.message);
    const context = this.buildSafeContext(entry.raw.metadata);
    const withheld = this.countWithheldFields(entry.raw, context.withheldCount, redacted.withheldCount);

    return {
      log_id: entry.log_id,
      timestamp: entry.timestamp,
      level: entry.level,
      service: entry.service,
      message_preview: this.truncate(redacted.value, 240),
      duration_ms: typeof entry.raw.duration_ms === 'number' ? entry.raw.duration_ms : null,
      correlation_ref: this.safeCorrelationRef(entry.raw.correlation_id),
      redaction_status: withheld > 0 || redacted.changed ? 'redacted' : 'clean',
      withheld_field_count: withheld,
    };
  }

  private toCustomerLogDetail(entry: CustomerLogEntry): CustomerLogDetail {
    const listItem = this.toCustomerLogListItem(entry);
    const redacted = this.redactLogText(entry.message);
    const context = this.buildSafeContext(entry.raw.metadata);

    return {
      ...listItem,
      message_redacted: redacted.value,
      safe_context: context.value,
      redaction: {
        status: listItem.redaction_status,
        withheld_field_count: listItem.withheld_field_count,
        policy: 'browser-safe-v1',
      },
    };
  }

  private matchesCustomerFilters(entry: CustomerLogEntry, filters: CustomerLogFilters): boolean {
    const level = filters.level?.trim().toLowerCase();
    if (level && entry.level !== level) return false;

    const service = filters.service?.trim();
    if (service && entry.service !== service) return false;

    const startTime = this.normalizeIsoTime(filters.startTime);
    if (startTime && entry.timestamp < startTime) return false;

    const endTime = this.normalizeIsoTime(filters.endTime);
    if (endTime && entry.timestamp > endTime) return false;

    const q = filters.q?.trim().toLowerCase();
    if (q) {
      const redactedMessage = this.redactLogText(entry.message).value.toLowerCase();
      const safeContext = JSON.stringify(this.buildSafeContext(entry.raw.metadata).value).toLowerCase();
      if (!redactedMessage.includes(q) && !safeContext.includes(q)) return false;
    }

    return true;
  }

  private resolveLogTenantId(entry: StoredLogEntry): string | null {
    const tenantId = this.asNonEmptyString(entry.tenant_id) || this.asNonEmptyString(entry.metadata?.tenant_id);
    if (tenantId) return tenantId;

    const projectTenant = this.resolveTenantFromMap(process.env.LOGGING_TENANT_PROJECT_MAP, entry.project_id || entry.metadata?.project_id);
    if (projectTenant) return projectTenant;

    return this.resolveTenantFromMap(process.env.LOGGING_TENANT_BUSINESS_MAP, entry.business_id || entry.metadata?.business_id);
  }

  private resolveTenantFromMap(rawMap: string | undefined, rawKey: unknown): string | null {
    const key = this.asNonEmptyString(rawKey);
    if (!rawMap || !key) return null;

    try {
      const parsed = JSON.parse(rawMap) as Record<string, unknown>;
      const mapped = parsed[key];
      return this.asNonEmptyString(mapped);
    } catch {
      return null;
    }
  }

  private buildSafeContext(metadata: Record<string, any> | undefined): { value: Record<string, string | number | boolean>; withheldCount: number } {
    const safeKeys = new Set([
      'attempt',
      'component',
      'duration_ms',
      'environment',
      'error_code',
      'event',
      'event_code',
      'http_status',
      'method',
      'operation',
      'retry_count',
      'status',
    ]);
    const value: Record<string, string | number | boolean> = {};
    let withheldCount = 0;

    for (const [key, rawValue] of Object.entries(metadata || {})) {
      if (!safeKeys.has(key)) {
        withheldCount += 1;
        continue;
      }

      if (typeof rawValue === 'string') {
        value[key] = this.truncate(this.redactLogText(rawValue).value, 160);
      } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        value[key] = rawValue;
      } else {
        withheldCount += 1;
      }
    }

    return { value, withheldCount };
  }

  private redactLogText(value: string): { value: string; changed: boolean; withheldCount: number } {
    let result = value || '';
    let withheldCount = 0;
    const apply = (pattern: RegExp, replacement: string) => {
      result = result.replace(pattern, () => {
        withheldCount += 1;
        return replacement;
      });
    };

    apply(/authorization\s*[:=]\s*bearer\s+[^\s,;]+/gi, 'authorization=[REDACTED]');
    apply(/\b(token|secret|password|api[_-]?key|auth[_-]?header)\b\s*[:=]\s*[^\s,;}]+/gi, '$1=[REDACTED]');
    apply(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
    apply(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');
    apply(/\b[a-f0-9]{24,}\b/gi, '[REDACTED_ID]');

    if (/\n\s*at\s+/i.test(result)) {
      result = result.split('\n')[0] + '\n[REDACTED_STACK]';
      withheldCount += 1;
    }

    return { value: result, changed: result !== (value || ''), withheldCount };
  }

  private countWithheldFields(entry: StoredLogEntry, metadataWithheld: number, redactionWithheld: number): number {
    let count = metadataWithheld + redactionWithheld;
    for (const key of ['tenant_id', 'project_id', 'business_id', 'agent_id', 'task_id']) {
      if (this.asNonEmptyString((entry as Record<string, unknown>)[key])) count += 1;
    }
    return count;
  }

  private safeCorrelationRef(correlationId: unknown): string | null {
    const value = this.asNonEmptyString(correlationId);
    if (!value) return null;
    return 'corr_' + crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
  }

  private normalizeLimit(limit: number | undefined): number {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed)) return 50;
    return Math.max(1, Math.min(Math.floor(parsed), 100));
  }

  private normalizeIsoTime(value: string | undefined): string | null {
    if (!value || Number.isNaN(Date.parse(value))) return null;
    return new Date(value).toISOString();
  }

  private encodeCustomerCursor(entry: CustomerLogEntry): string {
    return Buffer.from(JSON.stringify({ timestamp: entry.timestamp, log_id: entry.log_id })).toString('base64url');
  }

  private decodeCustomerCursor(cursor: string | undefined): { timestamp: string; log_id: string } | null {
    if (!cursor) return null;
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { timestamp?: unknown; log_id?: unknown };
      const timestamp = this.asNonEmptyString(decoded.timestamp);
      const logId = this.asNonEmptyString(decoded.log_id);
      if (!timestamp || !logId) return null;
      return { timestamp, log_id: logId };
    } catch {
      return null;
    }
  }

  private isAfterCustomerCursor(entry: CustomerLogEntry, cursor: { timestamp: string; log_id: string }): boolean {
    if (entry.timestamp < cursor.timestamp) return true;
    if (entry.timestamp > cursor.timestamp) return false;
    return entry.log_id < cursor.log_id;
  }

  private compareCustomerEntriesDesc(a: CustomerLogEntry, b: CustomerLogEntry): number {
    const timestampCompare = b.timestamp.localeCompare(a.timestamp);
    if (timestampCompare !== 0) return timestampCompare;
    return b.log_id.localeCompare(a.log_id);
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return value.slice(0, Math.max(0, maxLength - 3)) + '...';
  }

  private asNonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }


  async getServices(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.logStoragePath)) {
        return [];
      }

      return Array.from(new Set(
        this.listServiceJsonLogFiles().map((entry) => entry.service),
      )).sort();
    } catch (error) {
      console.error('Error getting services:', error);
      this.logger.error('Error getting services', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }
}

