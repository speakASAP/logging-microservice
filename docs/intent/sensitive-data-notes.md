# Logging Frontend Sensitive-Data Notes

Status: ai-draft

## Goal

G3 defines the privacy and sensitive-data rules that downstream frontend,
integration, and validation work must follow until an authoritative backend
redaction contract and security approval are available.

This document is not an approval to display, store, export, copy, or transmit
raw log data. It is the conservative default for implementation planning.

## Classification

Default classification: sensitive by default.

Reason: logging systems may include credentials, tokens, personal data, internal hostnames, request payloads, stack traces, tenant identifiers, and operational metadata.

## Sensitive Field Baseline

Treat these values as sensitive unless the backend contract explicitly classifies
them otherwise:

- Credentials, passwords, passphrases, client secrets, private keys, API keys,
  access tokens, refresh tokens, authorization headers, cookies, and session IDs.
- Personal data such as email addresses, names, phone numbers, user IDs, IP
  addresses, device IDs, customer identifiers, account IDs, and tenant IDs.
- Request and response payloads, query strings, form bodies, payment metadata,
  webhook payloads, and stack traces.
- Internal hostnames, infrastructure identifiers, deployment metadata, database
  names, queue names, service URLs, and network topology details.
- Correlation IDs, trace IDs, order IDs, invoice IDs, and other identifiers that
  can link an event to a customer, account, request, or incident.
- AI analysis output when it quotes, summarizes, clusters, or derives facts from
  raw log payloads.

Authoritative sensitivity labels, field names, and exceptions remain
[UNKNOWN: authoritative sensitive-field list].

## Handling Rules

- Use synthetic records for documentation, tests, demos, screenshots, fixtures, and prompts.
- Do not copy raw production logs into local files, generated artifacts, test fixtures, or issue comments.
- Do not expose secrets, tokens, authorization headers, cookies, session identifiers, or raw credentials in the frontend.
- Mask values before display when the field classification is sensitive or unknown.
- Prefer server-side redaction for known sensitive fields; frontend masking is a defense-in-depth layer, not the only control.
- Deny by default when a field has no classification, redaction state, or role
  visibility contract.
- Do not derive display permissions from local UI state alone; rely on
  server-issued tenant scope and permissions after integration.
- Do not place raw or reversible sensitive values in DOM attributes, data
  attributes, element IDs, CSS classes, HTML comments, logs, thrown errors, or
  route state.

## Display And Masking Rules

- Display only fields that are synthetic, already redacted by the server, or
  explicitly approved for the current role and tenant.
- Mask unknown identifiers using irreversible truncation, for example
  `user_id=8f2c...`; do not show enough characters to reconstruct the value.
- Replace secrets and credentials with fixed labels such as `[REDACTED_SECRET]`;
  never partially reveal secrets.
- Keep raw payload and stack-trace expansion disabled until approved field-level
  rules exist.
- Show sensitive-field unavailability as a normal UI state, not as an error that
  leaks whether hidden data exists.
- Treat AI summaries as sensitive unless the service contract proves the model
  receives only redacted inputs and returns redacted outputs.

## Synthetic Data Rules

- Demo data must be fabricated and non-routable. Use reserved example domains,
  documentation IP ranges, fake service names, and invented identifiers.
- API keys, tokens, webhook URLs, tenant IDs, email addresses, trace IDs, and
  payload examples in the static frontend are placeholders only.
- Synthetic records must not be copied from production, staging, customer
  tickets, telemetry, screenshots, or incident reports.
- If realistic shape is needed for validation, generate records from a schema
  without preserving source values.

Current static-shell examples in `app.js` are intended as synthetic placeholders.
Use non-routable `example.invalid` customer values and masked credential examples
unless a reviewed backend contract requires a production endpoint such as the
documented logging ingest URL.

## Browser Storage And Telemetry

