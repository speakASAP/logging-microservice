# BPCP Holiday Discount Adoption

Status: service-local adoption contract
Date: 2026-07-02
Service: `logging-microservice`
Central contract pack: `statex-ecosystem/docs/business-process-control-plane/`

## Role

Audit and structured log ingestion owner for BPCP activation and decisions.

## Responsibilities

- Ingest process lifecycle events and service adapter outcomes.
- Redact sensitive data.
- Preserve audit chain for activation, publish, pause, and rollback.

## Required interfaces

- Structured event schema for BPCP lifecycle and decision logs.
- Correlation ids: processId, processVersion, policyId, requestId.

## Boundaries

- This service must not become the global owner of BPCP process definitions.
- This service must fail closed on invalid or unknown BPCP process versions.
- This service must keep existing domain ownership and invariants.
- This service must expose or document dry-run behavior before live execution.
- This service must not overwrite existing service contracts without an
  explicit integration owner and validation owner.

## Holiday Discount pilot expectations

- Recognize `holiday-discount-2026` only through versioned BPCP contracts.
- Preserve `processId`, `processVersion`, and `policyId` in every relevant
  decision, event, snapshot, log, or rendered experience.
- Support rollback by respecting BPCP pause and retired states.
- Keep process display and process execution separate where applicable.

## Blockers and unknowns

- [MISSING: current logging ingestion endpoint for BPCP events]

## Validation evidence required before implementation is accepted

- Synthetic BPCP publish/pause/decision logs are accepted.
- Sensitive fields are redacted.
- Correlation ids are searchable.

## Parallel handoff

This adoption doc is safe for a focused service owner to implement in parallel
after the central BPCP schemas are accepted. The service owner must not edit
shared BPCP schemas directly; schema changes go through the BPCP integration
owner.
