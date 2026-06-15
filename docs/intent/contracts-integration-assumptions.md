# Logging Frontend Contracts And Integration Assumptions

Status: ai-draft

## G1 Discovery Summary

G1 contract discovery reviewed the remote backend repository at
`/home/ssf/Documents/Github/logging-microservice` on `alfares`.
T1 cross-service discovery then reviewed likely sibling owners under
`/home/ssf/Documents/Github/*` for customer API-key, hook, AI-analysis,
alert-policy, billing/trial, and customer-auth endpoints.

Evidence sources:

- `src/logs/logs.controller.ts`
- `src/logs/logs.service.ts`
- `src/logs/dto/log-entry.dto.ts`
- `src/auth/admin-role.guard.ts`
- `src/info/info.controller.ts`
- `README.md`
- `SYSTEM.md`

No OpenAPI document or generated frontend client was found during discovery.

Cross-service evidence summary:

| Domain | Repository | Evidence file | Endpoint | Auth | Response shape | Pagination/filtering | Status for logging frontend |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Customer auth | `auth-microservice` | `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/dto/auth-response.dto.ts`, `src/auth/guards/jwt-auth.guard.ts`, `src/main.ts` | `POST /auth/register`, `POST /auth/login`, `POST /auth/validate`, `POST /auth/refresh`, `GET /auth/profile`, password/magic-link/oauth routes | Login/register public; profile uses `JwtAuthGuard`; validate is public controller route used by services | Login/register/refresh return `{ user, accessToken, refreshToken }`; validate returns `{ valid: true, user: { ...roles } }`; profile returns `{ user }` | No list pagination; validation pipe uses whitelist/forbid/transform | Authoritative customer-auth evidence; unblocks T4 auth adapter planning for login/profile/token validation only. |
| Customer API keys | `payments-microservice` | `src/security/api-key.guard.ts`, `src/security/api-key-scope.util.ts`, `src/payments/payments.controller.ts`, `src/connect/connect.controller.ts` | `POST /payments/create`, `GET /payments/:paymentId`, `POST /payments/:paymentId/refund`, `POST /stripe/connect/accounts`, `GET /stripe/connect/accounts/:applicationId/:connectedUserId` | `x-api-key` checked against `API_KEYS`; route scopes from `PAYMENT_API_KEY_SCOPES`; global JWT guard bypassed by `@Public()` on these controllers | Success envelopes use `{ success: true, data: ... }`; errors use `{ error: { code, message } }` through filters | Point reads and mutations only; no customer API-key CRUD/list endpoint found | Evidence confirms service API-key consumption for Payments, not logging customer API-key management. T4 remains blocked for logging API-key lifecycle. |
| Billing/trial | `payments-microservice` | `src/payments/payments.controller.ts`, `src/payments/dto/create-payment.dto.ts`, `src/connect/connect.controller.ts` | Same payment and Stripe Connect endpoints above | `x-api-key` plus scopes such as `payments:create`, `payments:read`, `payments:refund`, `connect:create`, `connect:read` | Create payment returns payment id, status, redirect URL, expiry field; get status returns bounded payment fields; Connect returns connected account metadata | No billing subscription, trial, invoice-list, plan, checkout-session, or entitlement endpoint found for logging | Adjacent payment contract only; logging billing/trial remains [MISSING: implemented billing/trial contract]. |
| Hooks | `notifications-microservice` | `src/email/webhook-subscription.controller.ts`, `src/email/dto/webhook-subscription.dto.ts`, `src/email/webhook-subscription.service.ts`, `src/email/entities/webhook-subscription.entity.ts`, `src/auth/jwt-roles.guard.ts`, `src/main.ts` | `POST /webhooks/subscriptions`, `GET /webhooks/subscriptions`, `GET /webhooks/subscriptions/:id`, `PUT /webhooks/subscriptions/:id`, `DELETE /webhooks/subscriptions/:id`, `POST /webhooks/subscriptions/:id/activate`, `POST /webhooks/subscriptions/:id/suspend`, `POST /webhooks/subscriptions/remediate-duplicates` | Global `JwtRolesGuard`; default roles are `global:superadmin` or `internal:notifications-microservice:admin`; service token can grant internal admin roles | Controller returns entity objects directly for subscription routes; entity includes `id`, `serviceName`, `webhookUrl`, `secret`, `filters`, `status`, retry/delivery counters, timestamps | `findAll()` orders by `createdAt DESC`; no pagination; filters are subscription delivery filters, not list filters | Authoritative webhook subscription evidence, but email-inbound specific and exposes `secret`; not approved as logging customer hook contract without owner review and redaction change. |
| Notification send/history | `notifications-microservice` | `src/notifications/notifications.controller.ts`, `shared/utils/api-response.util.ts`, `src/auth/jwt-roles.guard.ts` | `POST /notifications/send`, `GET /notifications/history?limit&offset`, `GET /notifications/status/:id` | Global `JwtRolesGuard`; default/admin/internal roles as above unless route marked public | API response utility returns `{ success: true, data }` or `{ success: false, error: { code, message, details } }` | History supports `limit` and `offset`; status is point read | Can inform notification adapter shape, but no logging alert-policy CRUD or rule evaluation endpoint was found. |
| AI completion | `ai-microservice` | `src/ai/ai.controller.ts`, `src/contracts/ai-complete.contract.ts`, `src/service-identity/service-auth.guard.ts`, `src/service-identity/service-identity.module.ts`, `src/common/filters/contract-violation.filter.ts`, `src/service-identity/inference-log.interceptor.ts` | `POST /ai/complete` | Global `ServiceAuthGuard`; requires `Authorization: Bearer <service JWT>` unless route has `@Public()`; `ai/complete` is not public | Zod response schema: `{ schemaVersion, text, model_used, inputTokens?, outputTokens?, token_usage_estimate?, error_code?, error_message?, agent_*? }`; contract violations return `{ error: "contract_violation", context, issues }` | No list pagination or filtering; request includes prompt/schema/model tier/correlation/business fields | Authoritative generic AI completion evidence; no logging-specific pattern analysis, run tracking, finding status, or raw-log redaction contract found. |
| Alert policies | `logging-microservice`, `notifications-microservice`, `ai-microservice` | Route/controller searches in likely owner repos | [MISSING: implemented logging alert-policy endpoint] | [MISSING: alert-policy auth contract] | [MISSING: alert-policy response shape] | [MISSING: alert-policy pagination/filtering behavior] | T4 remains blocked for alert-policy management. |