- Do not store raw log payloads in local storage, session storage, IndexedDB, cache storage, URLs, or analytics events unless explicitly approved.
- Avoid sending log content to third-party telemetry, error reporting, or session replay tools.
- If telemetry is required, emit aggregate UI events only, without log content or identifiers.
- Do not persist selected log rows, expanded details, API keys, search queries,
  filters containing identifiers, or tenant-scoped payloads in browser storage.
- Do not put log content, identifiers, tokens, or search strings into URL paths,
  query parameters, hashes, referrers, or page titles.
- Disable session replay, DOM capture, console capture, network payload capture,
  and error-reporting breadcrumbs for log-bearing screens unless a security
  review approves a redaction configuration.
- Frontend console logging must not include log payloads, auth claims, API keys,
  tenant IDs, request bodies, response bodies, or backend error payloads.

## Screenshot And Fixture Rules

- Screenshots for docs, validation, bug reports, and release evidence must use
  synthetic data only.
- Screenshots must not include raw logs, tokens, production tenant names,
  customer identifiers, internal hostnames, emails, or routable webhook URLs.
- Test fixtures must be generated synthetic records stored in the repository.
  They must not be captured API responses or sanitized production exports unless
  an explicit approval process exists.
- Prompt inputs and AI-agent context must use synthetic records only. Do not paste
  raw logs into prompts or model context.

## Export, Download, And Clipboard Rules

- Disable raw export/download/copy flows until the backend contract and security
  approval define allowed fields, roles, audit events, and retention behavior.
- Copy buttons may copy public documentation URLs or non-secret SDK install
  commands only.
- API keys and webhook secrets must not be copied or downloaded by default.
  Secret reveal, rotation, and copy behavior require explicit product and
  security approval.
- Any approved export must be server-generated from the authorized, redacted
  dataset and must include audit logging.
- Client-side CSV, JSON, clipboard, or print generation from raw API responses is
  not allowed without explicit approval.

## Role And Tenant Visibility Rules

- Guest users may see only marketing and synthetic demo data.
- Customer dashboard users may see only tenant-scoped, redacted, synthetic, or
  explicitly approved fields for their tenant.
- Admin users require one of the discovered logging backend admin roles
  (`global:superadmin`, `app:logging-microservice:admin`, or
  `internal:logging-microservice:admin`), but that role alone does not approve
  raw sensitive-field display.
- Cross-tenant views require backend authorization and redaction guarantees before
  frontend implementation.
- Access-denied and empty states must avoid revealing whether restricted logs,
  tenants, users, services, or incidents exist.

## Validation Requirements

- Validate that documentation, screenshots, fixtures, and browser tests use only
  synthetic data.
- Validate that raw logs are not written to browser storage, URLs, analytics,
  console output, or error-reporting payloads.
- Validate that copy, export, download, print, and screenshot evidence paths do
  not expose sensitive data.
- Validate that unknown or unclassified fields are masked, omitted, or blocked.
- Record skipped validation with `[MISSING: ...]` or `[UNKNOWN: ...]` markers
  instead of treating unapproved behavior as accepted.

## Unknowns Requiring Approval

- [UNKNOWN: authoritative sensitive-field list].
- [UNKNOWN: whether export/download/copy actions are permitted].
- [UNKNOWN: whether session replay or analytics is enabled in the frontend].
- [UNKNOWN: retention policy for viewed or cached log data].
- [UNKNOWN: role-based visibility rules for sensitive log fields].
- [UNKNOWN: backend redaction contract and redaction metadata format].
- [UNKNOWN: audit requirements for sensitive-field reveal, export, copy, and AI
  analysis actions].
- [UNKNOWN: approved security reviewer and exception process].

## T2 Privacy Approval Checklist

Status: draft approval gap analysis. This checklist records the approvals
required before the frontend may handle log data beyond the conservative default
rules above. No item below is approved unless an explicit owner, evidence source,
and decision are recorded.

