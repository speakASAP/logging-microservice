# Core Entities

```yaml
id: CORE-ENTITIES
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../SYSTEM.md
  - ../src/logs/dto/log-entry.dto.ts
```

## LogEntry

Fields: `level`, `message` or `msg`, `service`, optional `timestamp`, optional correlation identifiers, optional `duration_ms`, and optional `metadata`.

## ServiceLogFile

Per-service JSON-line file named `{service}.log`, plus a human-readable companion file named `{service}.human.log`.

## RotatedApplicationLog

Daily rotated Winston output for all logs and error-only logs, controlled by `LOG_ROTATION_MAX_SIZE` and `LOG_ROTATION_MAX_FILES`.

## AdminRole

One of `global:superadmin`, `app:logging-microservice:admin`, or `internal:logging-microservice:admin`, validated by the Auth service for protected read endpoints.

## MarathonEventSummary

Sanitized operational summary for Marathon event messages that exposes only allowlisted fields from `marathon.log`.
