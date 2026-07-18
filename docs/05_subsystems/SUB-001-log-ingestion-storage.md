# SUB-001: Log Ingestion and Storage

```yaml
id: SUB-001
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../04_systems/SYS-001-structured-logging.md
```

## Purpose

Handle log ingestion, file persistence, query filtering, service discovery, and sanitized operational summaries.

## Parent System

`../04_systems/SYS-001-structured-logging.md`

## Responsibilities

- Validate incoming log DTOs through NestJS validation.
- Resolve `message` from standard `message` or orchestrator `msg`.
- Store per-service JSON and human-readable files.
- Query logs by service, level, date window, task id, and project id.
- List services with log files.
- Summarize Marathon events without exposing non-allowlisted fields.

## Inputs

- `LogEntryDto` request body.
- Query parameters for read endpoints.
- Environment variables controlling log storage and rotation.

## Outputs

- Stored log lines.
- Query result arrays.
- Service name arrays.
- Marathon event summary objects.

## Interfaces

- `POST /api/logs`
- `GET /api/logs/query`
- `GET /api/logs/services`
- `GET /api/logs/marathon-events/summary`

## Dependencies

- `src/logs/logs.controller.ts`
- `src/logs/logs.service.ts`
- `src/logs/dto/log-entry.dto.ts`
- `src/auth/admin-role.guard.ts`

## Data Ownership

The subsystem owns transient pod-local log files under `LOG_STORAGE_PATH`. It does not own source business data from calling services.

## Failure Modes

- Storage path unavailable.
- Invalid or missing bearer token for admin reads.
- Auth service unavailable during admin validation.
- Caller omits duration information.
- Pod restart loses pod-local logs.

## Validation

Build the service, run the IPS gates, and test health plus ingestion with synthetic log data only.
