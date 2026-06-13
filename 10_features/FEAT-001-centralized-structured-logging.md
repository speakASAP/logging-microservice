# FEAT-001: Centralized Structured Logging

```yaml
id: FEAT-001
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../04_systems/SYS-001-structured-logging.md
```

## Goal

Maintain a stable structured logging API and operational documentation for all dependent services.

## User or System Need

Calling services need a shared endpoint for logs. Operators need consistent health, query, and service discovery behavior.

## User Story

As a dependent service, I can send a structured log entry with service identity, severity, message, timestamp, and duration data so operators can review cross-service behavior from one logging service.

## Goal Impact

Supports the business goal in `../02_business_case/BUSINESS_CASE.md` by keeping centralized logging traceable and operationally safe.

## Scope

- Log ingestion API.
- Admin-protected query and service listing endpoints.
- Health and info endpoints.
- File-based rotated storage.
- IPS documentation and gate baseline.

## Non-Goals

- Replacing file storage with a database.
- Adding long-term analytics.
- Storing secrets or raw production records.
- Changing public API behavior as part of IPS baseline adoption.

## Acceptance criteria

- [x] Service purpose and constraints are documented.
- [x] API and storage constraints are traceable to system documentation.
- [x] IPS task and execution plan exist for baseline adoption.
- [x] Sensitive-data rules are documented.

## Dependencies

- `../BUSINESS.md`
- `../SYSTEM.md`
- `../src/logs/logs.controller.ts`
- `../src/logs/logs.service.ts`

## Traceability

- System: `../04_systems/SYS-001-structured-logging.md`
- Subsystem: `../05_subsystems/SUB-001-log-ingestion-storage.md`
- Task: `../11_tasks/TASK-001-implement-ips-baseline.md`

## Validation

Run build and IPS documentation gates with synthetic examples only.
