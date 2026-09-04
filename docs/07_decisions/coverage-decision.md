# Coverage Decision — opt-in POST ingest, no DaemonSet shipper

**Status:** Decided 2026-08-17 · Resolves the decision half of TASK-LOG-004
**Context:** Follow-on from TASK-LOG-001 (Loki retirement, 2026-08-13)

---

## Question

`logging-microservice` is an opt-in POST API. Pod stdout/stderr is still `kubectl logs`
only — ephemeral, lost on pod replacement. Deploy a DaemonSet shipper to collect it, or
accept the opt-in model?

## Decision

**Accept the opt-in POST model. Do not deploy a DaemonSet shipper.**

Close the gap by fixing the senders that broke, and by making a broken sender *visible*
within hours instead of weeks.

## Evidence (measured 2026-08-17, live pod `/app/logs`)

77 deployments in `statex-apps`, ~60 app-tier. 32 distinct senders have ever written.

- **17 shipping now** (last 24h): `speakasap` + 11 `speakasap-*`, `backups`, `catalog`,
  `crypto-ai-agent`, `marathon`, `payments`, `warehouse`
- **12 shipped before, now silent**: `auth-microservice`, `docs-rag-microservice`,
  `monitoring-microservice`, `notifications-microservice`, `orders-microservice`,
  `suppliers-microservice`, `runlayer`, `flipflop-order-service`, `flipflop-product-service`,
  `api-gateway`, `minio-microservice`, `marketing-microservice`
- **~28 app-tier never shipped**: allegro (5), heureka (2), aukro, bazos, growth (2),
  rent-a-box (2), leads, invoices, prompts, ai-microservice, and the low-priority experiments

### Root cause of the silent 12

Eleven stopped on **exactly 2026-07-06** — one event, not twelve regressions.

`LOG_INGEST_REQUIRE_AUTH=true`, `LOG_INGEST_BEARER_TOKENS` holds one token. Verified in-pod:

```
POST /api/logs  (no credential)     -> 401
POST /api/logs  (Bearer $JWT_TOKEN) -> 201
```

Ingest auth was enforced; these senders were never issued a credential. They have been
POSTing into a 401 since, and nothing surfaced it.

## Why not a DaemonSet

1. **It solves the wrong problem.** The gap is a credential rollout, not missing collection.
   Collecting stdout would make the coverage number look healthy while the structured
   pipeline stayed broken — the same "implies coverage that does not exist" failure that
   got Loki retired.
2. **It breaks the ingest contract.** `LogEntryDto` requires `service` + `level`; house
   rules require `timestamp` + `duration_ms`. Container stdout carries none of these. A
   shipper must fabricate them (fabricated `duration_ms` is worse than no data) or bypass
   validation, splitting ingest into validated and unvalidated paths.
3. **Storage math fails.** File-backed PVC, daily rotation, already 240 files; query is a
   file scan (`logs.service.ts`). Node-wide stdout is 10–100× volume, no index.
4. **Blast radius.** A privileged node-wide component whose failure mode is filling the PVC
   that every service's logging depends on — and this service is a dependency of all others.
5. **Most never-shippers are deprioritized.** Blanket collection buys coverage of services
   explicitly not being worked on, and buries the ones that matter in noise.

## Per-service acceptance

| Group | Decision | Rationale |
|---|---|---|
| `speakasap*` (12), `payments`, `catalog`, `warehouse`, `marathon`, `backups`, `crypto-ai-agent` | **Shipping — keep** | Revenue and data-critical paths. Already structured. |
| `auth-microservice`, `notifications-microservice`, `orders-microservice`, `docs-rag-microservice` | **Must ship — fix (TASK-LOG-005)** | Main-priority services; auth and orders must be reconstructable after an incident. |
| `monitoring-microservice`, `suppliers`, `runlayer`, `flipflop-*` | **Should ship — fix (TASK-LOG-005)** | Were shipping before 07-06; restore the credential. |
| `api-gateway`, `minio-microservice`, `marketing-microservice` | **Fix, diagnose separately** | Stopped 08-13/08-14, outside the 07-06 cluster — different cause. |
| allegro, heureka, aukro, bazos, growth, rent-a-box, leads, invoices, prompts, ai-microservice, chytrakoupe, cliplot, goalkeeper, school-committee, shop-assistant, candidate-blueprism, agentic-email, bpcp | **Accept stdout-only** | Not on the priority list. `kubectl logs` is sufficient; opt in individually if one becomes active. |
| `statex-ecosystem`, `domain-research` | **Accept stdout-only** | Explicitly low-priority experiments. |
| Infra (prometheus, grafana, qdrant, exporters, `db-server-*`) | **Accept — never ship** | Third-party; own retention and scrape paths. Would be pure noise in a structured log sink. |

