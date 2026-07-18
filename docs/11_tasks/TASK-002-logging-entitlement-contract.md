# TASK-002: Logging Entitlement Contract

```yaml
id: TASK-002
status: implemented-v1
owner: AI agent
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: draft
upstream:
  - ../10_features/FEAT-001-centralized-structured-logging.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-002.md
execution_plan:
  - ../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md
context_package:
  - ../13_context_packages/CP-TASK-002-logging-entitlement-contract.md
coding_prompt:
  - ../14_prompts/PROMPT-TASK-002-logging-entitlement-contract.md
validation:
  - ../12_validation/VAL-TASK-002-logging-entitlement-contract.md
```

## Objective

Define and implement a logging-specific entitlement read contract in `logging-microservice` so the customer dashboard can display plan, trial, limits, usage, and feature access without treating `payments-microservice` as the entitlement authority.

## Upstream Links

- Feature: `../10_features/FEAT-001-centralized-structured-logging.md`
- System: `../04_systems/SYS-001-structured-logging.md`
- Vision: `../01_vision/VISION.md`
- Protected business source: `../BUSINESS.md`
- Frontend contract discovery: `../docs/intent/contracts-integration-assumptions.md`
- Backend contract draft: `../docs/intent/backend-contracts.md`

## Goal Impact

The task unblocks customer-dashboard planning for billing/trial/plan display while preserving service ownership boundaries. Logging owns the logging-product entitlement projection. Payments remains only upstream payment-state evidence.

## Project Invariant Impact

Applies `LOG-INV-001` through `LOG-INV-006` from `../17_governance/PROJECT_INVARIANTS.md`. The task must not move identity ownership into Logging, must not move payment processing into Logging, and must not expose raw logs, tokens, API keys, customer records, or payment provider payloads.

## Sensitive-Data Classification

Classification: synthetic for planning artifacts. Implementation must use synthetic tests and must not include secrets, bearer tokens, raw production logs, raw customer data, payment-provider payloads, or plaintext API keys in docs, tests, logs, screenshots, or fixtures.

## Contract/Schema Impact

Adds a planned read-only endpoint contract: `GET /api/v1/entitlements/current`. This is an additive customer-dashboard contract and requires backend implementation plus validation before frontend live integration.

## Replay/Determinism Impact

Read endpoint responses depend on current tenant entitlement and usage state. Implementation must make synthetic fixtures deterministic and document how usage counters are computed.

## Scope

- Record that logging-specific entitlements live in `logging-microservice`.
- Define `GET /api/v1/entitlements/current` contract.
- Keep `payments-microservice` as upstream payment-state evidence only.
- Plan persistence and read-model behavior for tenant-scoped logging entitlements.
- Define validation for auth, tenant isolation, response shape, limits, usage, and sensitive-data handling.

## Non-Goals

- Payment creation, refunds, provider webhooks, Stripe Connect, invoices, payouts, or provider mutation.
- Auth token issuance, role assignment, or tenant identity ownership.
- Frontend implementation.
- Live provider calls or production data inspection.
- Changing existing log ingestion/query behavior.

## Acceptance Criteria

- [x] Entitlement owner is documented as `logging-microservice`.
- [x] `GET /api/v1/entitlements/current` contract is implemented as a conservative v1 default read endpoint.
- [x] Auth and tenant-scope behavior is implemented from Auth `/auth/validate`; runtime request tests remain future work.
- [x] Response includes plan, trial, billing summary, limits, usage, and feature flags.
- [x] Payments evidence is not consumed in v1; billing source is `null` until approved payment activation exists.
- [x] No secrets, tokens, raw logs, customer records, or provider payloads are copied.

## Required Context

Read `../BUSINESS.md`, `../SYSTEM.md`, `../README.md`, `../AGENTS.md`, `../docs/intent/backend-contracts.md`, `../docs/intent/contracts-integration-assumptions.md`, `../src/auth/admin-role.guard.ts`, and the selected entitlement implementation files before code changes.

## Validation Task

Run focused build/tests for any source changes, validate response shape with synthetic data, run sensitive-data scans for changed docs/tests, and update `../12_validation/VAL-TASK-002-logging-entitlement-contract.md`.

## Required Gates

- Pre-coding gate for task traceability, invariants, sensitive-data classification, contract impact, validation plan, and rollback.
- Contract compatibility review before frontend integration.
- Deployment-readiness gate before live rollout.

## Execution Plan Requirement

This task is linked to `../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md`. Runtime code must not start until the execution plan, context package, coding prompt, and validation criteria are reviewed.