| Area | Default state | Pass criteria | Fail criteria | Required owner or evidence |
| --- | --- | --- | --- | --- |
| Display: list fields | Show only synthetic, server-redacted, or explicitly non-sensitive fields. | Backend contract names each visible field, classifies sensitivity, and confirms tenant/role visibility. | UI renders unclassified identifiers, metadata, stack traces, payloads, customer names, tenant IDs, or personal data. | [UNKNOWN: security reviewer], [MISSING: authoritative field classification contract]. |
| Display: detail view | Keep raw payload, metadata, and stack trace expansion disabled or masked. | Detail sections render only allow-listed redacted fields and include unavailable states for withheld data. | Raw `metadata`, request/response bodies, stack traces, secrets, auth headers, or customer identifiers appear in the DOM. | [UNKNOWN: product owner for detail scope], [MISSING: backend redaction metadata]. |
| Masking | Mask unknown identifiers and replace secrets with fixed redaction labels. | Masking rules are irreversible, deterministic for display only, and tested for each sensitive field family. | Partial secret reveal, reversible masking, enough identifier characters to reconstruct a value, or masking applied only visually while raw values remain in attributes/state. | [UNKNOWN: security reviewer], [MISSING: approved masking pattern list]. |
| Copy and clipboard | Disable copy for log rows, details, API keys, webhook secrets, and raw payloads. | Copy action is limited to approved non-secret text or server-provided redacted content and records required audit events. | Client copies raw API response fields, selected rows, identifiers, stack traces, payloads, or secrets. | [UNKNOWN: export/copy approver], [MISSING: audit event contract]. |
| Export and download | Disable client-side CSV, JSON, print, and download from raw responses. | Export is server-generated from an authorized redacted dataset with field list, role rules, audit logging, and retention behavior. | Browser generates exports from raw API responses or includes unclassified fields. | [UNKNOWN: data governance owner], [MISSING: export endpoint and retention contract]. |
| Screenshot evidence | Use synthetic records only. | Screenshots are generated from fabricated placeholders, reserved domains, and non-routable examples; validation records the source. | Screenshots include production/staging logs, real customer names, tenant identifiers, routable webhook URLs, secrets, internal hostnames, or copied incident data. | Validation owner, [UNKNOWN: release evidence reviewer]. |
| Browser storage and URL state | Do not persist log content, identifiers, selected rows, searches, filters, or payloads. | Tests show local/session/IndexedDB/cache storage, URL path/query/hash, history, and page titles contain no log content or sensitive identifiers. | Raw or masked-sensitive values are persisted outside approved server state or appear in URLs/referrers. | [UNKNOWN: frontend security reviewer], [MISSING: approved storage policy]. |
| Telemetry and diagnostics | Emit no log content, identifiers, auth claims, or backend payloads. | Telemetry is aggregate UI behavior only; session replay, DOM capture, console capture, network body capture, and breadcrumbs are disabled or redacted by approved config. | Analytics, crash reporting, replay tools, console logs, thrown errors, or breadcrumbs contain log fields, identifiers, request bodies, response bodies, tokens, or tenant data. | [UNKNOWN: telemetry owner], [MISSING: telemetry vendor/config review]. |
| AI analysis | Treat AI output as sensitive and keep actions draft-only. | Server-authorized AI endpoint exists, model inputs are redacted by contract, outputs are classified/redacted, permissions are documented, and audit events are defined. | Frontend sends raw logs to a model, displays AI summaries derived from raw payloads, or stores prompts/responses without approval. | [UNKNOWN: AI/security reviewer], [MISSING: AI-analysis endpoint, permission, redaction, and retention contract]. |
| Fixtures and demos | Use generated synthetic data only. | Fixture provenance is documented as generated from schema or hand-authored placeholders and contains no production/staging/customer-derived values. | Fixtures are captured API responses, sanitized production exports without approval, customer tickets, telemetry samples, screenshots, or incident report copies. | Validation owner, [UNKNOWN: fixture review owner]. |

