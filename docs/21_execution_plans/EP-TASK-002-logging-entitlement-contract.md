# EP-TASK-002: Logging Entitlement Contract

```yaml
id: EP-TASK-002
status: implemented-v1
source_task: ../11_tasks/TASK-002-logging-entitlement-contract.md
owner: AI agent
created: 2026-06-15
last_updated: 2026-06-15
completeness_level: draft
vision:
  - ../01_vision/VISION.md
constitution:
  - ../00_constitution/CONSTITUTION.md
feature:
  - ../10_features/FEAT-001-centralized-structured-logging.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-002.md
context_package:
  - ../13_context_packages/CP-TASK-002-logging-entitlement-contract.md
coding_prompt:
  - ../14_prompts/PROMPT-TASK-002-logging-entitlement-contract.md
validation:
  - ../12_validation/VAL-TASK-002-logging-entitlement-contract.md
```

## Metadata

Owner decision recorded on 2026-06-15: logging-specific entitlements live in `logging-microservice`. `payments-microservice` remains upstream evidence for payment state only and is not the customer-dashboard entitlement authority.

## Upstream Traceability

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation.

- Vision: `../01_vision/VISION.md`
- Business source: `../BUSINESS.md`
- System: `../04_systems/SYS-001-structured-logging.md`
- Feature: `../10_features/FEAT-001-centralized-structured-logging.md`
- Task: `../11_tasks/TASK-002-logging-entitlement-contract.md`
- Goal impact: `../22_goal_impact/GOAL-IMPACT-TASK-002.md`
- Coding prompt: `../14_prompts/PROMPT-TASK-002-logging-entitlement-contract.md`
- Validation: `../12_validation/VAL-TASK-002-logging-entitlement-contract.md`

## Goal Impact

The customer dashboard can make plan-aware decisions for API keys, hooks, retention, ingest volume, AI analysis, export/copy, and dashboard access without relying on unowned frontend assumptions or raw payment status reads.

## Project Invariants

Preserve `LOG-INV-001` through `LOG-INV-006` in `../17_governance/PROJECT_INVARIANTS.md`.

- Logging remains centralized structured logging and customer-dashboard integration owner for logging-specific entitlement projection.
- Auth remains identity and RBAC authority.
- Payments remains payment-state/provider authority.
- No raw logs, tokens, API keys, payment provider payloads, or customer records may be copied into docs, tests, screenshots, or logs.

## Sensitive-Data Handling

Use synthetic tenants, plans, usage counters, and timestamps in tests and docs. Do not inspect production logs or payment records. Do not print bearer tokens, API keys, webhook secrets, provider payloads, customer identifiers, or raw metadata.

## Contract Impact

Additive planned endpoint:

```http
GET /api/v1/entitlements/current
Authorization: Bearer <Auth access token>
```

Response envelope target:

```json
{
  "tenant_id": "tenant_synthetic_01",
  "status": "trialing",
  "plan": {
    "id": "logging_starter",
    "name": "Starter",
    "interval": "month"
  },
  "trial": {
    "active": true,
    "ends_at": "2026-07-15T00:00:00Z"
  },
  "billing": {
    "state": "active",
    "payment_state_source": "payments-microservice"
  },
  "limits": {
    "api_keys_active": 3,
    "hooks_active": 2,
    "retention_days": 30,
    "monthly_ingest_events": 100000,
    "dashboard_users": 5,
    "ai_analysis_runs_per_month": 10
  },
  "usage": {
    "api_keys_active": 1,
    "hooks_active": 0,
    "monthly_ingest_events": 1200,
    "ai_analysis_runs_this_month": 0
  },
  "features": {
    "api_key_management": true,
    "hook_management": true,
    "ai_analysis": false,
    "export": false
  }
}
```

Open contract items:

- tenant scope v1: derive `tenant_id` as `auth_user:<Auth user id>` from Auth `/auth/validate` user `id`, with future migration marker for organization tenants.
- permission v1: `logging.dashboard.read`; admin overrides: `global:superadmin`, `app:logging-microservice:admin`, `internal:logging-microservice:admin`.
- [MISSING: source of payment-to-plan activation events].
- [MISSING: persistence model for plan, trial, and usage counters].
- [MISSING: frontend gateway/base URL for browser entitlement calls].

## Real-Money Impact

No real-money movement is allowed. The endpoint is read-only. Any future payment-state ingestion from Payments must use synthetic tests and approved internal contracts; no live provider calls, refunds, payouts, transfers, connected-account mutations, or provider-side mutations are part of this plan.

## Scope

### Ready Now

- Document logging ownership of entitlement projection.
- Define the read endpoint, response shape, auth model, and open gaps.
- Add validation criteria and handoff prompt.

### Dependency-Gated Implementation

