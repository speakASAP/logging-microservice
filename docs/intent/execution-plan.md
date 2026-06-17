# Logging Frontend Execution Plan

Status: ai-draft

## Scope

Plan for implementing a new frontend for the logging microservice.

In scope:

- Build the user-facing frontend experience for viewing and working with logs.
- Integrate with existing logging microservice APIs.
- Add validation coverage for core workflows and sensitive-data handling.

Out of scope for this documentation task:

- Editing frontend source files.
- Changing backend APIs or persistence.
- Approving product scope, security exceptions, or deployment gates.

## Implementation Steps

Treat this plan as a coordination plan for multiple bounded goals. Each goal
must still have its own single-session execution plan, context package, coding
prompt, validation evidence, and owner. Do not assign two agents to the same
files unless one agent is explicitly acting as reviewer/validator.

## Parallel Goal Map

| Goal | Agent session | Scope | Can start now | Depends on | Blockers |
| --- | --- | --- | --- | --- | --- |
| G1 Contract discovery | backend-contract-agent | Identify API endpoints, authentication requirements, pagination, filtering, sorting, retention metadata, and error formats. Update `docs/intent/contracts-integration-assumptions.md` and `docs/intent/backend-contracts.md`. | Complete for T1 | None | Remote source review found implemented log routes, customer-auth routes, adjacent payment API-key consumption, email webhook subscription, notification send/history/status, and generic AI completion. Logging API-key lifecycle, logging hook lifecycle, billing/trial entitlement, AI log-pattern analysis, alert-policy, OpenAPI, and generated-client evidence remain [MISSING]. |
| G2 Workflow and UX states | product-ux-agent | Define route workflows for landing, dashboard, admin, log list, filters, detail, empty/loading/error/permission-denied states. Update `docs/intent/validation-criteria.md`. | Yes | None | Approved product brief and exact roles are [UNKNOWN]. |
| G3 Sensitive-data rules | privacy-agent | Confirm masking, storage, screenshot, fixture, export, clipboard, telemetry, and synthetic-data rules. Update `docs/intent/sensitive-data-notes.md`. | Yes | None | Authoritative sensitive-field list and export/copy permissions are [UNKNOWN]. |
| G4 Frontend implementation | frontend-agent | Build or refactor `index.html`, `styles.css`, and `app.js` within established project conventions. | Yes, for static shell, implemented log routes, and Auth route planning only | G2 for final UX criteria; G1 for real API integration; G3 for field-level display rules | Logging API-key lifecycle, logging hook lifecycle, billing/trial, AI log-pattern analysis, alert-policy, tenant-scope, and production sensitive-data contracts remain [MISSING]. |
| G5 Integration adapter | integration-agent | Add API/auth integration layer after contracts are known, with deterministic pagination, filtering, sorting, and error handling. | Partially, for implemented log routes and customer-auth only | G1 | Implemented log query/services and Auth login/profile/validate routes are documented. Logging API-key lifecycle, logging hook lifecycle, billing/trial entitlement, AI log-pattern analysis, alert-policy, generated-client, tenant scope, and sensitive-data contracts remain [MISSING]. Draft target contracts are in `docs/intent/backend-contracts.md`. |
| G6 Validation and evidence | validation-agent | Run available static/browser checks, verify workflows, collect screenshots/reports, and document skipped gates with reasons. | Yes, for current static shell | G4 for final UI; G5 for live API validation | No package manifest or test runner exists locally; deployment readiness owner is [UNKNOWN]. |

## Goal Status

