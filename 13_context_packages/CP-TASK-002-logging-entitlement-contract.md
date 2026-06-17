# CP-TASK-002: Logging Entitlement Contract

```yaml
id: CP-TASK-002
source_task: ../11_tasks/TASK-002-logging-entitlement-contract.md
source_execution_plan: ../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md
status: draft
created: 2026-06-15
last_updated: 2026-06-15
```

## Preserved Intent

Logging-specific entitlements live in `logging-microservice`. The customer dashboard needs a logging-owned read endpoint for plan, trial, usage, limits, and feature access. Payments is upstream payment-state evidence only.

## Required Evidence

- `../docs/intent/backend-contracts.md` records missing billing/trial contract evidence and draft target contracts.
- `../docs/intent/contracts-integration-assumptions.md` records cross-service discovery.
- Payments evidence showed payment/refund/Stripe Connect ownership only.
- Auth evidence showed Auth owns identity and RBAC role claims.

## Ownership Boundaries

- Logging owns logging entitlement projection and logging feature limits.
- Auth owns identity, JWTs, role claims, and token validation.
- Payments owns payment creation, payment state, refunds, provider webhooks, and Stripe Connect mappings.
- Frontend consumes only reviewed Logging/Auth contracts.

## Contract Target

`GET /api/v1/entitlements/current` returns active-tenant logging entitlement state with plan, trial, billing summary, limits, usage, and feature flags.

## Missing Inputs

- tenant scope v1: derive `tenant_id` as `auth_user:<Auth user id>` from Auth `/auth/validate` user `id`, with future migration marker for organization tenants.
- permission v1: `logging.dashboard.read`; admin overrides: `global:superadmin`, `app:logging-microservice:admin`, `internal:logging-microservice:admin`.
- [MISSING: source of payment-to-plan activation events].
- [MISSING: persistence model for plan, trial, and usage counters].

## Sensitive Data Rules

Use synthetic tenants and usage only. Do not copy bearer tokens, API keys, raw logs, customer data, payment records, provider payloads, webhook secrets, or production screenshots.

## Validation Expectations

- Build and focused tests for runtime code.
- Contract response shape check.
- Auth/tenant deny-by-default checks.
- Sensitive-data scan for changed files.
- Validation report updated with commands and skipped gates.