- Select tenant identity source.
- Select persistence model or read-model source.
- Implement controller/service/DTO/tests.
- Wire frontend after live contract validation.

## Non-Goals

- Frontend changes.
- Payment provider changes.
- Auth token or role issuance changes.
- Production data migration.
- API key lifecycle, hook lifecycle, alert policy, or AI analysis implementation beyond exposing limits/features for those future capabilities.

## Files to Inspect

- `../BUSINESS.md`
- `../SYSTEM.md`
- `../README.md`
- `../docs/intent/backend-contracts.md`
- `../docs/intent/contracts-integration-assumptions.md`
- `../src/auth/admin-role.guard.ts`
- `../src/logs/logs.controller.ts`
- `../src/logs/logs.service.ts`
- `../src/app.module.ts`

## Files to Create or Modify When Coding Starts

Planned, subject to pre-coding gate:

- `../src/entitlements/*`
- `../src/app.module.ts`
- focused tests under `../test` or the existing test location
- `../docs/intent/backend-contracts.md`
- `../docs/intent/contracts-integration-assumptions.md`
- `../12_validation/VAL-TASK-002-logging-entitlement-contract.md`

## Files That Must Not Be Modified

- `../BUSINESS.md`
- Payment service source files.
- Auth service source files.
- Frontend source files unless a separate frontend task is selected.
- Production logs, secrets, credentials, provider data, or customer exports.

## Parallel Execution Section

| Workstream | Status | Owner role | Scope | Allowed files | Dependencies | Handoff |
| --- | --- | --- | --- | --- | --- | --- |
| A. Contract finalization | ready now | backend-contract-agent | Finalize endpoint auth, response shape, limits, error codes, and missing markers. | docs and planned entitlement DTO files | Owner decision already recorded | Contract ready for implementation. |
| B. Tenant/auth model | dependency-gated | auth-integration-agent | Confirm tenant claim or lookup and dashboard permission names. | docs, auth guard integration only | [MISSING: tenant_id source] | Permission and tenant contract for Workstream C. |
| C. Logging implementation | dependency-gated | backend-agent | Add read-only entitlement module and synthetic tests. | `src/entitlements/*`, app module, tests | A and B | Build/test evidence for validation. |
| D. Validation | final integration | validation-agent | Run build/tests, response-shape checks, sensitive-data scan, and contract doc review. | validation report only | C | Closure evidence and skipped gates. |
| E. Frontend integration | dependency-gated | frontend-agent | Consume endpoint in dashboard after backend validation. | frontend files only | D and frontend task approval | UI integration handoff. |

Shared contracts: `GET /api/v1/entitlements/current`, Auth validation response, tenant identity source, logging entitlement response schema. Integration owner: backend-contract-agent. Validation owner: validation-agent. Merge order: A -> B -> C -> D -> E.

## Implementation Steps

1. Confirm tenant identity and permissions.
2. Create entitlement DTO/schema with strict response fields.
3. Add read-only controller route under `/api/v1/entitlements/current`.
4. Add service returning synthetic/default entitlement state until persistence source is approved, or implement approved persistence if selected.
5. Add tests for auth required, forbidden user, tenant isolation, response shape, and no sensitive fields.
6. Update backend contract docs and validation report.

## Test Plan

- Unit test entitlement service response normalization.
- Controller test for bearer auth requirement and deny-by-default behavior.
- Contract test that response includes only approved fields.
- Sensitive-data scan of changed docs/tests/source.
- Build check.

## Validation Plan

Record commands and results in `../12_validation/VAL-TASK-002-logging-entitlement-contract.md`. If tenant source or persistence remains missing, keep implementation dependency-gated and mark runtime validation skipped with reason.

## Rollback Plan

Before runtime code changes, rollback is documentation-only: remove TASK-002 artifacts and the entitlement addenda from `docs/intent/*`. After runtime code changes, revert entitlement module registration, controller, service, DTO, tests, and docs in one change.

## Agent Handoff Prompt

Implement TASK-002 in remote `logging-microservice` only after tenant identity and permission gaps are resolved or explicitly scoped to synthetic/default read behavior. Preserve Logging ownership of the entitlement projection, Auth ownership of identity/RBAC, and Payments ownership of payment-state/provider evidence. Do not inspect production data, do not call live payment providers, and do not change frontend files in this backend task.

## Completion Checklist

- [x] Owner decision documented.
- [x] Task, goal impact, execution plan, context package, prompt, and validation shell created.
- [ ] Tenant/auth gaps resolved or explicitly dependency-gated.
- [x] Runtime code implemented for conservative v1 default read endpoint.
- [x] Build and documentation validation evidence recorded; focused endpoint tests remain future work.
- [ ] Frontend handoff updated.
