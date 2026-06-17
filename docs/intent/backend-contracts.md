# Logging Backend Contracts

id: LOGGING-BACKEND-CONTRACTS
status: ai-draft
owner: [MISSING: backend contract owner]
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: partial
upstream:
  - docs/intent/goal-impact.md
  - docs/intent/contracts-integration-assumptions.md
downstream:
  - docs/intent/execution-plan.md
  - docs/intent/validation-criteria.md
related_adrs:
  - [UNKNOWN: no ADR references present in local checkout]

## Purpose

Define draft backend API contracts needed by the logging frontend for customer API keys and hooks, AI log-pattern analysis, and notification alert policies.

These contracts are integration targets, not evidence of implemented logging
API-key, hook-management, AI-analysis, alert-policy, or billing/trial backend
routes. Remote source review on 2026-06-13 found implemented log
ingest/query/services routes in `/home/ssf/Documents/Github/logging-microservice`
and adjacent customer-auth/payment/webhook/AI-completion routes in sibling
services, but no OpenAPI document, generated client, logging API-key controller,
logging hook-management controller, logging AI-analysis controller, logging
alert-policy controller, or logging billing/trial entitlement controller.

## Backend Evidence Review

Reviewed remote repository: `/home/ssf/Documents/Github/logging-microservice` on `alfares`.

Evidence files inspected remotely:

- `src/logs/logs.controller.ts`
- `src/logs/logs.service.ts`
- `src/logs/dto/log-entry.dto.ts`
- `src/auth/admin-role.guard.ts`
- `src/info/info.controller.ts`
- `README.md`
- `SYSTEM.md`
- `web/admin/index.html`
- `web/customer/index.html`

Implemented backend routes found:

| Method | Path | Auth | Evidence |
| --- | --- | --- | --- |
| `POST` | `/api/logs` | No route guard in controller | `src/logs/logs.controller.ts` |
| `GET` | `/api/logs/query` | `AdminRoleGuard` | `src/logs/logs.controller.ts` |
| `GET` | `/api/logs/services` | `AdminRoleGuard` | `src/logs/logs.controller.ts` |
| `GET` | `/api/logs/marathon-events/summary` | No route guard in controller | `src/logs/logs.controller.ts` |

Implemented admin roles found:

- `global:superadmin`
- `app:logging-microservice:admin`
- `internal:logging-microservice:admin`

Contract gaps confirmed by remote source review:

- [MISSING: implemented customer API key endpoints].
- [MISSING: implemented customer hook-management endpoints].
- [MISSING: implemented AI log-pattern analysis endpoints].
- [MISSING: implemented notification alert-policy endpoints].
- [MISSING: implemented logging billing/trial endpoints].
- [MISSING: OpenAPI, Swagger, generated client, or machine-readable schema for these draft contracts].

## Cross-Service Evidence Review

T1 reviewed likely sibling service owners under `/home/ssf/Documents/Github/*`
on `alfares` using read-only source inspection.

