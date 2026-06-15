# Logging Frontend Validation Criteria

Status: ai-draft

## Upstream Traceability

- Vision: [UNKNOWN: approved upstream vision or product brief is not present in this checkout].
- Goal impact: `docs/intent/goal-impact.md`.
- Execution plan goal: `G2 Workflow and UX states` in `docs/intent/execution-plan.md`.
- Integration assumptions: `docs/intent/contracts-integration-assumptions.md`.
- Sensitive-data rules: `docs/intent/sensitive-data-notes.md`.

## G2 Workflow Scope

G2 defines route workflows and user-experience states for the logging
microservice frontend. It does not approve product scope, backend contracts,
role names, billing behavior, or sensitive-data exceptions.

In scope:

- Landing route workflow for discovery, pricing, trial/register, and buy/contact actions.
- Customer dashboard workflow for tenant-scoped log viewing, setup, API keys, webhooks, SDK guidance, filters, and detail access.
- Admin workflow for authorized service, error, warning, AI-analysis, notification, user, policy, audit-log, and settings review.
- Empty, loading, error, malformed-response, and permission-denied states for data-bearing views.
- Acceptance criteria that downstream frontend, integration, and validation agents can test.

Out of scope:

- Backend endpoint, schema, pagination, and error-format approval.
- Production authentication implementation.
- Real billing, checkout, provisioning, or sales workflows.
- Sensitive payload display, export, clipboard, analytics, or screenshot exceptions.

## Role And Permission Matrix

| User state | Required session attributes | Landing | Customer dashboard | Admin panel |
| --- | --- | --- | --- | --- |
| Guest | No authenticated session | Allowed | Denied with authentication-required state | Denied with authentication-required state |
| Customer user | Authenticated session, `tenant_id`, `logging.dashboard.read` | Allowed | Allowed | Denied unless a discovered logging backend admin role is present |
| Authenticated without tenant | Authenticated session, missing `tenant_id` | Allowed | Denied with tenant-scope-required state | Denied with tenant-scope-required state |
| Authenticated without admin | Authenticated session, `tenant_id`, missing discovered logging backend admin role | Allowed | Allowed when dashboard permission exists | Denied with explicit authorization state |
| Logging admin | Authenticated session, `tenant_id`, one of `global:superadmin`, `app:logging-microservice:admin`, or `internal:logging-microservice:admin` | Allowed | Allowed when dashboard permission exists | Allowed |

Open role facts:

- Discovered logging backend admin roles are `global:superadmin`, `app:logging-microservice:admin`, and `internal:logging-microservice:admin`.
- [UNKNOWN: exact production customer-dashboard role names and auth claim shape; derive from auth microservice contract].
- [UNKNOWN: whether customer dashboard and admin access use independent permissions or inherited role bundles].
- [MISSING: approved permission model owner].

## Route Workflows

### Landing Route

Acceptance criteria:

- Shows LogStream or approved product/service name as a first-viewport signal.
- Presents the service offer for centralized logging, search, analysis, retention, and operational diagnosis.
- Shows pricing tiers or explicit [MISSING: approved pricing source] placeholder before release.
- Provides trial/register and buy/contact paths without requiring authentication to view the page.
- Routes trial/register/demo actions to the customer dashboard path, where unauthenticated users receive an authentication-required state.
- Does not show real customer names, raw production logs, secrets, tokens, or production identifiers in hero previews, examples, or screenshots.
- Footer or supporting copy keeps auth and integration assumptions visible while they remain unverified.

### Customer Dashboard Route

Acceptance criteria:

- Denies unauthenticated users before rendering tenant data.
- Denies authenticated sessions that lack `tenant_id` or equivalent tenant-scoping claim.
- Denies authenticated sessions that lack `logging.dashboard.read` or approved equivalent.
- Shows tenant-scoped overview metrics only after authorization succeeds.
- Provides customer setup surfaces for API key, webhook, and SDK guidance.
- Treats visible API keys as synthetic or masked by default; real key reveal, copy, and rotation require approved backend and sensitive-data contracts.
- Shows recent logs with time, severity, service/application, message, and correlation/trace field when documented by backend contract.
- Supports search, filtering, sorting, and pagination only when backed by contract evidence from G1; otherwise labels those behaviors as static draft UI.
- Selecting a log entry opens or updates a detail view without mutating the log event.
- Detail view separates summary, metadata, stack trace/error detail, and structured payload, with raw payload hidden until G3 approves display rules.
- Provides empty states for no logs yet, no matching logs, filtered-out results, and data unavailable.
- Provides loading state for initial log fetch and for subsequent filter, sort, pagination, and detail fetches.
- Provides error states for authentication, authorization, network timeout, server failure, malformed response, and unavailable integration.