## Consequences

- Pod stdout for accepted services remains ephemeral. That is a **knowingly accepted risk**,
  not an oversight — recorded here so it is not rediscovered as a surprise.
- The residual risk (a sender breaking unnoticed) is mitigated by the staleness detector and
  `GET /api/logs/coverage`, both implemented 2026-08-17.
- If a stdout-only service later needs post-incident reconstruction, the fix is to opt it in,
  not to revisit the DaemonSet.

## Root cause, corrected 2026-08-18 (TASK-LOG-005)

The 2026-07-06 diagnosis above ("senders were never issued a credential") was only half
right, and the half that mattered was wrong. Credential distribution was **not** the
blocker.

After adding rejection logging to `LogIngestGuard`, production showed **6,276 rejected
ingest attempts in 15 minutes** — every one `missing_credential`, meaning *no Authorization
header was sent at all*. Wiring `LOGGING_SERVICE_TOKEN` into the pods did not change it.

The real defect is in the **vendored shared logger** (`shared/logger/logger.service.ts`,
9 copies across repos). It:

1. Read only `LOGGING_SERVICE_URL` and **never sent an Authorization header**, so it could
   never satisfy ingest auth once `LOG_INGEST_REQUIRE_AUTH=true` landed on 2026-07-06.
2. Swallowed the resulting 401 — `// Silently fail`, logging only when
   `NODE_ENV === 'development'`. That is why nine services went dark for six weeks with
   nothing in any log.

Defect 2 is a direct violation of the global NO SILENT FAILURES rule, sitting in the exact
code path whose silence caused the outage.

**Fixed** in `auth-microservice` and `notifications-microservice`: send `Bearer
${LOGGING_SERVICE_TOKEN}` when set (omit the header entirely when not, rather than sending
`Bearer undefined`), and report every failed shipment to stderr as structured JSON —
throttled to once a minute, credential never printed.

`payments-microservice` and `backups-microservice` carry variant copies that already handle
auth and are shipping normally; they were left alone. The remaining copies
(`allegro`, `aukro`, `bazos`, `flipflop`, `heureka`) belong to deprioritized services and
are unpatched — tracked below.

### Also corrected: "12 locked out" was too broad

Probing each pod directly (POST with its own credential) showed the causes differ:

| Service | Finding |
|---|---|
| `orders-microservice`, `suppliers-microservice` | **201 — credentials valid.** Not broken; they ship only on activity. Now in `LOG_IGNORE_STALE_SERVICES` and reported as `idle`, not `stale`. |
| `auth-microservice`, `flipflop-product-service`, `prompts-microservice`, `notifications-microservice`, `monitoring-microservice` | Actively POSTing and rejected — shared-logger defect. |
| `runlayer`, `minio-microservice` | 401 with their own token; credential now wired. |
| `probe`, `logging-auth-smoke`, `logging-rollout-smoke` | One-off test artifacts, not services. Ignored. |

## Follow-on

- [x] Wire `LOGGING_SERVICE_TOKEN` from the shared `logging-ingest-credentials` secret into
      the 8 deployments that lacked it (2026-08-18).
- [x] Fix the shared logger in `auth-microservice` + `notifications-microservice`.
- [ ] Patch or retire the 5 unpatched vendored logger copies (`allegro`, `aukro`, `bazos`,
      `flipflop`, `heureka`) — all deprioritized services, so low urgency.
- [x] `kube-state-metrics` posted to ingest and was rejected. Moot since 2026-08-27: the
      observability stack was retired and the pod no longer exists, so nothing posts. No
      credential was granted; the decision to treat infra as out of scope stands.
- [ ] Diagnose `api-gateway` and `marketing-microservice` (stopped 08-13/08-14, outside the
      07-06 cluster).