## Synthetic-Data Rule Review

Pass criteria:

- Domains use reserved examples such as `example.invalid`, `example.com`, or
  other non-customer placeholders.
- IP addresses use documentation ranges or clearly fake placeholders.
- Tenant IDs, trace IDs, correlation IDs, API keys, tokens, webhook URLs, emails,
  service names, payloads, and stack traces are invented and non-routable.
- Validation screenshots, fixtures, prompts, and docs record that examples are
  synthetic.
- Any realistic record shape is generated from schema expectations without
  preserving source values from production, staging, telemetry, tickets, or
  incident reports.

Fail criteria:

- Any example value can be traced to a real customer, tenant, user, service,
  host, repository secret, production endpoint, staging payload, ticket,
  telemetry event, screenshot, or incident report.
- Synthetic-looking values preserve production structure plus real identifiers,
  tokens, or payload fragments.
- Screenshots or fixtures do not document their synthetic source.

Current review result:

- Documentation rule: pass, conservative synthetic-only rule is documented.
- Static-shell data provenance: [UNKNOWN: full source audit of `app.js`
  placeholders was outside this T2 allowed-file scope].
- Screenshot provenance: [UNKNOWN: generated validation artifacts were outside
  this T2 allowed-file scope].
- Fixture provenance: [UNKNOWN: fixture inventory was outside this T2
  allowed-file scope].

## Skipped Privacy Gates

- Raw detail display approval: skipped because [MISSING: backend redaction
  contract], [UNKNOWN: field visibility owner], and [UNKNOWN: approved security
  reviewer].
- Copy/clipboard approval: skipped because [UNKNOWN: whether copy is permitted],
  [MISSING: audit event contract], and [MISSING: approved field list].
- Export/download approval: skipped because [MISSING: export endpoint],
  [MISSING: server-side redacted export contract], [UNKNOWN: retention policy],
  and [UNKNOWN: data governance owner].
- Screenshot release approval: skipped because [UNKNOWN: release evidence
  reviewer] and artifact inspection was outside this T2 scope.
- Telemetry approval: skipped because [UNKNOWN: telemetry vendor/config],
  [UNKNOWN: whether analytics or session replay is enabled], and [MISSING:
  approved redaction configuration].
- AI-analysis approval: skipped because [MISSING: AI-analysis endpoint],
  [MISSING: model input/output redaction contract], [UNKNOWN: AI data retention
  policy], and [UNKNOWN: AI/security reviewer].

## T2 Handoff Notes

Raw detail UI behavior is unblocked only when these are recorded:

- [MISSING: authoritative sensitive-field list].
- [MISSING: backend response redaction contract and redaction metadata format].
- [UNKNOWN: role and tenant visibility owner].
- [UNKNOWN: approved security reviewer and exception process].

Copy UI behavior is unblocked only when these are recorded:

- [UNKNOWN: whether copy actions are permitted].
- [MISSING: copy-safe field allow-list].
- [MISSING: audit event contract for copy actions].
- [UNKNOWN: product owner for copy workflows].

Export UI behavior is unblocked only when these are recorded:

- [MISSING: server-generated export endpoint].
- [MISSING: export-safe field allow-list and redaction guarantees].
- [MISSING: export audit event contract].
- [UNKNOWN: retention policy for exported files].
- [UNKNOWN: data governance owner].

Screenshot behavior for release evidence is unblocked only when these are
recorded:

- [UNKNOWN: release evidence reviewer].
- [MISSING: validation artifact synthetic-data attestation process].
- [UNKNOWN: screenshot storage and retention policy].

AI-analysis UI behavior is unblocked only when these are recorded:

- [MISSING: server-authorized AI-analysis endpoint].
- [MISSING: AI-analysis permission contract].
- [MISSING: model input/output redaction contract].
- [MISSING: AI prompt, response, telemetry, and retention policy].
- [UNKNOWN: AI/security reviewer].