### Admin Route

Acceptance criteria:

- Denies unauthenticated users before rendering admin data.
- Denies authenticated sessions that lack `tenant_id` when the admin contract still requires tenant scoping.
- Denies authenticated users who lack one of the discovered backend admin roles or an approved equivalent; local role inference is not sufficient.
- Shows an explicit permission-denied state for authenticated non-admin users without implying restricted data exists.
- Shows admin overview metrics only after authorization succeeds.
- Provides service-level status, error/warning log review, AI analysis, notification integration, users, policy, audit-log, and settings navigation.
- Search and service filters preserve deterministic behavior across repeated requests when G1 documents backend support.
- AI analysis actions remain draft-only until a server-authorized AI-analysis endpoint and permissions are documented.
- Notification integration actions remain draft-only until notification service permissions and payload rules are documented.
- User, policy, audit-log, and settings views require separate acceptance criteria before implementation if they become data-bearing views.

## Functional Validation

- Landing page shows the service offer, pricing tiers, trial/register path, and buy/contact path.
- Customer dashboard route denies unauthenticated users.
- Customer dashboard route allows authenticated tenant-scoped users with `logging.dashboard.read`.
- Admin route denies authenticated users who do not have a discovered logging backend admin role.
- Admin route allows users with one of `global:superadmin`, `app:logging-microservice:admin`, or `internal:logging-microservice:admin`.
- Recent logs load successfully when the API is reachable and the user is authorized.
- Search, filters, sort order, and pagination match backend contract behavior.
- Selecting a log entry shows the expected detail view without mutating the event.
- Empty states distinguish between no matching logs, no logs available, and unavailable data.
- Error states distinguish authentication, authorization, network, server, and malformed-response failures where the API permits.

## UX State Validation

Every data-bearing route must define and test these states before release:

| State | Expected user experience | Required evidence |
| --- | --- | --- |
| Initial loading | Stable layout, visible progress indication, no stale tenant data from a previous session | Browser screenshot or automated UI assertion |
| Refresh/loading after controls change | Existing results remain understandable or are replaced by a loading state without layout overlap | Browser screenshot or automated UI assertion |
| Authorized with data | Data renders according to route workflow and sensitive-data rules | Automated assertion plus screenshot for release evidence |
| Empty no data | Explains that no logs or services exist yet, without suggesting an error | Automated assertion or screenshot |
| Empty no matches | Explains that current filters/search removed all results and offers filter reset | Automated assertion or screenshot |
| Authentication required | Guest receives login/register/session-required message before data renders | Automated assertion plus screenshot |
| Tenant scope required | Authenticated session without tenant claim receives a tenant-scope denial | Automated assertion |
| Permission denied | Authenticated user without route permission receives denial without restricted data preview | Automated assertion plus screenshot |
| Network failure | Retryable state, no sensitive diagnostic dump, no raw request details in UI | Automated assertion or simulated test evidence |
| Server failure | User-visible error category, correlation id only when non-sensitive and documented | Automated assertion or simulated test evidence |
| Malformed response | Safe fallback that reports unavailable data and does not render partial untrusted fields | Automated assertion or simulated test evidence |

## Log List And Detail Validation

- Log list columns must be derived from the documented backend schema after G1 completes.
- Until G1 completes, accepted draft columns are time, severity, application/service, message, and trace/correlation identifier.
- Time values must show timezone or be clearly labeled as relative/local/UTC.
- Severity must use text labels and visual treatment; color cannot be the only signal.
- Long messages, stack traces, identifiers, and metadata must wrap or scroll within their containers without overlapping controls.
- Pagination must not duplicate or skip records across repeated navigation when backend cursor behavior is documented.
- Sorting must be deterministic for equal timestamps; tie-break behavior is [MISSING: backend sort contract].
- Detail views must not write raw payloads to URL query strings, local storage, session storage, analytics, crash reporting, or browser history.
- Detail view copy/export/download controls remain disabled or guarded until G3 approves rules.

