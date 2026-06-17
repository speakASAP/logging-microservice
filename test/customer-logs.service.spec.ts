import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LogsService } from '../src/logs/logs.service';
import { CustomerLogAccess } from '../src/auth/customer-log-read.guard';

describe('LogsService customer log reads', () => {
  let tempDir: string;
  let service: LogsService;
  const access: CustomerLogAccess = {
    user: { id: 'user-1', roles: ['app:logging-microservice:customer'] },
    tenantIds: ['tenant-a'],
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logging-customer-'));
    process.env.LOG_STORAGE_PATH = tempDir;
    delete process.env.LOGGING_TENANT_PROJECT_MAP;
    delete process.env.LOGGING_TENANT_BUSINESS_MAP;
    service = new LogsService();
  });

  afterEach(() => {
    (service as unknown as { logger?: { close?: () => void } }).logger?.close?.();
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.LOG_STORAGE_PATH;
    delete process.env.LOGGING_TENANT_PROJECT_MAP;
    delete process.env.LOGGING_TENANT_BUSINESS_MAP;
  });

  it('returns only tenant-scoped browser-safe list fields', async () => {
    writeLog('checkout.log', [
      {
        tenant_id: 'tenant-a',
        timestamp: '2026-06-15T12:00:00.000Z',
        level: 'info',
        service: 'checkout',
        message: 'payment ok token=secret-value user test@example.com',
        project_id: 'project-secret',
        correlation_id: 'raw-correlation-id',
        duration_ms: 42,
        metadata: { status: 'ok', secret: 'hidden', customer_id: 'cust-1' },
      },
      {
        tenant_id: 'tenant-b',
        timestamp: '2026-06-15T12:01:00.000Z',
        level: 'error',
        service: 'checkout',
        message: 'other tenant',
        metadata: { status: 'failed' },
      },
    ]);

    const result = await service.queryCustomerLogs(access, { limit: 100 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      level: 'info',
      service: 'checkout',
      duration_ms: 42,
      redaction_status: 'redacted',
    });
    expect(result.items[0].message_preview).toContain('[REDACTED]');
    expect(JSON.stringify(result.items[0])).not.toContain('metadata');
    expect(JSON.stringify(result.items[0])).not.toContain('project-secret');
    expect(JSON.stringify(result.items[0])).not.toContain('raw-correlation-id');
    expect(JSON.stringify(result.items[0])).not.toContain('test@example.com');
  });

  it('supports explicit project-to-tenant mapping without exposing project ids', async () => {
    process.env.LOGGING_TENANT_PROJECT_MAP = JSON.stringify({ 'project-a': 'tenant-a' });
    writeLog('api.log', [
      {
        project_id: 'project-a',
        timestamp: '2026-06-15T12:00:00.000Z',
        level: 'warn',
        service: 'api',
        message: 'mapped project log',
      },
    ]);

    const result = await service.queryCustomerLogs(access, {});

    expect(result.items).toHaveLength(1);
    expect(JSON.stringify(result.items[0])).not.toContain('project-a');
  });

  it('uses newest-first cursor pagination with max limit 100', async () => {
    writeLog('api.log', Array.from({ length: 105 }, (_, index) => ({
      tenant_id: 'tenant-a',
      timestamp: new Date(Date.UTC(2026, 5, 15, 12, index, 0)).toISOString(),
      level: 'info',
      service: 'api',
      message: 'event ' + index,
    })));

    const first = await service.queryCustomerLogs(access, { limit: 200 });
    const second = await service.queryCustomerLogs(access, { limit: 10, cursor: first.next_cursor || undefined });

    expect(first.items).toHaveLength(100);
    expect(first.has_more).toBe(true);
    expect(first.items[0].timestamp > first.items[1].timestamp).toBe(true);
    expect(second.items).toHaveLength(5);
    expect(second.items[0].log_id).not.toBe(first.items[first.items.length - 1].log_id);
  });

  it('returns detail only for a visible tenant log', async () => {
    writeLog('api.log', [
      {
        tenant_id: 'tenant-a',
        timestamp: '2026-06-15T12:00:00.000Z',
        level: 'error',
        service: 'api',
        message: 'failure\n    at internal.host.local/app.js:1',
        metadata: { status: 'failed', auth_header: 'bearer raw' },
      },
      {
        tenant_id: 'tenant-b',
        timestamp: '2026-06-15T12:01:00.000Z',
        level: 'error',
        service: 'api',
        message: 'tenant b failure',
      },
    ]);

    const list = await service.queryCustomerLogs(access, {});
    const detail = await service.getCustomerLogDetail(access, list.items[0].log_id);

    expect(detail?.message_redacted).toContain('[REDACTED_STACK]');
    expect(detail?.safe_context).toEqual({ status: 'failed' });
    expect(JSON.stringify(detail)).not.toContain('auth_header');
    expect(await service.getCustomerLogDetail({ ...access, tenantIds: ['tenant-b'] }, list.items[0].log_id)).toBeNull();
  });

  function writeLog(file: string, entries: Array<Record<string, unknown>>) {
    fs.writeFileSync(
      path.join(tempDir, file),
      entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
      'utf8',
    );
  }
});