| Domain | Repository | Evidence file | Endpoint | Auth | Response shape | Pagination/filtering | Integration status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Customer auth | `auth-microservice` | `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/dto/auth-response.dto.ts`, `src/auth/guards/jwt-auth.guard.ts`, `src/main.ts` | `POST /auth/register`, `POST /auth/login`, `POST /auth/validate`, `POST /auth/refresh`, `GET /auth/profile` | Login/register/validate are controller-public; profile uses `JwtAuthGuard`; global validation pipe enabled | Login/register/refresh return `{ user, accessToken, refreshToken }`; validate returns `{ valid: true, user }`; profile returns `{ user }` | No list pagination | Authoritative for customer-auth adapter planning. |
| Payment API-key consumption | `payments-microservice` | `src/security/api-key.guard.ts`, `src/security/api-key-scope.util.ts`, `src/payments/payments.controller.ts`, `src/connect/connect.controller.ts`, `src/common/filters/http-exception.filter.ts`, `src/main.ts` | `POST /payments/create`, `GET /payments/:paymentId`, `POST /payments/:paymentId/refund`, `POST /stripe/connect/accounts`, `GET /stripe/connect/accounts/:applicationId/:connectedUserId` | `x-api-key` against `API_KEYS`; scopes from `PAYMENT_API_KEY_SCOPES`; controllers use `@Public()` plus `ApiKeyGuard` | Success uses `{ success: true, data }`; failures use `{ error: { code, message } }` | Point reads/mutations only | Evidence of service API-key consumption, not customer-managed logging API keys. |
| Billing/trial | `payments-microservice` | `src/payments/payments.controller.ts`, `src/payments/dto/create-payment.dto.ts`, `src/connect/connect.controller.ts` | Payment creation/status/refund and Stripe Connect account routes only | `x-api-key` with route scopes | Payment and Connect data envelopes only | No plan, subscription, trial, invoice-list, or entitlement list route found | [MISSING: logging billing/trial contract]. |
| Webhook subscriptions | `notifications-microservice` | `src/email/webhook-subscription.controller.ts`, `src/email/dto/webhook-subscription.dto.ts`, `src/email/webhook-subscription.service.ts`, `src/email/entities/webhook-subscription.entity.ts`, `src/auth/jwt-roles.guard.ts`, `src/main.ts` | `POST/GET /webhooks/subscriptions`, `GET/PUT/DELETE /webhooks/subscriptions/:id`, activate/suspend/remediate routes | Global `JwtRolesGuard`; default roles are `global:superadmin` or `internal:notifications-microservice:admin`; static service token can grant internal admin roles | Subscription entities are returned directly and include URL, optional `secret`, filters, status, retry/delivery counters, timestamps | `findAll()` orders by `createdAt DESC`; no pagination | Email-inbound webhook evidence only; not approved as logging customer hook UI contract because secret/redaction and tenant scope are not aligned. |
| Notifications | `notifications-microservice` | `src/notifications/notifications.controller.ts`, `shared/utils/api-response.util.ts`, `src/auth/jwt-roles.guard.ts` | `POST /notifications/send`, `GET /notifications/history`, `GET /notifications/status/:id` | Global `JwtRolesGuard` | `{ success: true, data }` or `{ success: false, error: { code, message, details } }` | History accepts `limit` and `offset` | Useful for notification send/status adapter shape; no alert-policy CRUD/rule endpoint found. |
| AI completion | `ai-microservice` | `src/ai/ai.controller.ts`, `src/contracts/ai-complete.contract.ts`, `src/service-identity/service-auth.guard.ts`, `src/service-identity/service-identity.module.ts`, `src/common/filters/contract-violation.filter.ts`, `src/service-identity/inference-log.interceptor.ts`, `src/main.ts` | `POST /ai/complete` | Global `ServiceAuthGuard`; requires service JWT bearer token unless route has `@Public()`; this route is not public | Zod response includes `schemaVersion`, `text`, `model_used`, token usage fields, optional error and agent fields; contract violation response is `{ error: "contract_violation", context, issues }` | No list pagination/filtering | Generic AI completion only; no logging pattern-analysis run/finding/redaction contract found. |
| Alert policies | `logging-microservice`, `notifications-microservice`, `ai-microservice` | Targeted controller/source searches | [MISSING: implemented logging alert-policy endpoint] | [MISSING: alert-policy auth contract] | [MISSING: alert-policy response shape] | [MISSING: alert-policy pagination/filtering behavior] | T4 remains blocked for alert-policy management. |

No raw logs, bearer tokens, API keys, customer identifiers, production records,
or secrets were copied during this review.

## Shared Contract Rules

- Implemented logging API base path: `/api/logs`.
- Draft extension base path for new contracts: `/api/v1`.
- Media type: `application/json`.
- Authentication: bearer session or service token issued by the auth microservice.
- Tenant scope: every request is evaluated against the caller's active `tenant_id`; clients must not send tenant identifiers in paths unless explicitly documented by backend route definitions.
- Authorization failures must be deny-by-default and return `403` without leaking whether a restricted resource exists.
- Time format: RFC 3339 UTC timestamps.
- ID format: opaque strings. Clients must not parse IDs for semantics.
- Pagination: list endpoints return `items`, optional `next_cursor`, and `has_more`.
- Sorting for implemented log query: ascending by `timestamp`.
- Sorting for draft extension contracts: newest-first by `created_at` or `last_seen_at` unless an endpoint states otherwise.
- Sensitive fields: API secrets, webhook signing secrets, raw headers, raw payloads, and unredacted log metadata must not be returned to browser clients.
- Idempotency: mutation endpoints that can be retried should accept `Idempotency-Key`.