## Filter And Search Validation

- Search accepts service, message, severity, and trace/correlation terms only when the backend supports those fields.
- Filter state is visible and resettable.
- Empty-filter results are distinguishable from failed requests.
- Browser URL state for filters is [UNKNOWN: product decision pending]; if implemented, it must not include raw payloads, secrets, or sensitive identifiers.
- Client-side filtering is acceptable only for static demos or already-fetched synthetic data; production filtering must follow backend contract behavior.

## Sensitive-Data Validation

- Synthetic data is used in tests, examples, screenshots, and documentation.
- Sensitive fields are masked, redacted, or omitted according to classification.
- Raw log payloads are not written to local storage, session storage, analytics, crash reporting, or URL query parameters unless explicitly approved.
- Clipboard, export, and download flows are disabled or guarded until sensitivity rules are approved.
- API keys, webhook secrets, authorization headers, bearer tokens, session ids, customer identifiers, personal data, stack traces, and structured payloads are treated as sensitive until G3 documents otherwise.
- Screenshots for validation use synthetic records only.

### T2 Privacy Approval Validation Gates

These gates convert the T2 privacy approval checklist into testable release
criteria. A gate passes only when the referenced evidence is recorded; otherwise
it remains blocked or skipped with `[MISSING: ...]` or `[UNKNOWN: ...]`.

| Gate | Pass criteria | Fail criteria | Current status |
| --- | --- | --- | --- |
| Display allow-list | Every rendered log field is synthetic, server-redacted, or explicitly approved for the active role and tenant. | Any unclassified field, raw `metadata`, payload, stack trace, customer identifier, tenant identifier, personal data, secret, token, or internal hostname renders in list or detail UI. | Blocked by [MISSING: authoritative sensitive-field list] and [MISSING: backend redaction contract]. |
| Masking | Sensitive and unknown values are irreversibly masked, secrets use fixed redaction labels, and raw values are absent from DOM attributes, route state, console logs, and browser storage. | Partial secret reveal, reversible masking, raw values hidden only by CSS, or raw values present in attributes/state/storage. | Blocked by [MISSING: approved masking pattern list]. |
| Copy/clipboard | Log-bearing copy controls are disabled or copy only approved redacted fields and emit required audit events. | Copy controls place raw response fields, identifiers, stack traces, payloads, API keys, webhook secrets, or tokens on the clipboard. | Blocked by [UNKNOWN: whether copy actions are permitted] and [MISSING: audit event contract]. |
| Export/download/print | Export is disabled, or server-generated from an approved redacted dataset with documented role rules, retention, and audit logging. | Client-side CSV, JSON, print, or download is generated from raw API responses or includes unclassified fields. | Blocked by [MISSING: export endpoint] and [UNKNOWN: data governance owner]. |
| Screenshots | Validation screenshots show only synthetic placeholders and document synthetic provenance. | Screenshots include production/staging logs, real customer names, tenant IDs, emails, secrets, internal hostnames, routable webhook URLs, or copied incident data. | Skipped for T2 because generated artifacts are outside allowed scope; G6 must verify. |
| Telemetry | Analytics, error reporting, replay, breadcrumbs, and console output contain no log content, identifiers, auth claims, request bodies, response bodies, or backend error payloads. | Telemetry or diagnostics capture raw/masked-sensitive values, DOM snapshots of log-bearing screens, network bodies, or sensitive breadcrumbs. | Blocked by [UNKNOWN: telemetry vendor/config] and [MISSING: redaction configuration review]. |
| AI analysis | AI actions are disabled/draft-only, or use a server-authorized endpoint with documented permissions, redacted inputs, redacted outputs, audit events, and retention policy. | Frontend sends raw logs to a model, displays AI output derived from unapproved raw payloads, or stores prompts/responses without approval. | Blocked by [MISSING: AI-analysis endpoint] and [UNKNOWN: AI/security reviewer]. |
| Synthetic data | Fixtures, demos, prompts, and screenshots use hand-authored or generated fabricated records with non-routable examples. | Any example is copied or derived from production, staging, telemetry, customer tickets, screenshots, or incident reports. | Documentation rule passes; source/artifact inventory remains [UNKNOWN: outside T2 allowed-file scope]. |

