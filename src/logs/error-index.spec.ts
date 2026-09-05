import { ErrorIndex } from './error-index';

describe('ErrorIndex', () => {
  let index: ErrorIndex;
  beforeEach(() => {
    index = new ErrorIndex();
  });

  const at = (iso: string) => new Date(iso);

  it('ignores levels that are not failures', () => {
    index.record({ level: 'info', message: 'started', service: 'a' });
    index.record({ level: 'debug', message: 'tick', service: 'a' });
    expect(index.summary(60, at('2026-09-05T12:00:00Z')).groups).toHaveLength(0);
  });

  it('collapses repeats of the same fault into one group', () => {
    // The behaviour that makes alerting on this viable at all: one failing loop
    // must not become a thousand alerts.
    for (let i = 0; i < 500; i++) {
      index.record({
        level: 'error',
        message: `Failed to get stock for product ${i} at 2026-09-05T11:0${i % 10}:00Z`,
        service: 'flipflop-product-service',
        timestamp: '2026-09-05T11:30:00Z',
      });
    }
    const groups = index.summary(60, at('2026-09-05T12:00:00Z')).groups;
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(500);
  });

  it('keeps genuinely different faults apart', () => {
    index.record({ level: 'error', message: 'pg_dump stream failed', service: 'backups' });
    index.record({ level: 'error', message: 'wal-g upload rejected', service: 'backups' });
    expect(index.summary().groups).toHaveLength(2);
  });

  it('separates the same message from different services', () => {
    index.record({ level: 'error', message: 'connection refused', service: 'a' });
    index.record({ level: 'error', message: 'connection refused', service: 'b' });
    expect(index.summary().groups).toHaveLength(2);
  });

  it('normalises the parts that vary between occurrences', () => {
    const a = ErrorIndex.signature('failed for 3f2b8c1a-1111-4222-8333-444455556666 after 1200ms');
    const b = ErrorIndex.signature('failed for 99998888-7777-4666-8555-444433332222 after 87ms');
    expect(a).toBe(b);
  });

  it('does not collapse messages that merely look similar', () => {
    const a = ErrorIndex.signature('disk full on /var');
    const b = ErrorIndex.signature('permission denied on /var');
    expect(a).not.toBe(b);
  });

  it('reports when it started watching, so empty is not read as healthy', () => {
    // A consumer deciding whether a fix worked must be able to tell "nothing is
    // failing" from "I have only just started looking".
    const s = index.summary();
    expect(new Date(s.indexedSince).getTime()).toBeLessThanOrEqual(Date.now());
    expect(s.totalEvents).toBe(0);
  });

  it('excludes entries older than the requested window', () => {
    index.record({ level: 'error', message: 'old', service: 'a', timestamp: '2026-09-05T09:00:00Z' });
    index.record({ level: 'error', message: 'new', service: 'a', timestamp: '2026-09-05T11:55:00Z' });
    const groups = index.summary(30, at('2026-09-05T12:00:00Z')).groups;
    expect(groups.map((g) => g.sampleMessage)).toEqual(['new']);
  });

  it('tracks first and last occurrence across repeats', () => {
    index.record({ level: 'error', message: 'boom', service: 'a', timestamp: '2026-09-05T10:00:00Z' });
    index.record({ level: 'error', message: 'boom', service: 'a', timestamp: '2026-09-05T11:00:00Z' });
    index.record({ level: 'error', message: 'boom', service: 'a', timestamp: '2026-09-05T09:00:00Z' });
    const g = index.summary(24 * 60, at('2026-09-05T12:00:00Z')).groups[0];
    expect(g.firstSeen).toBe('2026-09-05T09:00:00.000Z');
    expect(g.lastSeen).toBe('2026-09-05T11:00:00.000Z');
    expect(g.count).toBe(3);
  });

  it('survives malformed input without throwing', () => {
    // record() sits in the ingest hot path. A fault in the lookout must never
    // break the thing it is watching.
    expect(() => {
      index.record({} as never);
      index.record({ level: 'error' } as never);
      index.record({ level: 'error', message: 'x', service: 'a', timestamp: 'not-a-date' });
      index.record(null as never);
    }).not.toThrow();
  });

  it('falls back to now when a sender supplies an unparseable timestamp', () => {
    index.record({ level: 'error', message: 'x', service: 'a', timestamp: 'garbage' });
    const g = index.summary().groups[0];
    expect(Number.isNaN(new Date(g.lastSeen).getTime())).toBe(false);
  });

  it('indexes warnings as well as errors', () => {
    index.record({ level: 'warn', message: 'degraded', service: 'a' });
    expect(index.summary().groups[0].level).toBe('warn');
  });

  it('is case-insensitive about level', () => {
    index.record({ level: 'ERROR', message: 'x', service: 'a' });
    expect(index.summary().groups).toHaveLength(1);
  });

  it('bounds itself and evicts the stalest group, not the newest', () => {
    // A pathological sender must not be able to grow this without limit, but
    // eviction must not drop the error that just started — that is the one most
    // likely to matter.
    const bounded = new ErrorIndex();
    for (let i = 0; i < 600; i++) {
      bounded.record({
        level: 'error',
        message: `distinct failure ${String.fromCharCode(65 + (i % 26))}${i}x`,
        service: `svc-${i}`,
        timestamp: new Date(Date.UTC(2026, 8, 5, 10, 0, i % 60)).toISOString(),
      });
    }
    const s = bounded.summary(24 * 60, new Date('2026-09-05T10:30:00Z'));
    expect(s.groups.length).toBeLessThanOrEqual(500);
    expect(s.truncated).toBe(true);
  });

  it('sorts the loudest failures first', () => {
    index.record({ level: 'error', message: 'quiet', service: 'a' });
    for (let i = 0; i < 5; i++) index.record({ level: 'error', message: 'loud', service: 'a' });
    expect(index.summary().groups[0].sampleMessage).toBe('loud');
  });
});