| Goal | Status | Evidence | Handoff |
| --- | --- | --- | --- |
| G1 Contract discovery / T1 Cross-Service Contract Discovery | Complete for read-only cross-service pass; dependency-gated items remain. | `docs/intent/contracts-integration-assumptions.md`; `docs/intent/backend-contracts.md`; read-only remote review of `logging-microservice`, `auth-microservice`, `payments-microservice`, `notifications-microservice`, and `ai-microservice` on `alfares`. | Unblocks T4 for Auth login/profile/token validation and existing logging query/services integration. Payment API-key, email webhook subscription, notification send/history/status, and generic AI completion are adjacent evidence only; they do not unblock logging API-key lifecycle, logging hook lifecycle, billing/trial entitlement, AI log-pattern analysis, or alert-policy UI without owner approval and contract reconciliation. |
| G4 Frontend implementation | Complete for static-shell contract reconciliation; dependency-gated for live API integration. | `index.html`; `styles.css`; `app.js`; `README.md`; `docs/intent/validation-criteria.md`; `docs/intent/sensitive-data-notes.md`. | Admin simulation now uses discovered backend admin roles. Customer dashboard remains draft because customer tenant/API-key/hook endpoints are [MISSING]. |
| G5 Integration adapter | Partially implemented for discovered admin log query/services endpoints; dependency-gated for customer dashboard extension features. | `app.js`; `styles.css`; `README.md`; `docs/intent/execution-plan.md`; pending validation refresh in `docs/validation/`. | Live admin adapter supports backend URL, bearer token, service/level/date/limit query params, service discovery, safe row normalization, masked identifiers, and explicit error states. It does not implement customer API-key lifecycle, logging hook lifecycle, billing/trial, AI log-pattern analysis, alert-policy, cursor pagination, raw metadata display, copy, export, or browser storage. |
| G6 Validation and evidence | Complete for current static shell as of 2026-06-14; dependency-gated for live API and deployment validation. | `docs/validation/frontend-validation.md`; `docs/validation/visual-qa.json`; generated screenshots in `docs/validation/`. | Does not unblock blocked G5 extensions. Remains reviewer for G4 changes and resumes live validation after approved tokens, contracts, and release gates exist. |
| T2 Privacy approval gap analysis | Complete for documentation; approval-gated for raw data features. | `docs/intent/sensitive-data-notes.md`; `docs/intent/validation-criteria.md`. | Raw detail, copy, export, screenshot release evidence, telemetry capture, and AI-analysis UI behavior remain blocked until named owners, contracts, and approvals are recorded. |

## Parallel Execution Waves

### Wave 1: Start immediately in parallel

- G1 Contract discovery.
- G2 Workflow and UX states.
- G3 Sensitive-data rules.
- G6 Validation baseline for the current static shell.

### Wave 2: Start after Wave 1 inputs are available

- G4 Frontend implementation can proceed immediately for static-shell work, but final data-bearing views must wait for G1 and G3.
- G6 continues as reviewer for G4 changes and records evidence.

### Wave 3: Start only after contract blockers are removed

- G5 Integration adapter.
- G6 live API validation and deployment-readiness evidence.

## Next Parallel Task Queue

These are the next agent-ready tasks. They preserve the chain:
Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding
Prompt -> Code -> Validation.

### T1 Cross-Service Contract Discovery

- Status: complete for read-only cross-service discovery on 2026-06-13.
- Owner role: backend-contract-agent.
- Objective: discover whether customer API-key, hook, AI-analysis, alert-policy,
  billing/trial, and customer-auth endpoints exist in sibling remote services.
- Scope: read-only remote review of `/home/ssf/Documents/Github/*` on
  `alfares`; update frontend contract docs only when evidence is found.
- Allowed files: `docs/intent/contracts-integration-assumptions.md`,
  `docs/intent/backend-contracts.md`, and `docs/intent/execution-plan.md`.
- Forbidden files: `index.html`, `styles.css`, `app.js`, generated screenshots,
  production logs, secrets, and remote source edits.
- Dependencies: none.
- Blockers: [MISSING: service owners and authoritative OpenAPI/generated-client
  locations]; [MISSING: logging API-key lifecycle owner]; [MISSING: logging hook
  lifecycle owner]; [MISSING: logging billing/trial entitlement owner];
  [MISSING: logging AI-analysis owner approval]; [MISSING: logging
  alert-policy owner approval].
- Expected output: evidence table with repository, file, endpoint, auth,
  response shape, pagination/filtering behavior, and remaining `[MISSING: ...]`
  markers.
- Validation evidence: exact remote files inspected, commands summarized, and
  explicit statement that no raw logs, tokens, or customer data were copied.
- Handoff notes: unblocks T4 for Auth customer login/profile/token validation
  and implemented logging query/services routes. Adjacent Payments,
  Notifications, and AI endpoints require product/backend owner approval before
  use as logging customer dashboard contracts.

### T2 Privacy Approval Gap Analysis

- Status: complete for documentation; approval-gated for implementation.
- Owner role: privacy-agent.
- Objective: convert the current conservative sensitive-data defaults into an
  approval checklist for display, masking, copy, export, screenshot, telemetry,
  and AI-analysis behavior.
- Scope: documentation only; no source changes and no approval invention.
- Allowed files: `docs/intent/sensitive-data-notes.md`,
  `docs/intent/validation-criteria.md`, and `docs/intent/execution-plan.md`.
- Forbidden files: frontend source, screenshots, fixtures containing real data,
  and any production/staging log extracts.
- Dependencies: none.
- Blockers: [UNKNOWN: approved security reviewer and exception process].
- Expected output: approval checklist with explicit pass/fail criteria and
  `[UNKNOWN: ...]` items for missing owners or decisions.
- Validation evidence: documented synthetic-data rule review and skipped gates in
  `docs/intent/sensitive-data-notes.md` and `docs/intent/validation-criteria.md`.