Skipped privacy validation gates for the current T2 pass:

- Static source placeholder audit: skipped because frontend source files are
  forbidden for this workstream.
- Generated screenshot inspection: skipped because generated validation
  artifacts are forbidden for this workstream.
- Fixture inventory: skipped because fixtures containing real data are forbidden
  and fixture locations are [MISSING: fixture inventory].
- Live telemetry capture: skipped because [UNKNOWN: telemetry implementation]
  and no approved browser/live API validation target is in scope.
- Live AI-analysis validation: skipped because [MISSING: AI-analysis endpoint]
  and raw model inputs are not approved.

## Accessibility And Usability

- Keyboard navigation reaches search, filters, log list, detail view, and primary controls.
- Focus states are visible.
- Color is not the only signal for severity or status.
- Long log messages, stack traces, and identifiers wrap or scroll without overlapping adjacent UI.

## Contract Validation

- API client handles expected response schema, missing optional fields, and documented error responses.
- API key, hook, AI analysis, and alert policy integrations conform to `docs/intent/backend-contracts.md` until an authoritative backend source replaces or revises the draft.
- API key secrets and hook signing secrets are displayed only in permitted one-time or prefix-only forms.
- AI analysis responses do not expose raw sensitive log bodies unless a reviewed sensitive-log permission and redaction contract exists.
- Alert policy matchers, thresholds, throttling, and notification channels are validated against backend-supported enum values before release.
- Date/time handling is timezone-aware and clearly displayed.
- Pagination and cursor behavior are deterministic across repeated requests.
- Frontend does not assume fields that are not documented by the backend contract.

## Parallel Execution Handoff

Ready-now downstream work:

- G4 static-shell implementation may use this document for route and state structure, but must keep real data-bearing integration behind draft/static assumptions until G1 and G3 complete.
- G6 validation may create baseline browser evidence for landing, dashboard denied, dashboard authorized, admin denied, and admin authorized workflows using synthetic data.

Dependency-gated work:

- G5 API integration must wait for G1 endpoint, schema, auth, pagination, filtering, sorting, and error-format evidence.
- Log detail payload rendering, copy, export, and download controls must wait for G3 sensitive-data approval.
- Production billing, checkout, provisioning, sales contact, user management, policy management, audit-log, and settings workflows require approved product and backend contracts.

Shared files and merge order:

- `docs/intent/validation-criteria.md` is owned by G2 until this handoff is complete.
- G1 should update `docs/intent/contracts-integration-assumptions.md` first.
- G3 should update `docs/intent/sensitive-data-notes.md` first.
- G4 should update `index.html`, `styles.css`, and `app.js` after reading G1, G2, and G3 outputs.
- G6 should validate after G4 changes and record evidence in `docs/validation/`.

Integration owner:

- [UNKNOWN: integration owner for merging G1, G2, G3, G4, G5, and G6 outputs].

Validation owner:

- [UNKNOWN: release validation owner and deployment-readiness approver].

## Release Evidence

Required before release:

- Frontend test suite: [MISSING: no package manifest or test runner exists in this new static checkout].
- Build/typecheck/lint: [MISSING: no package manifest or build tool exists in this new static checkout].
- Browser validation target URL: `http://127.0.0.1:4173` when served by `python3 -m http.server 4173`.
- [UNKNOWN: required deployment readiness evidence].

## G2 Completion Note

- G2 route workflows and UX-state criteria were drafted from `docs/intent/goal-impact.md`, `docs/intent/execution-plan.md`, `docs/intent/contracts-integration-assumptions.md`, and the current static app shell in `index.html` and `app.js`.
- Remaining unresolved items are intentionally marked with `[MISSING: ...]` or `[UNKNOWN: ...]` for G1, G3, product, security, integration, and validation owners.
