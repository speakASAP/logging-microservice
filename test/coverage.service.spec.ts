import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LogsService } from '../src/logs/logs.service';

/**
 * Coverage + staleness detection (TASK-LOG-004).
 *
 * Guards the finding that produced this feature: on 2026-07-06 eleven services
 * stopped shipping at once (ingest auth enforced without issuing credentials) and
 * nothing surfaced it for six weeks.
 */
describe('LogsService coverage + staleness', () => {
  let tmpDir: string;
  let service: LogsService;
  const originalEnv = { ...process.env };

  const DAY_MS = 24 * 60 * 60 * 1000;

  /** Write a service log file and backdate its mtime by `ageDays`. */
  const writeServiceLog = (serviceName: string, ageDays: number) => {
    const file = path.join(tmpDir, `${serviceName}.log`);
    fs.writeFileSync(file, JSON.stringify({ service: serviceName, level: 'info' }) + '\n');
    const when = new Date(Date.now() - ageDays * DAY_MS);
    fs.utimesSync(file, when, when);
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logs-coverage-'));
    process.env.NODE_ENV = 'test';
    process.env.LOG_STORAGE_PATH = tmpDir;
    delete process.env.LOG_EXPECTED_SERVICES;
    delete process.env.LOG_STALE_AFTER_HOURS;
    service = new LogsService();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env = { ...originalEnv };
  });

  describe('getCoverage', () => {
    it('reports a service that wrote recently as shipping', async () => {
      writeServiceLog('payments-microservice', 0);

      const coverage = await service.getCoverage();

      expect(coverage.shipping.map((s) => s.service)).toContain('payments-microservice');
      expect(coverage.stale).toHaveLength(0);
    });

    it('flags a known sender that has gone quiet past the threshold as stale', async () => {
      writeServiceLog('payments-microservice', 0);
      writeServiceLog('auth-microservice', 30);

      const coverage = await service.getCoverage();

      const stale = coverage.stale.map((s) => s.service);
      expect(stale).toContain('auth-microservice');
      expect(stale).not.toContain('payments-microservice');
    });

    it('reports last_seen and age for every known sender', async () => {
      writeServiceLog('auth-microservice', 10);

      const coverage = await service.getCoverage();
      const entry = coverage.stale.find((s) => s.service === 'auth-microservice');

      expect(entry).toBeDefined();
      expect(entry!.last_seen).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(entry!.age_hours).toBeGreaterThanOrEqual(240 - 1);
    });

    it('honours LOG_STALE_AFTER_HOURS', async () => {
      writeServiceLog('runlayer', 2);

      process.env.LOG_STALE_AFTER_HOURS = '1';
      expect((await new LogsService().getCoverage()).stale.map((s) => s.service))
        .toContain('runlayer');

      process.env.LOG_STALE_AFTER_HOURS = '999';
      expect((await new LogsService().getCoverage()).stale.map((s) => s.service))
        .not.toContain('runlayer');
    });

    it('lists expected services that have never shipped as missing', async () => {
      writeServiceLog('payments-microservice', 0);
      process.env.LOG_EXPECTED_SERVICES = 'payments-microservice,orders-microservice';

      const coverage = await new LogsService().getCoverage();

      expect(coverage.missing).toContain('orders-microservice');
      expect(coverage.missing).not.toContain('payments-microservice');
    });

    it('counts coverage against the expected set', async () => {
      writeServiceLog('payments-microservice', 0);
      writeServiceLog('auth-microservice', 30);
      process.env.LOG_EXPECTED_SERVICES =
        'payments-microservice,auth-microservice,orders-microservice';

      const coverage = await new LogsService().getCoverage();

      expect(coverage.summary.expected).toBe(3);
      expect(coverage.summary.shipping).toBe(1);
      expect(coverage.summary.stale).toBe(1);
      expect(coverage.summary.missing).toBe(1);
    });

    it('is healthy only when nothing is stale and nothing expected is missing', async () => {
      writeServiceLog('payments-microservice', 0);
      process.env.LOG_EXPECTED_SERVICES = 'payments-microservice';
      expect((await new LogsService().getCoverage()).healthy).toBe(true);

      writeServiceLog('auth-microservice', 30);
      expect((await new LogsService().getCoverage()).healthy).toBe(false);
    });

    it('does not count rotated, human-readable or aggregate files as senders', async () => {
      fs.writeFileSync(path.join(tmpDir, 'application-2026-08-17.log'), '{}\n');
      fs.writeFileSync(path.join(tmpDir, 'error-2026-08-17.log'), '{}\n');
      fs.writeFileSync(path.join(tmpDir, 'payments-microservice.human.log'), 'x\n');
      writeServiceLog('payments-microservice', 0);

      const coverage = await new LogsService().getCoverage();
      const all = [...coverage.shipping, ...coverage.stale].map((s) => s.service);

      expect(all).toEqual(['payments-microservice']);
    });

    // Production has DATED human files (`svc.human.2026-08-16.log`) that the
    // `.human.log` substring filter does not catch. Counting them invented a
    // phantom `svc.human` sender and a false stale entry.
    it('does not count dated human-readable files as separate senders', async () => {
      writeServiceLog('marketing-microservice', 0);
      const dated = path.join(tmpDir, 'marketing-microservice.human.2026-08-16.log');
      fs.writeFileSync(dated, 'x\n');
      const old = new Date(Date.now() - 40 * DAY_MS);
      fs.utimesSync(dated, old, old);
      fs.writeFileSync(path.join(tmpDir, 'speakasap.human.2026-08-16.log'), 'x\n');

      const coverage = await new LogsService().getCoverage();
      const all = [...coverage.shipping, ...coverage.stale].map((s) => s.service);

      expect(all).toEqual(['marketing-microservice']);
      expect(all.some((s) => s.endsWith('.human'))).toBe(false);
      expect(coverage.stale).toHaveLength(0);
    });

    // Regression guard: the 2026-07-06 event. Eleven senders stop the same day.
    it('surfaces a mass simultaneous stoppage', async () => {
      const stopped = [
        'auth-microservice', 'docs-rag-microservice', 'monitoring-microservice',
        'notifications-microservice', 'orders-microservice', 'suppliers-microservice',
        'runlayer', 'flipflop-order-service', 'flipflop-product-service',
      ];
      stopped.forEach((s) => writeServiceLog(s, 42));
      writeServiceLog('speakasap', 0);

      const coverage = await new LogsService().getCoverage();

      expect(coverage.stale).toHaveLength(stopped.length);
      expect(coverage.healthy).toBe(false);
    });

    // Not every quiet sender is broken. `orders`/`suppliers` hold valid credentials
    // and ship only on activity — paging for those trains the alert to be ignored.
    it('excludes ignored services from stale and from health', async () => {
      writeServiceLog('speakasap', 0);
      writeServiceLog('orders-microservice', 40);
      process.env.LOG_IGNORE_STALE_SERVICES = 'orders-microservice';

      const coverage = await new LogsService().getCoverage();

      expect(coverage.stale.map((s) => s.service)).not.toContain('orders-microservice');
      expect(coverage.ignored).toContain('orders-microservice');
      expect(coverage.healthy).toBe(true);
    });

    it('still reports an ignored service in the payload so it is not invisible', async () => {
      writeServiceLog('orders-microservice', 40);
      process.env.LOG_IGNORE_STALE_SERVICES = 'orders-microservice';

      const coverage = await new LogsService().getCoverage();

      expect(coverage.idle.map((s) => s.service)).toContain('orders-microservice');
    });

    it('raises rather than silently returning empty when the log dir is unreadable', async () => {
      process.env.LOG_STORAGE_PATH = path.join(tmpDir, 'does-not-exist');
      const missingDirService = new LogsService();
      fs.rmSync(path.join(tmpDir, 'does-not-exist'), { recursive: true, force: true });

      await expect(missingDirService.getCoverage()).rejects.toThrow();
    });
  });
});