- Handoff notes: does not unblock raw detail, copy, export, screenshot,
  telemetry, or AI-analysis UI behavior. Those behaviors unblock only after
  approvals, contracts, owners, and audit/retention requirements are recorded.

### T3 Static Shell Regression Validation

- Status: complete for the 2026-06-14 static shell pass.
- Owner role: validation-agent.
- Objective: rerun static browser validation for landing, customer dashboard,
  admin allowed, admin denied, mobile layout, and sensitive-data exposure after
  any documentation or frontend shell changes.
- Scope: local static frontend validation only.
- Allowed files: `docs/validation/frontend-validation.md`,
  `docs/validation/visual-qa.json`, `docs/validation/*.png`, and
  `scripts/visual-qa.cjs` if the script itself must be fixed.
- Forbidden files: backend contracts, product criteria, privacy rules, and
  production/staging data.
- Dependencies: latest G4 static shell state.
- Blockers: [MISSING: package manifest, build command, lint command, and test
  runner].
- Expected output: screenshot/report refresh using synthetic records only.
- Validation evidence: local server URL, command summary, browser viewport list,
  in-app Browser smoke check, and skipped gates recorded in
  `docs/validation/frontend-validation.md` and `docs/validation/visual-qa.json`.
- Handoff notes: does not unblock T4 by itself; provides release evidence for
  static shell quality.

### T4 Integration Adapter Implementation

- Status: partially implemented for discovered admin logging routes;
  dependency-gated for customer dashboard extension features and full live
  validation.
- Owner role: integration-agent.
- Objective: implement the API/auth adapter for implemented admin log
  query/services endpoints without extending into unapproved customer-dashboard
  contracts.
- Scope: frontend-only adapter for `GET /api/logs/query` and
  `GET /api/logs/services`; bearer token remains in memory only; no raw metadata
  display, browser storage, copy/export, or generated client assumption.
- Allowed files: `app.js`, `styles.css`, `README.md`,
  `docs/intent/execution-plan.md`, `docs/validation/frontend-validation.md`,
  and `docs/validation/*` generated evidence.
- Forbidden files: backend source and unapproved raw payload rendering.
- Dependencies: T1 for contracts; T2 for sensitive-field behavior; T3 for static
  regression baseline.
- Blockers: logging API-key lifecycle, logging hook lifecycle, billing/trial
  entitlement, AI log-pattern analysis, alert-policy, tenant-scope, redaction,
  cursor pagination, and generated-client evidence remain [MISSING].
- Expected output: live/demo admin data-source controls, documented query
  filters, explicit auth/error/loading states, safe normalization of log rows,
  masked identifiers, and no persistence of bearer tokens or log payloads.
- Validation evidence: syntax check, local rendered QA, storage audit, and
  skipped live API validation when no real token is supplied.
- Handoff notes: hands to T3/G6 for browser validation. Full G5 remains blocked
  for customer API keys, logging hooks, billing/trial, AI pattern analysis,
  alert policies, cursor pagination, generated client, and approved redaction.

## Parallel Execution Control

- Ready now in parallel: none in this checkout after the 2026-06-14 T3 pass.
  T1, T2, and T3 are complete for the current evidence cycle.
- Dependency-gated: T4/G5 for customer dashboard extension features; the
  implemented admin log query/services adapter has been validated with synthetic
  and no-token states, then can be live-tested when an approved token is
  supplied.
- Shared files/contracts: T1 owns backend contract docs first; T2 owns
  sensitive-data and validation approval criteria and has completed the
  documentation pass; T3 owns validation evidence; T4 may not edit source until
  T1 and T2 handoffs are complete.
- Integration owner: original orchestrator thread.
- Validation owner: validation-agent, with release approver [UNKNOWN].
- Merge order: T1 contract evidence, then T2 privacy checklist, then T4 adapter
  code, then T3 final validation evidence.

## Goal Blockers

- Draft API endpoint list: `docs/intent/backend-contracts.md`.
- Draft response schema examples: `docs/intent/backend-contracts.md`.
- Authoritative implemented log endpoint list from remote backend source: recorded in `docs/intent/contracts-integration-assumptions.md` and `docs/intent/backend-contracts.md`.
- Authoritative customer-auth endpoint list from backend source: recorded in
  `docs/intent/contracts-integration-assumptions.md` and
  `docs/intent/backend-contracts.md`.
- Adjacent payment API-key consumption, notification webhook subscription,
  notification send/history/status, and AI completion endpoint evidence:
  recorded in `docs/intent/contracts-integration-assumptions.md` and
  `docs/intent/backend-contracts.md`; not yet approved as logging product
  contracts.
