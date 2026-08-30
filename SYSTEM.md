# SYSTEM.md — logging-microservice

```yaml
id: SYSTEM-logging-microservice
status: reviewed
owner: engineering
created: 2026-06-13
last_updated: 2026-08-30
completeness_level: complete
```

## Purpose

`logging-microservice` is the ecosystem's centralized structured-logging sink: every Statex/Alfares service writes its logs here instead of maintaining its own log format or storage.

## Responsibilities

- Accept structured log entries via `POST /api/logs` and persist them with `timestamp` and `duration_ms`.
- Serve admin-authorized log query and known-service listing endpoints.
- Rotate and retain log files per the documented policy.
- Verify payment webhook signatures using its Vault-provisioned payment credentials.

## Non-responsibilities

- Does not act as a general analytics warehouse or business system of record.
- Does not authenticate end users; it only validates admin bearer tokens for read endpoints.
- Does not process payments itself — only verifies webhook signatures on this service's behalf.

## Inputs

- `POST /api/logs` structured log entries from any ecosystem service.
- Bearer access tokens on admin read endpoints.
- Payment webhook payloads and signatures for verification.

## Outputs

- Query results from `GET /api/logs/query` and `GET /api/logs/services`.
- `GET /health` status payload.
- Rotated log files on the `logging-microservice-logs` PVC.

## Dependencies

- `auth-microservice` — verifies admin bearer tokens for read endpoints.
- `payments-microservice` — source of webhook signature verification requests.
- Kubernetes PVC-backed file storage (no external database).

## Upstream traceability

`../BUSINESS.md`, `docs/01_vision/VISION.md`.

## Downstream artifacts

`docs/06_architecture/INTEGRATION_CONTRACT.md`, `docs/11_tasks/TASK-001-bootstrap-service.md`, `TASKS.md`.

## Validation criteria

`GET /health` returns success; `POST /api/logs` accepts a well-formed entry and returns 201; admin endpoints correctly reject requests without a valid role.

## Open questions

None outstanding as of 2026-08-30.

## Stack
- Runtime: NestJS (Node 24-slim)
- Log rotation: Winston daily-rotate-file (file-based)
- Stage: production

## Port & Domain
- Port: `3367`
- Domain: https://logging.alfares.cz

## Kubernetes
- Namespace: `statex-apps`
- Deployment: `logging-microservice` (1 replica, RollingUpdate)
- Image: `localhost:5000/logging-microservice:latest`
- ConfigMap: `logging-microservice-config`
- ExternalSecret: `logging-microservice-secret` → Vault `secret/prod/logging-microservice` (sync every 5 min)
- Service: ClusterIP :3367
- Ingress: logging.alfares.cz — TLS via cert-manager (letsencrypt-prod), secret `logging-microservice-tls`

## Environment Variables (ConfigMap — non-secret)
| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| SERVICE_NAME | logging-microservice |
| PORT | 3367 |
| LOG_LEVEL | info |
| LOG_STORAGE_PATH | ./logs (pod filesystem — no PVC; logs lost on pod restart) |
| LOG_ROTATION_MAX_SIZE | 100m |
| LOG_ROTATION_MAX_FILES | 10 |
| LOG_TIMESTAMP_FORMAT | four-digit-year-month-day, e.g. 2026-08-30 14:22:01 |
| CORS_ORIGIN | * |
| AUTH_SERVICE_URL | http://auth-microservice.statex-apps.svc.cluster.local:3370 |
| PAYMENT_SERVICE_URL | http://payments-microservice.statex-apps.svc.cluster.local:3468 |

## Secrets (Vault → ExternalSecret → K8s Secret)
| Variable | Vault path |
|----------|-----------|
| PAYMENT_API_KEY | secret/prod/logging-microservice |
| PAYMENT_APPLICATION_ID | secret/prod/logging-microservice |
| PAYMENT_WEBHOOK_API_KEY | secret/prod/logging-microservice |
| JWT_TOKEN | secret/prod/logging-microservice |

> Payment credentials exist because this service handles payment webhook signature verification in addition to logging. `JWT_TOKEN` is the service-to-service bearer token used for docs-RAG retrieval.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/logs | Write a structured log entry |
| GET | /api/logs/query | Query logs with filters |
| GET | /api/logs/services | List known services |
| GET | /health | Health check |

## Internal Service URL
Within `statex-apps` namespace: `http://logging-microservice:3367`
Cross-namespace: `http://logging-microservice.statex-apps.svc.cluster.local:3367`

## Integrations
- Depended on by all ecosystem services via `LOGGING_SERVICE_URL`
- Auth service: `http://auth-microservice.statex-apps.svc.cluster.local:3370`
- Payment service: `http://payments-microservice.statex-apps.svc.cluster.local:3468`
