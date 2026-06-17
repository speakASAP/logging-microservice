# VAL-TASK-002: Logging Entitlement Contract

```yaml
id: VAL-TASK-002
source_task: ../11_tasks/TASK-002-logging-entitlement-contract.md
execution_plan: ../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md
status: implemented-v1
created: 2026-06-15
last_updated: 2026-06-15
```

## Validation Scope

Validation for the owner decision, resolved v1 auth/tenant contract, and initial read-only runtime endpoint.

## Evidence Reviewed

- `../docs/intent/backend-contracts.md`
- `../docs/intent/contracts-integration-assumptions.md`
- `../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md`
- Remote read-only payment evidence from `payments-microservice` source and IPS docs.

## Result

Pass for v1 runtime endpoint. Build, documentation diff check, reference check, and production-secret-oriented scan passed. Focused endpoint tests remain future work.

## Commands

Runtime and documentation validation run on 2026-06-15:

```bash
npm run build
```

Result: pass.

Documentation validation run on 2026-06-15:

```bash
git diff --check -- 11_tasks/TASK-002-logging-entitlement-contract.md 21_execution_plans/EP-TASK-002-logging-entitlement-contract.md 22_goal_impact/GOAL-IMPACT-TASK-002.md 13_context_packages/CP-TASK-002-logging-entitlement-contract.md 14_prompts/PROMPT-TASK-002-logging-entitlement-contract.md 12_validation/VAL-TASK-002-logging-entitlement-contract.md docs/intent/backend-contracts.md docs/intent/contracts-integration-assumptions.md docs/intent/execution-plan.md
```

Result: pass, no whitespace errors reported.

```bash
grep production-secret-oriented patterns across TASK-002 artifacts and updated docs
```

Result: pass, no production-secret-like patterns found. A broader exploratory scan flagged existing synthetic field names such as `signing_secret_prefix`; those are contract field names, not secret values.

```bash
grep -RIn "GET /api/v1/entitlements/current\|logging-specific entitlements live\|TASK-002" 11_tasks 21_execution_plans 22_goal_impact 13_context_packages 14_prompts 12_validation docs/intent
```

Result: pass, ownership decision and endpoint references are present in the new IPS chain and updated contract docs.

## Sensitive-Data Handling

No production logs, bearer tokens, API keys, customer data, payment provider payloads, or secrets are included in this artifact. All examples are synthetic.

## Resolved Gates

- Tenant scope v1: derive `tenant_id` as `auth_user:<Auth user id>` from Auth `/auth/validate` user `id`, with future migration marker for organization tenants.
- Permission v1: `logging.dashboard.read`; admin overrides: `global:superadmin`, `app:logging-microservice:admin`, `internal:logging-microservice:admin`.
- Runtime implementation added for `GET /api/v1/entitlements/current`.

## Remaining Gates

- [MISSING: source of payment-to-plan activation events].
- [MISSING: persistence model for plan, trial, and usage counters].
- [MISSING: focused endpoint test harness/config for this endpoint].


## Runtime Endpoint

Implemented v1 endpoint:

- `GET /api/v1/entitlements/current`
- Auth: bearer token validated through Auth `/auth/validate`.
- Required role/permission: `logging.dashboard.read`, with existing admin role overrides.
- Tenant scope: `tenant_id` derives from Auth validation user `id` as `auth_user:<id>` unless a future Auth tenant claim is present.
- Response: conservative `not_configured` / `logging_free` default with paid feature flags disabled and no Payments lookup.

## Remaining Work

- [MISSING: source of payment-to-plan activation events].
- [MISSING: persistence model for plan, trial, and usage counters].
- [MISSING: focused endpoint test harness/config for auth success, forbidden, unauthenticated, and response shape].
