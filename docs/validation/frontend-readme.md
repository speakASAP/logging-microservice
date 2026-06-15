# Logging Microservice Frontend

Static first-pass frontend for the logging microservice. It includes:

- Customer landing page with pricing, trial, registration, and buy CTAs.
- Customer dashboard for tenant-scoped API keys, webhooks, SDK setup, and recent logs.
- Admin panel guarded by discovered backend admin roles.
- Optional live admin adapter for discovered `GET /api/logs/query` and `GET /api/logs/services` endpoints.
- Simulated AI pattern analysis and notification integration surfaces.

## Run

Open `index.html` directly, or serve the directory:

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173`.

## Auth Assumption

The UI denies access by default. Customer dashboard access still uses the draft `tenant_id` and `logging.dashboard.read` assumption until customer endpoints are documented. Admin access follows the discovered backend roles: `global:superadmin`, `app:logging-microservice:admin`, or `internal:logging-microservice:admin`; local role inference is not accepted.

## Live Admin Adapter

The admin route can load logs from `https://logging.alfares.cz` or another logging backend URL. Paste an auth access token into the bearer-token field and click `Load live logs`.

The token is kept only in JavaScript memory for the current page session. It is not written to local storage, session storage, IndexedDB, URLs, or validation artifacts. Live rendering uses only documented log fields and masks correlation/task/project identifiers.
