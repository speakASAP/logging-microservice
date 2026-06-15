# Frontend Validation Report

Status: ai-validated
Last updated: 2026-06-14

## T3 Scope

T3 validates the current dependency-free static frontend shell after the latest
G5 admin-adapter changes. It covers local browser rendering for landing,
customer dashboard, admin allowed, admin denied, mobile layout, live-adapter
no-token behavior, and local sensitive-data exposure checks with synthetic
records only.

This validation does not approve production auth, deployment readiness,
copy/export flows, raw sensitive-log display, or successful live backend reads
because no approved bearer token was supplied for live API validation.

## Target

- Local server URL: `http://127.0.0.1:4173/`
- Server command: `/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m http.server 4173`
- Browser automation: Playwright Chromium through `scripts/visual-qa.cjs`
- In-app browser smoke check: Browser plugin against `http://127.0.0.1:4173/`
- Viewports:
  - Desktop: `1440 x 1000`
  - Mobile: `390 x 844`

## Commands

| Check | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static server availability before start | `curl -I http://127.0.0.1:4173/` | Expected miss | No server was already listening on port `4173`. |
| Static server availability after start | `curl -I http://127.0.0.1:4173/` | Pass | Returned `HTTP/1.0 200 OK`, `Content-type: text/html`, `Content-Length: 351`. |
| App JavaScript syntax | `node --check app.js` | Pass | Command exited successfully with no syntax output. |
| QA script syntax | `node --check scripts/visual-qa.cjs` | Pass | Command exited successfully with no syntax output. |
| Visual/browser artifact generation | `NODE_PATH=/Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/Sergej.Stasok/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/visual-qa.cjs` | Pass | Generated screenshots and `docs/validation/visual-qa.json`; console error array is empty and all recorded checks passed. |
| In-app browser smoke check | Browser plugin navigation and interaction check | Pass | Verified page identity, nonblank landing content, no framework overlay, empty console warning/error list, dashboard denied state, customer dashboard allowed state, and masked API-key marker. |

The first Playwright launch inside the sandbox failed with macOS browser process
permission errors. The same QA command passed when rerun outside the sandbox.

## Browser Evidence

Generated screenshots:

- `docs/validation/landing-desktop.png` - `1440 x 2823`
- `docs/validation/dashboard-denied.png` - `1440 x 1000`
- `docs/validation/dashboard-customer.png` - `1440 x 1173`
- `docs/validation/admin-denied.png` - `1440 x 1000`
- `docs/validation/admin-authorized.png` - `1440 x 1218`
- `docs/validation/dashboard-mobile.png` - `390 x 2465`

Generated JSON report:

- `docs/validation/visual-qa.json`
- Generated at: `2026-06-14T19:54:45.671Z`
- Page title: `LogStream | Logging Microservice`
- Console errors: none
- Mobile document width: `390px`
- Mobile scroll width: `390px`
- Page-level horizontal overflow: false

## Passed Checks

The refreshed QA evidence records these passing checks:

- Landing route renders the service offer.
- Landing route renders pricing tiers.
- Guest customer-dashboard route renders authentication required.
- Authenticated customer session renders the customer dashboard.
- Customer API key display remains masked with `[REDACTED_SECRET]`.
- Authenticated non-admin session is denied admin access.
- Logging admin session renders the admin panel.
- Live admin adapter renders on the admin route.
- Live admin adapter shows the bearer-token-required error before any live
  request can be made without a token.
- Browser console errors are absent.
- Mobile horizontal overflow is absent.
- Forbidden sensitive patterns are absent from visible page text.
- `localStorage` and `sessionStorage` are empty.
- URL has no query string or hash.
- Visible email addresses are limited to `example.invalid`.

## Sensitive-Data Exposure

Validation used only static synthetic records from `app.js`. The current shell
uses `example.invalid` emails and URLs, placeholder tenant/session labels, masked
API-key text, documentation-range IP examples, and fabricated log messages.
The live adapter does not store bearer tokens or raw log payloads in browser
storage during the no-token validation path.

The browser check found:

- Forbidden sensitive pattern matches: none.
- Redacted secret marker present: yes.
- Local storage keys: none.
- Session storage keys: none.
- URL query/hash sensitive leakage: none.

This is acceptable for the static shell. It does not replace the blocked
security review for production payloads, copy/export behavior, telemetry,
session replay, or backend redaction guarantees.

## Skipped Gates

| Gate | Status | Reason |
| --- | --- | --- |
| Package test suite | Skipped | [MISSING: no package manifest or test runner exists in this checkout]. |
| Lint/build/typecheck | Skipped | [MISSING: no package manifest, build tool, lint command, or typechecker exists in this checkout]. |
| Live API request validation | Blocked | [MISSING: approved bearer token for validation run; implemented admin log query/services contracts are documented, but no live token was supplied]. |
| Sensitive-data fixture audit beyond local synthetic data | Blocked | [MISSING: authoritative sensitive-field list and export/copy approval rules]. |
| Deployment readiness | Blocked | [UNKNOWN: deployment process and release gate owner]. |

## T3 Finding

Static shell quality is acceptable for the current local frontend baseline.
There are no T3 findings that block the partial G5 admin log query/services
adapter.

G5 remains dependency-gated for customer API-key lifecycle, logging hook
lifecycle, billing/trial entitlement, AI log-pattern analysis, alert-policy,
cursor pagination, generated-client evidence, and approved sensitive-data
handling rules. Successful live API request validation remains blocked until an
approved bearer token is supplied.
