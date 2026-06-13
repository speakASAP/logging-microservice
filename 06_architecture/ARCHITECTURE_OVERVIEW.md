# Architecture Overview

```yaml
id: ARCHITECTURE-OVERVIEW
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../SYSTEM.md
  - ../04_systems/SYS-001-structured-logging.md
```

## Runtime Architecture

`logging-microservice` is a NestJS service deployed in Kubernetes namespace `statex-apps`. The backend listens on port `3367`, exposes health and logging APIs, and uses Winston daily-rotate-file for application, error, and per-service log files.

## Request Flow

1. A caller sends a structured payload to `POST /api/logs`.
2. NestJS validation checks allowed fields and types.
3. `LogsService` writes to Winston rotated logs and service-specific files.
4. Admin users query stored files through protected read endpoints.
5. Health and info endpoints provide operational status.

## Security Model

- Ingestion is operationally public inside the service boundary.
- Query and service listing endpoints require bearer-token validation through the Auth service.
- Allowed roles are defined in `src/auth/admin-role.guard.ts`.
- Secrets are sourced from Vault through ExternalSecret and must not be copied into docs, prompts, logs, examples, or reports.

## Storage Model

Logs are file-based and pod-local. Daily rotation controls file size and retention count. Pod restarts can lose logs because no persistent volume is documented for the service.

## Integration Model

Dependent services use `LOGGING_SERVICE_URL`, prefer short timeouts, and keep a local fallback so logging failures do not block business requests.

## Validation

Architecture changes require an ADR update and must preserve the API compatibility warning in `../AGENTS.md` and `../README.md`.