### Draft Extension Error Response

Implemented logging controllers currently use `success`, `message`, `data`, `count`, and `error` response fields. Use this standard error response only for new or revised backend contracts after backend review.

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Request validation failed.",
    "request_id": "req_synthetic_01",
    "fields": [
      {
        "name": "target_url",
        "reason": "Must be a valid HTTPS URL."
      }
    ]
  }
}
```

Required error codes:

- `unauthenticated`
- `forbidden`
- `not_found`
- `conflict`
- `validation_failed`
- `rate_limited`
- `upstream_unavailable`
- `internal_error`

## Contract: Customer API Keys

Evidence status: no implemented logging API-key lifecycle endpoint was found.
`payments-microservice` has an `x-api-key` consumer guard for payment routes,
but it does not expose customer-managed logging API-key list/create/rotate/revoke
routes. The contract below remains a draft target.

### Intent Trace

Vision -> Goal Impact: customers connect applications through API keys -> System: logging microservice browser interface -> Feature: customer dashboard API keys -> Task: backend contract -> Execution Plan: integration adapter after contract validation -> Code: [MISSING: future API client] -> Validation: [MISSING: contract validation evidence].

### Permissions

- List key metadata: `logging.api_keys.read`.
- Create key: `logging.api_keys.create`.
- Rotate key: `logging.api_keys.rotate`.
- Revoke key: `logging.api_keys.revoke`.
- Admin override: `logging.admin`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/api-keys` | List API key metadata for the active tenant. |
| `POST` | `/api/v1/api-keys` | Create a scoped API key and return the plaintext secret once. |
| `POST` | `/api/v1/api-keys/{api_key_id}/rotate` | Create a replacement secret and mark the previous secret as rotated. |
| `POST` | `/api/v1/api-keys/{api_key_id}/revoke` | Revoke an API key. |

### API Key Object

```json
{
  "id": "ak_synthetic_01",
  "name": "Production ingest",
  "prefix": "lg_live_abc1",
  "scopes": ["logs:write"],
  "status": "active",
  "created_at": "2026-06-13T12:00:00Z",
  "last_used_at": "2026-06-13T12:30:00Z",
  "expires_at": null,
  "created_by_user_id": "usr_synthetic_01"
}
```

Allowed `status` values: `active`, `rotated`, `revoked`, `expired`.

Allowed `scopes` values:

- `logs:write`
- `logs:read`
- `hooks:write`
- `hooks:read`

### Create Request

```json
{
  "name": "Production ingest",
  "scopes": ["logs:write"],
  "expires_at": null
}
```

### Create Response

```json
{
  "api_key": {
    "id": "ak_synthetic_01",
    "name": "Production ingest",
    "prefix": "lg_live_abc1",
    "scopes": ["logs:write"],
    "status": "active",
    "created_at": "2026-06-13T12:00:00Z",
    "last_used_at": null,
    "expires_at": null,
    "created_by_user_id": "usr_synthetic_01"
  },
  "secret": "lg_live_synthetic_secret_displayed_once"
}
```

Frontend handling rule: `secret` may be displayed once after creation or rotation, must not be persisted in local storage, fixtures, analytics, screenshots, or logs.

## Contract: Customer Hooks

Evidence status: `notifications-microservice` has email-inbound webhook
subscription management under `/webhooks/subscriptions`, but it is not a logging
customer hook contract. It returns subscription entities directly, including an
optional `secret` field, and has no tenant-scoped logging event model. The
contract below remains a draft target until a logging-specific hook owner
approves reuse or a new backend route.

### Intent Trace

Vision -> Goal Impact: customers connect applications through webhooks -> System: logging microservice browser interface -> Feature: customer dashboard hooks -> Task: backend contract -> Execution Plan: integration adapter after contract validation -> Code: [MISSING: future API client] -> Validation: [MISSING: contract validation evidence].

