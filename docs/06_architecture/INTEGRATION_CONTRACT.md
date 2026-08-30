# Integration Contract

## Purpose

`logging-microservice` is the ecosystem's centralized structured-logging sink. Every other Alfares service calls it via `LOGGING_SERVICE_URL`; this contract defines what this service itself depends on, and how it degrades if a dependency is unavailable.

## Capability decisions

The machine-readable decisions live in `ips-adoption.json`. This document adds
the human-readable architecture and contract links.

| Capability | Component | Decision | Contract/API/event | Configuration | Failure mode | Validation evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Auth | `auth-microservice` | required | Bearer JWT verified against roles `global:superadmin`, `app:logging-microservice:admin`, `internal:logging-microservice:admin` | `AUTH_SERVICE_URL` ConfigMap value | Query/services admin endpoints return 401/403; ingestion (`POST /api/logs`) is unaffected | `curl` with/without a valid admin token against `/api/logs/query` |
| PostgreSQL | `db-server-postgres` | not-applicable | n/a | n/a | n/a | Log storage is file-based (Winston daily-rotate) on a Kubernetes PVC; no relational database is used |
| Redis | `db-server-redis` | not-applicable | n/a | n/a | n/a | No caching or session layer is used by this service |
| Logging | `logging-microservice` | required | Internal Winston structured write to `logs/*.log` | `LOG_STORAGE_PATH`, `LOG_ROTATION_MAX_SIZE`, `LOG_ROTATION_MAX_FILES` | Write failure returns 500; caller falls back to local console logging | Log rotation and ingestion verification (see `TASKS.md`) |
| Notifications | `notifications-microservice` | not-applicable | n/a | n/a | n/a | This service does not send end-user notifications |
| AI | `ai-microservice` | not-applicable | n/a | n/a | n/a | No AI-driven behavior in this service |
| Payments | `payments-microservice` | required | Payment webhook signature verification (`PAYMENT_API_KEY`, `PAYMENT_APPLICATION_ID`, `PAYMENT_WEBHOOK_API_KEY`) | Vault `secret/prod/logging-microservice` via ExternalSecret | Signature verification failure rejects the webhook call; logging ingestion is unaffected | Webhook signature check unit/integration test |
| Catalog | `catalog-microservice` | not-applicable | n/a | n/a | n/a | No catalog data is read or written |
| Orders | `orders-microservice` | not-applicable | n/a | n/a | n/a | No order data is read or written |
| Warehouse | `warehouse-microservice` | not-applicable | n/a | n/a | n/a | No warehouse data is read or written |
| Invoices | `invoices-microservice` | not-applicable | n/a | n/a | n/a | No invoice data is read or written |
| Object storage | `minio-microservice` | not-applicable | n/a | n/a | n/a | Logs are stored on a Kubernetes PVC, not MinIO |
| Events | RabbitMQ | not-applicable | n/a | n/a | n/a | This service is called synchronously over HTTP only; it does not publish or consume ecosystem events |
| Documentation retrieval | `docs-rag-microservice` | required | Direct Git ingestion | Repository catalog | Git fallback | Retrieval source check |
| Monitoring | `monitoring-microservice` | required | `GET /health` and probes | K8s manifests | Readiness blocks rollout | Health evidence |
| Backups | `backups-microservice` | not-applicable | n/a | n/a | n/a | Log retention is handled by in-service rotation (10 files, 100 MB max); no centralized backup integration is documented |

## Data ownership

`logging-microservice` owns its own rotated log files (`logs/*.log`) on its dedicated PVC. It does not own or persist any business entity data from other services — log payloads are treated as opaque, caller-supplied metadata.

## Authentication and authorization

`POST /api/logs` is unauthenticated (any in-cluster caller may write a log entry; callers are trusted ecosystem services). `GET /api/logs/query` and `GET /api/logs/services` require a bearer access token carrying one of `global:superadmin`, `app:logging-microservice:admin`, or `internal:logging-microservice:admin`, verified against `auth-microservice`.

## Synchronous dependencies

- `auth-microservice` (`AUTH_SERVICE_URL`) — token/role verification for admin read endpoints only; ingestion does not depend on it.
- `payments-microservice` (`PAYMENT_SERVICE_URL`) — payment webhook signature verification.
- Callers use a 1–2 second timeout against this service per `README.md` best practices; this service does not itself call back into arbitrary caller services.

## Asynchronous dependencies

None. This service does not publish or consume RabbitMQ events.

## Degraded operation

If `auth-microservice` is unavailable, admin query/service-listing endpoints fail closed (401/403); log ingestion continues unaffected since it does not require auth verification. If the PVC is full or unavailable, ingestion returns a `500` and callers are expected to fall back to local console/file logging per the documented client best practices.

## Validation

Adoption gate: `python3 ../intent-preservation-system/scripts/validate_adoption_profile.py --root . --phase planning`. Auth-boundary behavior is validated via `curl` against `/api/logs/query` with and without a valid admin token (see Capability decisions table).
