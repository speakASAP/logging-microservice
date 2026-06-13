# Business Case

```yaml
id: BUSINESS-CASE
status: draft
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../BUSINESS.md
```

## Problem

All Statex services need a common structured logging endpoint. Without it, each service would store and query logs differently, making incident review, timeout tracking, and operational support inconsistent.

## Proposed Solution

Maintain `logging-microservice` as the centralized structured logging service on port `3367`, with file-based log rotation, health checks, admin-protected query endpoints, and integration guidance for callers.

## Value Proposition

A shared logging service gives operators and dependent services one stable API, one operational target, and one documented set of logging rules.

## Constraints

- Every log entry must include timestamp and duration information.
- Timeout errors must be logged at `error` level.
- AI agents must never delete log files.
- Admin read endpoints require approved authorization roles.
- Secrets and raw production data must not be placed in examples, tests, prompts, or reports.

## Success Metrics

- `GET /health` returns an operational response.
- `POST /api/logs` remains compatible for existing services.
- Admin read endpoints reject missing or insufficient bearer tokens.
- Log rotation configuration remains documented and deployed.