### Permissions

- List hook metadata: `logging.hooks.read`.
- Create hook: `logging.hooks.create`.
- Update hook: `logging.hooks.update`.
- Disable or delete hook: `logging.hooks.delete`.
- Test hook delivery: `logging.hooks.test`.
- Admin override: `logging.admin`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/hooks` | List customer hooks for the active tenant. |
| `POST` | `/api/v1/hooks` | Create a hook subscription. |
| `PATCH` | `/api/v1/hooks/{hook_id}` | Update hook target, events, filters, or enabled state. |
| `DELETE` | `/api/v1/hooks/{hook_id}` | Delete a hook subscription. |
| `POST` | `/api/v1/hooks/{hook_id}/test` | Send a synthetic test delivery. |
| `GET` | `/api/v1/hooks/{hook_id}/deliveries` | List delivery metadata and retry status. |

### Hook Object

```json
{
  "id": "hook_synthetic_01",
  "name": "Incident router",
  "target_url": "https://example.invalid/log-events",
  "events": ["log.error.created", "analysis.pattern.detected"],
  "severity_filter": ["error", "critical"],
  "enabled": true,
  "signing_secret_prefix": "whsec_syn",
  "created_at": "2026-06-13T12:00:00Z",
  "updated_at": "2026-06-13T12:10:00Z",
  "last_delivery_at": "2026-06-13T12:15:00Z"
}
```

Allowed `events` values:

- `log.warning.created`
- `log.error.created`
- `log.critical.created`
- `analysis.pattern.detected`
- `alert.policy.triggered`

Allowed `severity_filter` values: `debug`, `info`, `warning`, `error`, `critical`.

### Create Or Update Request

```json
{
  "name": "Incident router",
  "target_url": "https://example.invalid/log-events",
  "events": ["log.error.created", "analysis.pattern.detected"],
  "severity_filter": ["error", "critical"],
  "enabled": true
}
```

### Delivery Object

```json
{
  "id": "hd_synthetic_01",
  "hook_id": "hook_synthetic_01",
  "event": "log.error.created",
  "status": "delivered",
  "attempt_count": 1,
  "last_attempt_at": "2026-06-13T12:15:00Z",
  "next_retry_at": null,
  "response_status": 202,
  "request_id": "req_synthetic_02"
}
```

Allowed delivery `status` values: `queued`, `delivered`, `retrying`, `failed`, `disabled`.

Security rule: the backend signs outbound hook deliveries. Browser clients may view only `signing_secret_prefix`; full signing secrets are write-only and rotation is [MISSING: endpoint to rotate hook signing secret].

## Contract: AI Log-Pattern Analysis

Evidence status: `ai-microservice` has a generic `POST /ai/complete`
service-to-service endpoint with Zod request/response schemas. No implemented
logging pattern list, analysis run, finding status, event-reference, or
raw-log-redaction endpoint was found. The contract below remains a draft target.

### Intent Trace

Vision -> Goal Impact: administrators inspect AI analysis -> System: logging microservice browser interface -> Feature: AI pattern analysis -> Task: backend contract -> Execution Plan: integration adapter after contract validation -> Code: [MISSING: future API client] -> Validation: [MISSING: contract validation evidence].

### Permissions

- View analysis: `logging.analysis.read`.
- Start analysis run: `logging.analysis.run`.
- Dismiss or annotate findings: `logging.analysis.update`.
- Admin override: `logging.admin`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/analysis/patterns` | List detected log patterns and anomalies. |
| `POST` | `/api/v1/analysis/runs` | Start an analysis run for a bounded time range and service set. |
| `GET` | `/api/v1/analysis/runs/{run_id}` | Read analysis run status and summary. |
| `PATCH` | `/api/v1/analysis/patterns/{pattern_id}` | Update finding status or operator note. |

### Pattern Object

```json
{
  "id": "pat_synthetic_01",
  "run_id": "run_synthetic_01",
  "title": "Payment timeout spike",
  "summary": "Timeout errors increased above baseline for the payment service.",
  "severity": "high",
  "confidence": 0.91,
  "status": "open",
  "service": "payments",
  "environment": "production",
  "first_seen_at": "2026-06-13T11:40:00Z",
  "last_seen_at": "2026-06-13T12:00:00Z",
  "sample_event_ids": ["evt_synthetic_01", "evt_synthetic_02"],
  "recommended_actions": ["Inspect upstream payment gateway latency."],
  "created_at": "2026-06-13T12:01:00Z"
}
```

