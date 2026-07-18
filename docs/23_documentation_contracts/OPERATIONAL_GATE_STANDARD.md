# Operational Gate Standard

```yaml
id: OPERATIONAL-GATE-STANDARD
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../17_governance/PROJECT_INVARIANTS.md
```

## Purpose

Operational gates enforce traceability, invariants, sensitive-data rules, contract impact, and validation evidence before coding or deployment.

## Gate Types

- Pre-coding gate: before converting task and plan into code.
- Integration-readiness gate: before combining independent changes.
- Deployment-readiness gate: before release, merge, deployment, or closure.

## Required Evidence

Gate reports must include command, repository root, target artifact, status, missing files, failed checks, invariant evidence, sensitive-data scan result, and next action.

## Report Location

Gate reports are written under `reports/validation/` and are evidence, not source-of-truth governance documents.

## Failure Policy

A failed gate blocks the next delivery phase unless a human owner explicitly approves a documented exception.