## Known Contracts

- Backend service: `logging-microservice`.
- Runtime and framework: NestJS service on port `3367`.
- External domain documented by backend: `https://logging.alfares.cz`.
- Internal Kubernetes URL documented by backend: `http://logging-microservice:3367`.
- Frontend target: new browser-based interface.
- Implemented frontend shell: static SPA in `index.html`, `styles.css`, and `app.js`.
- Implemented route states: `landing`, `dashboard`, and `admin`.
- Backend API schema source: route definitions and handwritten docs in the remote backend repository.
- OpenAPI or generated client source: [MISSING: no OpenAPI or generated client discovered].

## Endpoint Contract

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/logs` | No guard found in controller | Ingest one structured log entry. |
| `GET` | `/api/logs/query` | `AdminRoleGuard` | Query stored logs with filters. |
| `GET` | `/api/logs/services` | `AdminRoleGuard` | List service names with service log files. |
| `GET` | `/api/logs/marathon-events/summary` | No guard found in controller | Return a sanitized Marathon event summary. |
| `GET` | `/health` | No guard found in route discovery | Health check. |
| `GET` | `/info` | No guard found in route discovery | Service information and endpoint list. |
| `GET` | `/api` | No guard found in route discovery | Handwritten API information. |

Customer dashboard endpoints for tenant-scoped API keys, webhooks, SDK setup,
billing, alert policies, AI analysis, or notification preferences were not found
in `logging-microservice`.

Sibling services provide adjacent capabilities, but not a complete logging
customer dashboard contract:

- `auth-microservice` provides customer authentication and profile/token routes.
- `payments-microservice` consumes service API keys for payment and Stripe
  Connect routes, but does not expose customer-managed logging API-key CRUD.
- `notifications-microservice` exposes email webhook subscription management and
  notification send/history/status routes, but not logging alert-policy CRUD.
- `ai-microservice` exposes generic service-to-service completion, but not
  logging pattern-analysis runs or findings.

## Auth And Authorization Contract

Protected read endpoints use `AdminRoleGuard`.

Request requirement:

- Header: `Authorization: Bearer <Auth access token>`.

Token validation flow:

- Backend calls `POST {AUTH_SERVICE_URL}/auth/validate`.
- Request body shape: `{ "token": "<bearer token without prefix>" }`.
- Expected auth response shape: `{ "valid": true, "user": { "roles": [...] } }`.

Authorized roles:

- `global:superadmin`
- `app:logging-microservice:admin`
- `internal:logging-microservice:admin`

Failure behavior:

- Missing bearer token: `401` with message `Missing bearer token`.
- Invalid token: `401` with message `Invalid bearer token`.
- Auth service unavailable: `401` with message `Auth validation unavailable`.
- Valid token without an allowed role: `403` with message `Logging admin role required`.

Frontend implication: the current local assumption of `logging.admin` does not
match the discovered backend. The frontend should map backend roles to an
internal UI capability only after integration, or display backend role names
directly in admin access documentation.

Customer dashboard authorization remains [UNKNOWN: no tenant-scoped dashboard
read contract or `logging.dashboard.read` permission was found in the logging
backend].

## Ingestion Contract

`POST /api/logs` request body accepts:

- `level`: required enum, one of `error`, `warn`, `info`, `debug`.
- `service`: required non-empty string.
- `message`: optional string.
- `msg`: optional string accepted as an alternate message field.
- `timestamp`: optional string; backend uses current ISO timestamp when omitted.
- `task_id`: optional string.
- `project_id`: optional string.
- `business_id`: optional string.
- `agent_id`: optional string.
- `correlation_id`: optional string.
- `duration_ms`: optional number.
- `metadata`: optional object.

Backend docs say `message` is required, but the DTO and service currently allow
both `message` and `msg` to be omitted; the backend stores `(no message)` when
neither is provided. This mismatch should be resolved before a strict frontend
validator is added.

Success response:

```json
{ "success": true, "message": "Log ingested successfully" }
```

Controller error response for ingestion failures:

```json
{ "success": false, "message": "Failed to ingest log", "error": "..." }
```

Validation-pipe error behavior is [UNKNOWN: main bootstrap and validation pipe
configuration were not fully traced into this frontend checkout].

## Query Contract

`GET /api/logs/query` query parameters:

- `service`: optional string; file-level match uses filename inclusion.
- `level`: optional string; exact log entry match against `level`.
- `startDate`: optional string; compared lexicographically against `timestamp`.
- `endDate`: optional string; compared lexicographically against `timestamp`.
- `limit`: optional number; defaults to `100`.
- `task_id`: optional string; exact match against `task_id`.
- `project_id`: optional string; exact match against `project_id`.

Success response:

```json
{ "success": true, "data": [], "count": 0 }
```

Returned log entry shape is the stored JSON shape from ingestion:

- `level`
- `message`
- `service`
- `timestamp`
- `task_id`
- `project_id`
- `business_id`
- `agent_id`
- `correlation_id`
- `duration_ms`
- `metadata`

Ordering and pagination behavior:

- Results are sorted ascending by `timestamp` after file scan.
- `limit` truncates the result set.
- No `offset`, `page`, `cursor`, `nextCursor`, or total available count contract
  was found.
- `count` is only the number of returned rows.
- Search by message text or metadata keys was not found.

Controller error response for query failures:

```json
{ "success": false, "message": "Failed to query logs", "error": "..." }
```

Frontend implication: infinite scroll, cursor pagination, result totals, and
free-text search must remain disabled or explicitly marked as unavailable until
the backend contract changes.

## Services Contract

`GET /api/logs/services` returns service names inferred from per-service log
files.

Success response:

```json
{ "success": true, "data": ["svc-a", "svc-b"], "count": 2 }
```

Controller error response for service-list failures:

```json
{ "success": false, "message": "Failed to get services", "error": "..." }
```

## Marathon Event Summary Contract

`GET /api/logs/marathon-events/summary` query parameters:

- `windowMinutes`: optional number; coerced to the range `1` through `1440`,
  default `60`.
- `limit`: optional number; coerced to the range `1` through `100`, default `25`.

Success response:

```json
{
  "success": true,
  "data": {
    "service": "marathon",
    "generatedAt": "ISO 8601 string",
    "windowMinutes": 60,
    "totals": { "events": 0, "errors": 0, "warnings": 0 },
    "codes": [],
    "recent": []
  }
}
```

The backend exposes only allow-listed Marathon event fields in this summary.
This is a service-specific summary endpoint, not a general AI analysis contract.

## Sensitive-Data And Retention Contract

Backend project invariants and docs say this service must not store secrets, raw
customer records, or authorization headers. The query endpoint still returns
stored log entries including `metadata`, so frontend display must treat returned
fields as sensitive by default.

Confirmed retention/storage behavior:

- File-based logs are stored under `LOG_STORAGE_PATH`, documented default
  `./logs`.
- Daily rotation uses `LOG_ROTATION_MAX_SIZE` and `LOG_ROTATION_MAX_FILES`.
- `SYSTEM.md` documents no persistent volume claim; logs are lost on pod restart.
- Separate application, error, per-service JSON, and per-service human-readable
  files are written.

Redaction contract:

- General log query redaction before response: [MISSING: no general response
  redaction layer found].
- Authoritative sensitive-field list: [UNKNOWN: no complete field list found for
  all services].
- Marathon summary safe field allow-list exists in backend source, but applies
  only to `marathon-events/summary`.

## Remaining Assumptions To Verify

- Whether `POST /api/logs` should remain unauthenticated for browser-facing use.
- Whether admin role names are final public UI copy or should be mapped to
  product capabilities.
- Whether customer-facing tenant-scoped endpoints live in another service.
- Whether billing, trials, purchases, logging API-key management, logging hook
  management, notification preferences, and AI pattern analysis belong to other
  backend services beyond the adjacent routes found in Auth, Payments,
  Notifications, and AI.
- Whether backend will add stable cursor pagination, text search, metadata
  filters, descending sort, or total matching count.
- Whether validation errors use NestJS default response shape in production.
- Whether frontend may show raw `metadata`, copy it, export it, or persist it in
  browser storage.

## Integration Risks

- The current frontend `logging.admin` permission assumption does not match
  backend role names.
- Customer dashboard workflows are not backed by discovered logging backend
  endpoints.
- Query pagination is limit-only and can be nondeterministic across files before
  final timestamp sorting and truncation.
- Date filtering depends on timestamp string comparison; non-ISO timestamps can
  produce incorrect filtering.
- `service` filtering uses filename inclusion, not exact service equality.
- Raw metadata may expose sensitive data if the frontend displays it without
  masking.
- Unauthenticated endpoints may need gateway-level protection not visible in the
  controller source.

## Required Contract Evidence

- Implemented API endpoint list: remote `logging-microservice`
  `src/logs/logs.controller.ts`, `src/info/info.controller.ts`, `README.md`, and
  `SYSTEM.md`.
- Implemented log entry DTO: remote `src/logs/dto/log-entry.dto.ts`.
- Implemented query behavior: remote `src/logs/logs.service.ts`.
- Implemented admin auth requirements: remote `src/auth/admin-role.guard.ts`.
- [MISSING: OpenAPI or generated client reference].
- Customer auth evidence: remote `auth-microservice`
  `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`,
  `src/auth/dto/auth-response.dto.ts`, `src/auth/guards/jwt-auth.guard.ts`, and
  `src/main.ts`.
- Payment/API-key consumption evidence: remote `payments-microservice`
  `src/security/api-key.guard.ts`, `src/security/api-key-scope.util.ts`,
  `src/payments/payments.controller.ts`, `src/payments/dto/create-payment.dto.ts`,
  `src/connect/connect.controller.ts`, `src/common/filters/http-exception.filter.ts`,
  and `src/main.ts`.
- Notification/webhook evidence: remote `notifications-microservice`
  `src/email/webhook-subscription.controller.ts`,
  `src/email/dto/webhook-subscription.dto.ts`,
  `src/email/webhook-subscription.service.ts`,
  `src/email/entities/webhook-subscription.entity.ts`,
  `src/notifications/notifications.controller.ts`,
  `shared/utils/api-response.util.ts`, `src/auth/jwt-roles.guard.ts`, and
  `src/main.ts`.
- AI completion evidence: remote `ai-microservice` `src/ai/ai.controller.ts`,
  `src/contracts/ai-complete.contract.ts`,
  `src/service-identity/service-auth.guard.ts`,
  `src/service-identity/service-identity.module.ts`,
  `src/common/filters/contract-violation.filter.ts`, and `src/main.ts`.
- [MISSING: customer dashboard API contract tying Auth, Payments,
  Notifications, AI, and Logging into tenant-scoped logging product behavior].
- [MISSING: logging API-key lifecycle contract].
- [MISSING: logging hook lifecycle contract].
- [MISSING: logging billing/trial entitlement contract].
- [MISSING: logging alert-policy contract].
- [MISSING: logging AI pattern-analysis contract].
- [MISSING: general redaction/sensitive-field contract].

Validation evidence for T1: remote review used `ssh alfares` with read-only
`find`, `rg`, and `sed` commands against source and documentation paths. No
remote repository was edited. No raw logs, bearer tokens, API keys, customer
identifiers, production records, or secrets were copied into local files or
prompts.