Allowed `severity` values: `low`, `medium`, `high`, `critical`.

Allowed `status` values: `open`, `acknowledged`, `dismissed`, `resolved`.

### Run Request

```json
{
  "from": "2026-06-13T11:00:00Z",
  "to": "2026-06-13T12:00:00Z",
  "services": ["payments", "api-gateway"],
  "severity": ["warning", "error", "critical"],
  "analysis_profile": "incident_triage"
}
```

Allowed `analysis_profile` values:

- `incident_triage`
- `regression_detection`
- `noise_reduction`

### Run Object

```json
{
  "id": "run_synthetic_01",
  "status": "completed",
  "from": "2026-06-13T11:00:00Z",
  "to": "2026-06-13T12:00:00Z",
  "started_at": "2026-06-13T12:00:30Z",
  "completed_at": "2026-06-13T12:01:10Z",
  "patterns_detected": 3,
  "request_id": "req_synthetic_03"
}
```

Allowed run `status` values: `queued`, `running`, `completed`, `failed`, `cancelled`.

Data handling rule: analysis responses may include synthetic summaries and references to event IDs, but must not return raw sensitive log bodies unless the caller also has `logging.logs.read_sensitive` and the response is explicitly redacted for browser display.

## Contract: Notification Alert Policies

Evidence status: `notifications-microservice` has notification send, history,
and status endpoints, but no logging alert-policy CRUD, matching, throttling,
or test-policy route was found. The contract below remains a draft target.

### Intent Trace

Vision -> Goal Impact: administrators manage notification integrations and alert behavior -> System: logging microservice browser interface -> Feature: alert policies -> Task: backend contract -> Execution Plan: integration adapter after contract validation -> Code: [MISSING: future API client] -> Validation: [MISSING: contract validation evidence].

### Permissions

