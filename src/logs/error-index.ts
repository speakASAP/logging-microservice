import { Injectable } from '@nestjs/common';

/**
 * In-memory index of recent error-level log entries, maintained at ingest.
 *
 * WHY THIS EXISTS RATHER THAN QUERYING THE LOG FILES
 *
 * The obvious way to find recent errors is `/api/logs/query?level=error`. That
 * endpoint reads every file under the log directory with readFileSync and
 * filters in memory. Measured on this host: 4.0 GB across 330 files, ~37
 * seconds per call, and because the read is synchronous it blocks the event
 * loop for the whole duration. During that window /health does not answer, and
 * the liveness probe (30s period, 3 failures, 5s timeout) eventually gives up.
 * Observed directly: a short series of query calls drove the container to exit
 * 137, SIGKILLed by kubelet.
 *
 * So a watcher polling that endpoint on a schedule would restart the logging
 * service repeatedly, taking down ingestion for the whole ecosystem. Alerting
 * built that way would cause a larger outage than the silent failures it exists
 * to surface. That trade is not worth making.
 *
 * Errors already flow through ingest(), one at a time, at a rate the service
 * comfortably handles. Recording them into a bounded structure as they arrive
 * costs a map lookup, and turns "what is failing right now" into an O(1) read
 * with no file access at all.
 *
 * WHAT THIS IS NOT
 *
 * It is not durable and does not try to be. A restart empties it, and it holds
 * only a bounded recent window. That is a real limitation and callers must not
 * mistake an empty index for a healthy ecosystem, so `indexedSince` is exposed:
 * a consumer can tell the difference between "nothing is failing" and "I have
 * only been watching for ten seconds". The file archive remains the durable
 * record; this is a lookout, not a ledger.
 */

/** Levels worth indexing. Anything below this is normal operation. */
const INDEXED_LEVELS = new Set(['error', 'fatal', 'warn']);

/** Distinct signatures retained. Bounded so a pathological sender cannot grow this without limit. */
const MAX_SIGNATURES = Number(process.env.ERROR_INDEX_MAX_SIGNATURES || 500);

/** How long an entry stays in the window. */
const RETENTION_MINUTES = Number(process.env.ERROR_INDEX_RETENTION_MINUTES || 24 * 60);

export interface ErrorGroup {
  service: string;
  level: string;
  signature: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  sampleMessage: string;
}

export interface ErrorSummary {
  generatedAt: string;
  /**
   * When this index started observing. An empty summary means "no errors since
   * this moment", never "no errors ever" — the distinction matters to anything
   * deciding whether a fix worked.
   */
  indexedSince: string;
  windowMinutes: number;
  totalEvents: number;
  groups: ErrorGroup[];
  /** True when signatures were evicted, so counts are a floor rather than exact. */
  truncated: boolean;
}

@Injectable()
export class ErrorIndex {
  private readonly groups = new Map<string, ErrorGroup>();
  private readonly startedAt = new Date();
  private truncated = false;

  /**
   * Collapse a message to something stable across occurrences.
   *
   * Without this, one failing loop produces a thousand distinct "errors" —
   * every UUID, timestamp and port a new identity — and the consumer either
   * sends a thousand alerts or gives up. Numbers, UUIDs, hex blobs, quoted
   * strings and paths are the parts that vary between occurrences of the same
   * fault, so they are replaced rather than kept.
   */
  static signature(message: string): string {
    return (message || '')
      .slice(0, 500)
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
      .replace(/\b[0-9a-f]{16,}\b/gi, '<hash>')
      .replace(/\b\d{4}-\d{2}-\d{2}[T ][\d:.]+Z?\b/g, '<ts>')
      .replace(/"[^"]*"/g, '"<str>"')
      .replace(/'[^']*'/g, "'<str>'")
      .replace(/\/[\w./-]{8,}/g, '<path>')
      // Deliberately not \b\d+\b: a word boundary does not exist between the
      // digits and the unit in "1200ms", so bounded matching leaves exactly the
      // varying part it was meant to remove, and two occurrences of one fault
      // stay separate.
      .replace(/\d+/g, '<n>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
  }

  /**
   * Record one entry. Called from the ingest hot path, so it must not throw and
   * must not do I/O: a fault in the lookout must never break the thing it
   * watches.
   */
  record(entry: {
    level?: string;
    message?: string;
    service?: string;
    timestamp?: string;
  }): void {
    try {
      const level = String(entry.level || '').toLowerCase();
      if (!INDEXED_LEVELS.has(level)) return;

      const service = String(entry.service || 'unknown');
      const message = String(entry.message || '');
      const signature = ErrorIndex.signature(message);
      const key = `${service}|${level}|${signature}`;

      // Prefer the sender's timestamp, but never trust it enough to let a
      // clock-skewed client pin an entry outside the window in either
      // direction.
      const parsed = entry.timestamp ? new Date(entry.timestamp) : new Date();
      const when = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
      const iso = when.toISOString();

      const existing = this.groups.get(key);
      if (existing) {
        existing.count += 1;
        if (iso > existing.lastSeen) existing.lastSeen = iso;
        if (iso < existing.firstSeen) existing.firstSeen = iso;
        return;
      }

      if (this.groups.size >= MAX_SIGNATURES) {
        // Evict the least recently active group rather than refusing to record.
        // Dropping the newest would hide the error that just started, which is
        // the one most likely to matter.
        let oldestKey: string | null = null;
        let oldestSeen = '';
        for (const [k, g] of this.groups) {
          if (!oldestKey || g.lastSeen < oldestSeen) {
            oldestKey = k;
            oldestSeen = g.lastSeen;
          }
        }
        if (oldestKey) this.groups.delete(oldestKey);
        this.truncated = true;
      }

      this.groups.set(key, {
        service,
        level,
        signature,
        count: 1,
        firstSeen: iso,
        lastSeen: iso,
        sampleMessage: message.slice(0, 400),
      });
    } catch {
      // Never propagate into ingest.
    }
  }

  /** Drop anything outside the retention window. */
  private prune(now: Date): void {
    const cutoff = new Date(now.getTime() - RETENTION_MINUTES * 60000).toISOString();
    for (const [k, g] of this.groups) {
      if (g.lastSeen < cutoff) this.groups.delete(k);
    }
  }

  summary(windowMinutes?: number, now: Date = new Date()): ErrorSummary {
    this.prune(now);
    const window = Math.max(1, Math.min(windowMinutes || RETENTION_MINUTES, RETENTION_MINUTES));
    const cutoff = new Date(now.getTime() - window * 60000).toISOString();

    const groups = [...this.groups.values()]
      .filter((g) => g.lastSeen >= cutoff)
      .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen));

    return {
      generatedAt: now.toISOString(),
      indexedSince: this.startedAt.toISOString(),
      windowMinutes: window,
      totalEvents: groups.reduce((sum, g) => sum + g.count, 0),
      groups,
      truncated: this.truncated,
    };
  }
}
