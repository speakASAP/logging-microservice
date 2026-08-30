# Logging Microservice

Centralized structured logging for the ecosystem. All services send logs here.

**Port**: 3367 · **Domain**: https://logging.alfares.cz · **Stack**: NestJS · Winston · Kubernetes `statex-apps`

> This service is a dependency of all other services — API changes require ecosystem-wide review.

→ Technical spec (k8s resources, env vars, Vault secrets): [SYSTEM.md](SYSTEM.md)  
→ Deployment, rollback, secrets, troubleshooting: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Status

Production, actively deployed to Kubernetes namespace `statex-apps`. Depended on by every other ecosystem service via `LOGGING_SERVICE_URL`.

## Documentation Authority

`BUSINESS.md` (human-owned business intent) and `SYSTEM.md` (technical spec) are authoritative for this service. This README summarizes usage; see `docs/00_constitution/CONSTITUTION.md` and `docs/01_vision/VISION.md` for the approved IPS baseline.

## Capabilities

- Structured log ingestion (`POST /api/logs`) with required `timestamp` and `duration_ms` tracking.
- Admin-authorized log query and known-service listing.
- `GET /health` for Kubernetes liveness/readiness probes.
- Daily-rotated, file-based log storage on a Kubernetes PVC.

## Configuration

Non-secret configuration is set via the `logging-microservice-config` ConfigMap (`NODE_ENV`, `SERVICE_NAME`, `PORT`, `LOG_LEVEL`, `LOG_STORAGE_PATH`, `LOG_ROTATION_MAX_SIZE`, `LOG_ROTATION_MAX_FILES`, `LOG_TIMESTAMP_FORMAT`, `CORS_ORIGIN`, `AUTH_SERVICE_URL`, `PAYMENT_SERVICE_URL`). Secrets are delivered via Vault -> ExternalSecret -> Kubernetes Secret at `secret/prod/logging-microservice`. See `SYSTEM.md` for the full table.

## Deployment

Deployed to the `statex-apps` namespace via the shared serialized deploy runner (`scripts/deploy.sh`), image `localhost:5000/logging-microservice:latest`, Traefik ingress at `logging.alfares.cz` with cert-manager TLS. See `SYSTEM.md` for the Kubernetes resource list.

## Health and Observability

`GET /health` returns `{ success, status, timestamp, service }`. This service is itself the ecosystem's central logging sink, so its own operational health is monitored via `monitoring-microservice` and Kubernetes liveness/readiness probes rather than by calling itself.

## Interfaces

### POST /api/logs

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

Admin read endpoint. Requires `Authorization: Bearer <Auth access token>` with one of `global:superadmin`, `app:logging-microservice:admin`, or `internal:logging-microservice:admin`.

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

Admin read endpoint. Requires `Authorization: Bearer <Auth access token>` with one of `global:superadmin`, `app:logging-microservice:admin`, or `internal:logging-microservice:admin`.

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

Rotation: daily, max 100 MB per file, 10 files retained. Logs are stored on the `logging-microservice-logs` Kubernetes PVC mounted at `/app/logs`. Local per-pod console output remains a fallback, but central query storage must stay on the PVC.

## Development

Local development uses Docker Compose against dev-only values sourced from Vault `secret/prod/logging-microservice`.

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