- List policies: `logging.alert_policies.read`.
- Create policies: `logging.alert_policies.create`.
- Update policies: `logging.alert_policies.update`.
- Delete policies: `logging.alert_policies.delete`.
- Test policies: `logging.alert_policies.test`.
- Admin override: `logging.admin`.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/alert-policies` | List alert policies for the active tenant. |
| `POST` | `/api/v1/alert-policies` | Create an alert policy. |
| `GET` | `/api/v1/alert-policies/{policy_id}` | Read a single alert policy. |
| `PATCH` | `/api/v1/alert-policies/{policy_id}` | Update policy criteria, channels, throttling, or enabled state. |
| `DELETE` | `/api/v1/alert-policies/{policy_id}` | Delete an alert policy. |
| `POST` | `/api/v1/alert-policies/{policy_id}/test` | Send a synthetic test notification. |

### Alert Policy Object

```json
{
  "id": "ap_synthetic_01",
  "name": "Critical payment failures",
  "enabled": true,
  "criteria": {
    "services": ["payments"],
    "environments": ["production"],
    "severity": ["critical"],
    "match": {
      "field": "message",
      "operator": "contains",
      "value": "payment failed"
    },
    "threshold": {
      "count": 5,
      "window_seconds": 300
    }
  },
  "channels": [
    {
      "type": "email",
      "target": "ops-team@example.invalid"
    },
    {
      "type": "webhook",
      "target_hook_id": "hook_synthetic_01"
    }
  ],
  "throttle_seconds": 900,
  "created_at": "2026-06-13T12:00:00Z",
  "updated_at": "2026-06-13T12:10:00Z",
  "last_triggered_at": "2026-06-13T12:20:00Z"
}
```

Allowed channel `type` values:

- `email`
- `webhook`
- `slack`
- `pagerduty`

Allowed match `operator` values:

- `equals`
- `contains`
- `starts_with`
- `ends_with`
- `regex`

Regex rule: regex matching must be evaluated server-side with bounded execution time. The frontend must not validate backend regex semantics beyond basic non-empty input.

### Create Or Update Request

```json
{
  "name": "Critical payment failures",
  "enabled": true,
  "criteria": {
    "services": ["payments"],
    "environments": ["production"],
    "severity": ["critical"],
    "match": {
      "field": "message",
      "operator": "contains",
      "value": "payment failed"
    },
    "threshold": {
      "count": 5,
      "window_seconds": 300
    }
  },
  "channels": [
    {
      "type": "webhook",
      "target_hook_id": "hook_synthetic_01"
    }
  ],
  "throttle_seconds": 900
}
```

### Test Response

```json
{
  "test_id": "apt_synthetic_01",
  "status": "queued",
  "channels": [
    {
      "type": "webhook",
      "target_hook_id": "hook_synthetic_01",
      "status": "queued"
    }
  ],
  "request_id": "req_synthetic_04"
}
```

## Validation Expectations

- Contract examples must parse as JSON.
- Contract examples must use only synthetic IDs, domains, emails, and secrets.
- Endpoint paths, permissions, enum values, and error codes must be reviewed against backend implementation before frontend integration.
- API client work for implemented logging routes and Auth customer login/profile
  can proceed to adapter planning using the evidence above.
- API client work for logging API-key lifecycle, logging hooks, billing/trial,
  AI log-pattern analysis, and alert policies remains blocked until
  [MISSING: authoritative backend contract evidence source] is provided.
- Browser UI must treat all contract fields not listed here as unsupported unless a reviewed contract update adds them.

## Open Questions

- Auth/customer session base route evidence exists in `auth-microservice`, but
  frontend deployment URL mapping is [MISSING: authoritative gateway/base URL for
  browser auth calls].
- Auth token claim evidence includes `sub`, `email`, `type`, and `roles`; tenant
  and fine-grained permission claim names remain [MISSING].
- [MISSING: backend owner approval for API key lifecycle semantics].
- [MISSING: backend owner approval for hook delivery retry and signing-secret rotation semantics].
- [MISSING: AI service owner approval for analysis profiles, confidence scores, and raw-log redaction behavior].
- [MISSING: notification service owner approval for alert policy matching, throttling, and channel provider support].
- [MISSING: logging billing/trial owner and entitlement route contract].

## T5-D Decision: Logging Entitlements

Owner decision recorded on 2026-06-15: logging-specific billing/trial/plan/entitlement projection lives in `logging-microservice`.

Current evidence still shows no implemented entitlement controller. The approved ownership direction is:

- `logging-microservice` owns the customer-dashboard entitlement read model for logging features.
- `payments-microservice` remains upstream payment-state evidence only and is not the browser-facing entitlement authority.
- `auth-microservice` remains identity, token, and RBAC role-claim authority.

### Planned Endpoint

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/v1/entitlements/current` | Auth bearer token, tenant-scoped | Return active tenant logging entitlement state. |

### Planned Response Shape

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

### Open Items

- tenant scope v1: derive `tenant_id` as `auth_user:<Auth user id>` from Auth `/auth/validate` user `id`, with future migration marker for organization tenants.
- permission v1: `logging.dashboard.read`; admin overrides: `global:superadmin`, `app:logging-microservice:admin`, `internal:logging-microservice:admin`.
- [MISSING: source of payment-to-plan activation events].
- [MISSING: persistence model for plan, trial, and usage counters].
- [MISSING: runtime implementation and tests].


### T5-D Auth And Tenant Scope Resolution

Resolved on 2026-06-15 for v1 implementation:

- Customer entitlement reads require `logging.dashboard.read` in the Auth `roles` array.
- Existing admin roles also authorize the read: `global:superadmin`, `app:logging-microservice:admin`, and `internal:logging-microservice:admin`.
- Auth `/auth/validate` currently returns sanitized user fields and roles but no organization tenant claim.
- Logging v1 derives `tenant_id` as `auth_user:<Auth user id>` from Auth user `id`, falling back to Auth token `sub` only if present in validation output.
- Organization/workspace tenant support remains a future migration and must not be inferred by the frontend.
- Runtime implementation currently returns a conservative `not_configured`/`logging_free` default with paid feature flags disabled until persistence and payment activation are approved.
