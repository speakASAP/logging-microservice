# Logging Microservice

Centralized structured logging for the ecosystem. All services send logs here.

**Port**: 3367 · **Domain**: https://logging.alfares.cz · **Stack**: NestJS · Winston · Kubernetes `statex-apps`

> This service is a dependency of all other services — API changes require ecosystem-wide review.

→ Technical spec (k8s resources, env vars, Vault secrets): [SYSTEM.md](SYSTEM.md)  
→ Deployment, rollback, secrets, troubleshooting: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## API

### POST /api/logs

```json
// Request body
{
  "level": "error|warn|info|debug",     // required
  "message": "string",                   // required
  "service": "service-name",             // required
  "timestamp": "2024-01-01T00:00:00Z",  // optional (auto-set if omitted)
  "metadata": { "key": "value" }         // optional
}

// 200 OK
{ "success": true, "message": "Log ingested successfully" }

// 400 / 500
{ "success": false, "message": "Failed to ingest log", "error": "..." }
```

All services **must** include `duration_ms` in metadata and log every timeout at `error` level.

### GET /api/logs/query

| Param | Description |
|-------|-------------|
| `service` | Filter by service name |
| `level` | error / warn / info / debug |
| `startDate` | ISO 8601 |
| `endDate` | ISO 8601 |
| `limit` | Max results (default 100) |

```json
// 200 OK
{ "success": true, "data": [...], "count": 1 }
```

### GET /api/logs/services

```json
{ "success": true, "data": ["svc-a", "svc-b"], "count": 2 }
```

### GET /health

```json
{ "success": true, "status": "ok", "timestamp": "...", "service": "logging-microservice" }
```

## Integration

### Service URL

Set `LOGGING_SERVICE_URL` in the calling service's `k8s/configmap.yaml`:

```
# Same namespace (statex-apps) — preferred
http://logging-microservice:3367

# Cross-namespace
http://logging-microservice.statex-apps.svc.cluster.local:3367

# External / non-Kubernetes
https://logging.alfares.cz
```

### TypeScript / NestJS

```typescript
async function sendLog(entry: {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  service: string;
  metadata?: Record<string, unknown>;
}) {
  const url = process.env.LOGGING_SERVICE_URL || 'http://logging-microservice:3367';
  try {
    await fetch(`${url}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    console.error(`[${entry.level}] [${entry.service}] ${entry.message}`, entry.metadata);
  }
}
```

NestJS interceptor (captures `duration_ms` per request):

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const { method, url } = context.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(
      tap(() => sendLog({
        level: 'info',
        message: `${method} ${url}`,
        service: process.env.SERVICE_NAME || 'unknown',
        metadata: { duration_ms: Date.now() - start },
      }))
    );
  }
}
```

### Python

```python
import os, requests
from datetime import datetime, timezone

def send_log(level: str, message: str, service: str, metadata: dict = None) -> None:
    url = os.getenv('LOGGING_SERVICE_URL', 'http://logging-microservice:3367')
    try:
        requests.post(f'{url}/api/logs', json={
            'level': level, 'message': message, 'service': service,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'metadata': metadata or {},
        }, timeout=2)
    except Exception:
        print(f'[{level.upper()}] [{service}] {message}', metadata or {})
```

### Bash

```bash
LOGGING_URL=${LOGGING_SERVICE_URL:-http://logging-microservice:3367}

send_log() {  # send_log level message service
  curl -sf -X POST "${LOGGING_URL}/api/logs" \
    -H 'Content-Type: application/json' \
    -d "{\"level\":\"$1\",\"message\":\"$2\",\"service\":\"$3\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
    >/dev/null || echo "[$1] [$3] $2" >&2
}
```

### Best Practices

- Always include `timestamp` (ISO 8601) and `duration_ms` in metadata
- Log every timeout as `error` level
- Set 1–2 s timeout on the logging call — never block your service on it
- Implement a local fallback (console or file) if this service is unreachable
- Never log passwords, tokens, or PII in metadata
- Levels: `error` = needs action · `warn` = should review · `info` = normal flow · `debug` = verbose

## Log Storage

```
logs/
├── application-YYYY-MM-DD.log   # all logs, daily rotation, JSON
├── error-YYYY-MM-DD.log          # errors only, daily rotation, JSON
├── {service}.log                   # per-service JSON (used by query API)
└── {service}.human.log             # per-service human-readable
```

Human-readable format: `[YYYY-MM-DD HH:mm:ss] [LEVEL] [service] message | metadata`

Rotation: daily, max 100 MB per file, 10 files retained. Logs are on the **pod filesystem (no PVC)** — they are lost on pod restart.

## Local Development

```bash
cp .env.example .env
# Fill dev values (source from Vault: secret/prod/logging-microservice)
docker compose up -d
docker compose logs -f logging-service
```

## Project Structure

```
src/
├── main.ts
├── app.module.ts
├── logs/        # controller, service, dto
└── health/      # health controller
scripts/deploy.sh
k8s/             # kubernetes manifests
docker-compose.yml  # local dev only
Dockerfile
```

## Building & Testing

```bash
npm run build
docker build -t localhost:5000/logging-microservice:latest .
npm test
./scripts/test.sh
```
