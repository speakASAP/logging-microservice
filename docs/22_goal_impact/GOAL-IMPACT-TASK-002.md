# GOAL-IMPACT-TASK-002: Logging Entitlement Contract

```yaml
id: GOAL-IMPACT-TASK-002
artifact_type: task
artifact_id: TASK-002
artifact_path: ../11_tasks/TASK-002-logging-entitlement-contract.md
primary_goal: ../01_vision/VISION.md#key-outcomes
secondary_goals:
  - ../02_business_case/BUSINESS_CASE.md#success-metrics
impact_level: high
impact_description: Establishes logging-owned customer entitlement read contract for dashboard plan, trial, usage, limits, and feature access.
success_metric: Customer dashboard has an approved logging-owned entitlement contract and does not infer plan state directly from Payments.
upstream_links:
  - ../01_vision/VISION.md
  - ../02_business_case/BUSINESS_CASE.md
  - ../10_features/FEAT-001-centralized-structured-logging.md
downstream_links:
  - ../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md
  - ../12_validation/VAL-TASK-002-logging-entitlement-contract.md
validation_method: Documentation review, contract tests, synthetic auth/tenant tests, and sensitive-data scan.
status: draft
```

## Explanation

The logging frontend needs plan/trial/limit visibility to avoid rendering unsupported customer-dashboard actions. This impact record keeps the entitlement projection in `logging-microservice`, while `auth-microservice` remains identity authority and `payments-microservice` remains payment-state/provider authority.

## Expected Outcome

- Logging exposes or plans a read-only entitlement endpoint for the active tenant.
- Frontend integration can rely on one logging-owned contract for plan, trial, limits, usage, and feature flags.
- Payments data is not exposed directly to the browser as entitlement authority.

## Risk Reduction

- Prevents frontend from inventing plan state.
- Prevents Payments ownership drift into product entitlement logic.
- Makes tenant-scoped limits auditable before API key, hook, export, or AI-analysis features are enabled.

## Evidence

- Task: `../11_tasks/TASK-002-logging-entitlement-contract.md`
- Execution plan: `../21_execution_plans/EP-TASK-002-logging-entitlement-contract.md`
- Context package: `../13_context_packages/CP-TASK-002-logging-entitlement-contract.md`
- Validation report: `../12_validation/VAL-TASK-002-logging-entitlement-contract.md`

## Validation

The impact is validated when the contract is documented, implemented or explicitly dependency-gated, tested with synthetic tenant data, and reviewed against sensitive-data and cross-service ownership rules.
