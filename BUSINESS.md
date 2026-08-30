# Business: logging-microservice

```yaml
id: BUSINESS-logging-microservice
status: approved
owner: project owner
created: 2026-06-13
last_updated: 2026-08-30
completeness_level: complete
```

> ⚠️ IMMUTABLE BY AI.

## Goal

Centralized structured logging for all Statex services. Every service logs here with timestamp + duration_ms.

## Constraints

- All logs must include `timestamp` (ISO 8601) and `duration_ms`
- Log retention: daily rotation
- AI must never delete log files

## Consumers

All services in the ecosystem.

## Problem

Every ecosystem service needs a single, reliable place to send structured logs (with `timestamp` and `duration_ms`) instead of each service inventing its own log format, storage, and query path. Fragmented logging slows incident review and cross-service diagnosis.

## Target users and stakeholders

- All Statex/Alfares ecosystem services (log producers).
- Operators and administrators who query stored logs and inspect service health.
- AI agents that need safe, traceable operational context.

## Value proposition

One centralized, structured logging endpoint that every service can call without operational or format overhead, with admin-authorized query access and daily-rotated durable storage on a Kubernetes PVC.

## Goals

- Accept structured log entries from any ecosystem service via `POST /api/logs`.
- Preserve `timestamp` (ISO 8601) and `duration_ms` on every entry.
- Provide admin-authorized query and known-service listing endpoints.
- Rotate logs daily and retain a bounded, documented window.

## Non-goals

- Not a general analytics warehouse or business system of record.
- Not a place to store secrets, raw customer data, or authorization headers.
- Does not guarantee durability beyond its documented file rotation and PVC constraints.

## Success metrics

- All ecosystem services can successfully POST logs and receive `201`.
- Admin query and service-listing endpoints correctly enforce authorization roles.
- Log rotation and retention behave as documented (max size, file count).

## Business constraints

- All logs must include `timestamp` (ISO 8601) and `duration_ms`.
- Log retention: daily rotation, 10 files retained, 100 MB max per file.
- AI must never delete log files.
- Port: 3367 (<http://logging-microservice:3367>)
- Production: <https://logging.alfares.cz>

## Approval

Status: approved
Approved by: project owner
Approval evidence: owner-confirmation: logging-microservice-onboarding-approved