- Authoritative logging API-key lifecycle, logging hook lifecycle, billing/trial,
  AI log-pattern analysis, and alert-policy endpoint list from backend source or
  reviewed OpenAPI: [MISSING].
- Authoritative response schema for implemented log routes: partially documented in `docs/intent/contracts-integration-assumptions.md`.
- Generated client reference: [MISSING].
- Documented error format for implemented log routes: partially documented in `docs/intent/contracts-integration-assumptions.md`.
- Authentication and authorization contract for admin log query/services: partially documented in `docs/intent/contracts-integration-assumptions.md`.
- Authentication and authorization contract for customer auth: documented from
  `auth-microservice`.
- Authentication and authorization contract for logging API-key lifecycle, logging
  hook lifecycle, billing/trial, AI log-pattern analysis, and alert-policy routes:
  [MISSING].
- Redaction/sensitive-field contract: [MISSING].
- Approved product brief, target roles, and permission model: [UNKNOWN].
- Deployment process and gate owner: [UNKNOWN].
- Local package manifest, build command, lint command, and test runner: [MISSING].

## Agent Handoff Rules

- Each agent must report files changed, validation run, skipped validation with reason, remaining blockers, and whether its goal unblocks another goal.
- Agents must update only the documents or source files assigned to their goal unless they report a deviation.
- Agents must use synthetic records only; no real logs, tokens, customer identifiers, or raw production data may be copied into artifacts.
- When a downstream goal remains blocked, the agent must leave the blocker as `[MISSING: ...]` or `[UNKNOWN: ...]` instead of inventing the contract.

## Operational Gates

- Pre-coding gate: [MISSING: no local IPS gate scripts found in this checkout].
- Documentation audit: [MISSING: no local IPS gate scripts found in this checkout].
- Deployment readiness gate: [MISSING: deployment process and gate owner unknown].
- Security/privacy review: [UNKNOWN: required reviewer or approval process].

## Handoff Notes For Main Agent

- This plan is intentionally conservative because upstream approvals and source contracts are not present locally.
- Any discovered authoritative backend contract should update `docs/intent/contracts-integration-assumptions.md` and reconcile `docs/intent/backend-contracts.md`.
- Any exception that permits sensitive data display, storage, export, or screenshot capture requires explicit approval.

## T5-D Logging Entitlement Contract Task

Owner decision recorded on 2026-06-15: logging-specific entitlements live in `logging-microservice`.

Agent-ready task:

- Status: planned.
- Owner role: backend-contract-agent, then backend-agent after missing tenant/auth/persistence decisions are resolved.
- Objective: define and implement `GET /api/v1/entitlements/current` as the logging-owned plan/trial/limits/usage read endpoint for the customer dashboard.
- Scope: `logging-microservice` docs and, after gate approval, read-only entitlement backend files under `src/entitlements/*` plus focused tests.
- Allowed files now: `11_tasks/TASK-002-logging-entitlement-contract.md`, `21_execution_plans/EP-TASK-002-logging-entitlement-contract.md`, `22_goal_impact/GOAL-IMPACT-TASK-002.md`, `13_context_packages/CP-TASK-002-logging-entitlement-contract.md`, `14_prompts/PROMPT-TASK-002-logging-entitlement-contract.md`, `12_validation/VAL-TASK-002-logging-entitlement-contract.md`, and `docs/intent/*` contract docs.
- Forbidden files now: frontend source, payment source, auth source, production logs, secrets, and customer/provider records.
- Dependencies: tenant scope v1: derive `tenant_id` as `auth_user:<Auth user id>` from Auth `/auth/validate` user `id`, with future migration marker for organization tenants, permission v1: `logging.dashboard.read`; admin overrides: `global:superadmin`, `app:logging-microservice:admin`, `internal:logging-microservice:admin`, [MISSING: source of payment-to-plan activation events], [MISSING: persistence model for plan, trial, and usage counters].
- Validation evidence: documentation chain created, sensitive-data rules preserved, runtime implementation not started.
- Handoff notes: do not integrate frontend billing/trial UI with live data until this endpoint is implemented and validated.

Parallel execution section:

| Workstream | Status | Owner | Scope | Merge order |
| --- | --- | --- | --- | --- |
| Contract finalization | ready now | backend-contract-agent | Resolve endpoint schema, error codes, limits, and docs. | 1 |
| Tenant/auth model | dependency-gated | auth-integration-agent | Confirm tenant claim or lookup and entitlement permission names. | 2 |
| Backend implementation | dependency-gated | backend-agent | Add read-only entitlement route, service, DTO, and tests. | 3 |
| Validation | final integration | validation-agent | Build/tests, response-shape check, sensitive-data scan, validation report. | 4 |
| Frontend integration | dependency-gated | frontend-agent | Consume validated endpoint in customer dashboard. | 5 |
