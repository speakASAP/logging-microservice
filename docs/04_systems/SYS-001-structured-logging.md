# SYS-001: Structured Logging System

```yaml
id: SYS-001
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
```

## Purpose

Provide a centralized service for ingesting, storing, querying, and operationally summarizing structured logs from Statex services.

## Responsibilities

- Accept structured logs through `POST /api/logs`.
- Persist per-service JSON and human-readable log files.
- Maintain daily rotated application and error logs.
- Expose health and service information endpoints.
- Protect log query and service listing endpoints with admin authorization.
- Preserve safe Marathon event summaries using an allowlist of exposed fields.

## Non-responsibilities

- Long-term analytical storage beyond documented file retention.
- Storing secrets, raw customer records, or authorization headers.
- Guaranteeing caller request success when logging is unavailable.

## Inputs

- HTTP log ingestion payloads.
- Admin query parameters.
- Runtime configuration from ConfigMap and ExternalSecret.

## Outputs

- JSON API responses.
- Rotated application and error logs.
- Per-service JSON-line logs and human-readable logs.
- Sanitized Marathon event summaries.

## Dependencies

- NestJS runtime.
- Winston daily-rotate-file.
- Auth service for admin token validation.
- Kubernetes deployment, service, ingress, ConfigMap, and ExternalSecret.

## Upstream Traceability

- Vision: `../01_vision/VISION.md`
- Business case: `../02_business_case/BUSINESS_CASE.md`
- Protected source: `../BUSINESS.md`

## Downstream Artifacts

- Subsystem: `../05_subsystems/SUB-001-log-ingestion-storage.md`
- Feature: `../10_features/FEAT-001-centralized-structured-logging.md`
- Task: `../11_tasks/TASK-001-implement-ips-baseline.md`

## Validation

Run `npm run build`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues` before converting future tasks into implementation work.

## Open Questions

The human owner should decide when the draft IPS constitution and vision become protected branch-controlled files.
