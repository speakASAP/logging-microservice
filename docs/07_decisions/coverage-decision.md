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

## Follow-on

- **TASK-LOG-005** — issue ingest credentials to the 12 silent services, verify 201.
- Diagnose `api-gateway`, `minio-microservice`, `marketing-microservice` separately.
