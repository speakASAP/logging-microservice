# PROMPT-TASK-002: Logging Entitlement Contract

```yaml
id: PROMPT-TASK-002
source_task: ../11_tasks/TASK-002-logging-entitlement-contract.md
execution_plan: ../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md
context_package: ../13_context_packages/CP-TASK-002-logging-entitlement-contract.md
validation: ../12_validation/VAL-TASK-002-logging-entitlement-contract.md
status: draft
created: 2026-06-15
last_updated: 2026-06-15
```

## Coding Prompt

Work only on `alfares` in `/home/ssf/Documents/Github/logging-microservice`. Implement or further plan TASK-002 from `../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md` and `../13_context_packages/CP-TASK-002-logging-entitlement-contract.md`.

Preserve the decision that logging-specific entitlements live in `logging-microservice`. Auth remains identity/RBAC authority. Payments remains payment-state/provider authority and must not become the browser-facing entitlement source.

Before source edits, resolve or explicitly gate these items:

- tenant scope v1: derive `tenant_id` as `auth_user:<Auth user id>` from Auth `/auth/validate` user `id`, with future migration marker for organization tenants.
- permission v1: `logging.dashboard.read`; admin overrides: `global:superadmin`, `app:logging-microservice:admin`, `internal:logging-microservice:admin`.
- [MISSING: source of payment-to-plan activation events].
- [MISSING: persistence model for plan, trial, and usage counters].

Allowed runtime scope, after gate approval: add a read-only `GET /api/v1/entitlements/current` endpoint, DTO/schema, service, module registration, and focused tests. Do not change frontend files, payment source, auth source, log ingestion behavior, provider integrations, or production data.

Validation must include build/test evidence, response-shape checks, auth/tenant checks, sensitive-data scan, and updates to `../12_validation/VAL-TASK-002-logging-entitlement-contract.md`.
