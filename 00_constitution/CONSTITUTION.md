# Project Constitution

```yaml
id: CONSTITUTION
status: approved
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - ../BUSINESS.md
  - ../AGENTS.md
```

## Purpose

This constitution adapts the company Intent Preservation System to `logging-microservice`. It exists to preserve the service purpose, prevent silent API drift, and keep AI-assisted changes traceable to the approved business intent in `../BUSINESS.md`.

## Constitutional Principles

1. Centralized structured logging remains the service purpose.
2. `../BUSINESS.md` is human-owned and immutable to AI agents.
3. Every code or operations change must trace to a feature, task, execution plan, and validation report.
4. API changes require ecosystem-wide review because every service can depend on this service.
5. Log entries must preserve `timestamp` and `duration_ms` expectations.
6. AI agents must not delete log files or weaken retention and rotation controls.
7. Prompts, tests, examples, logs, reports, and documentation must not contain secrets or raw production data.

## Protected Intent

The protected upstream intent is `../BUSINESS.md`. This IPS constitution and `../01_vision/VISION.md` are approved baseline documents derived from that upstream source and were human-approved on 2026-06-13 and should be branch-protected.

## Amendment Process

Changes to service purpose, API compatibility, required log fields, retention behavior, or protected AI boundaries must be proposed in `../01_vision/VISION_EVOLUTION.md`, reviewed by a human owner, and reflected in downstream system, feature, task, and validation documents.

## AI Agent Rules

AI agents may add mutable IPS artifacts, execution plans, validation reports, and audit evidence. AI agents must not edit `../BUSINESS.md`, invent approvals, remove traceability, delete logs, expose secrets, or deploy API-breaking changes without human review.
