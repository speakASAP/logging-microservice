# Project Invariants

```yaml
id: PROJECT-INVARIANTS
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../01_vision/VISION.md
  - ../BUSINESS.md
```

## Purpose

Project invariants convert logging-service intent into checks that agents must preserve before coding and before deployment.

## Applicability

Project-specific invariants apply because this service is a shared dependency for all ecosystem services.

## Invariants

| ID | Level | Source | Rule | Forbidden outcome | Validation method | Gate |
|---|---|---|---|---|---|---|
| LOG-INV-001 | product | `../BUSINESS.md` | The service remains centralized structured logging for Statex services. | Scope shifts to unrelated analytics or business storage. | Trace task to feature and vision. | pre-coding |
| LOG-INV-002 | product | `../BUSINESS.md` | Log entries preserve timestamp and duration expectations. | Documentation or code weakens timestamp or `duration_ms` expectations. | Review DTO, README, and task acceptance criteria. | pre-coding/deployment |
| LOG-INV-003 | operational | `../AGENTS.md` | AI agents must never delete log files. | Manual deletion or retention weakening by AI. | Review file changes and commands. | deployment |
| LOG-INV-004 | architecture | `../07_decisions/ADR-001-file-based-rotated-log-storage.md` | File-based daily rotation remains the active storage architecture until superseded by ADR. | Silent migration to a new storage model. | ADR check for storage changes. | pre-coding |
| LOG-INV-005 | security | `../23_documentation_contracts/SENSITIVE_DATA_POLICY.md` | No secrets or raw production data in prompts, tests, examples, logs, or reports. | Tokens, customer records, auth headers, or secret-like examples committed. | Sensitive-data scan. | pre-coding/deployment |
| LOG-INV-006 | integration | `../README.md` | API changes require ecosystem-wide review. | Breaking endpoint or schema changes without review. | Execution-plan contract impact check. | pre-coding/deployment |

## Exceptions

No exceptions are approved in this baseline.

## Review cadence

Review invariants when API behavior, storage architecture, deployment model, or sensitive-data handling changes.
