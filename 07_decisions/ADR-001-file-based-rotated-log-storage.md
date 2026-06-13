# ADR-001: Use File-Based Rotated Log Storage

Status: Accepted

## Context

The service already uses Winston and daily-rotate-file to centralize logs for the ecosystem. `../SYSTEM.md` documents pod-local `LOG_STORAGE_PATH` and rotation variables.

## Decision

Keep file-based JSON and human-readable log storage as the current architecture. Preserve daily rotation and separate error logs. Treat durable external log storage as a future architecture decision rather than an implicit change.

## Alternatives Considered

- Database-backed log storage: improves querying and durability but changes the operational profile and introduces migration work.
- External log platform: can improve observability but would require ecosystem and infrastructure review.
- In-memory storage: simple but incompatible with query and retention needs.

## Consequences

- The service remains lightweight and compatible with current deployment.
- Query behavior is limited by file scanning.
- Pod-local logs can be lost on restart.
- AI agents must not delete log files or weaken rotation controls.

## Validation

Check `src/logs/logs.service.ts`, `k8s/configmap.yaml`, and `SYSTEM.md` when changing storage behavior. Any replacement storage model requires a new ADR and human review.
