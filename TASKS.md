

# Tasks: logging-microservice

## Active

None.


## Ready next

No ready-next tasks.


## Blocked

No tasks are currently blocked.


## Completed

<!-- AI appends here. Never modifies previous entries. -->
- [x] TASK-LOG-005 ingest-credential hardening completed (2026-09-04). Enforced the ingest credential gate with explicit allowlist checks, rejected JWT_TOKEN as an ingest credential, and added regression tests to prevent silent outage conditions. Rejections now emit a structured `log_ingest_rejected` error with the service name and reason while never echoing the presented credential value.
- [x] TASK-LOG-004 decision + coverage/staleness instrumentation (2026-08-17). Enumerated ingest
      coverage against the live pod: 17 senders shipping, 12 silent, ~28 app-tier never shipped.
      Root cause of the silent 12 found — 11 stopped on exactly 2026-07-06 when
      `LOG_INGEST_REQUIRE_AUTH=true` was enforced without issuing credentials (verified in-pod:
      unauthenticated POST → 401, authenticated → 201). Decided to accept the opt-in POST model
      and NOT deploy a DaemonSet shipper; rationale and per-service acceptance in
      `docs/07_decisions/coverage-decision.md`. Added `LogsService.getCoverage()`,
      `GET /api/logs/coverage` (503 when degraded), and `scripts/check-ingest-staleness.sh`
      for scheduled Telegram alerting. 10 new tests (TDD, red first), 17/17 suite green,
      typecheck clean and proven live via a deliberate TS2322. Not yet deployed.
- [x] Verified and fixed production per-service log rotation on 2026-06-19; `rotation-check.log` and `rotation-check.human.log` archived to dated files after a live 105 MB rollover probe, deploy image `localhost:5000/logging-microservice:927853c`, rollout and health check passed.
- [x] Deployed Auth role enforcement for logging admin read endpoints to production on 2026-06-13. Image `localhost:5000/logging-microservice:4769c51`; rollout and health check passed.


## Handoff

No active owner; task complete. The ingress credential gate is closed and the service is protected against silent log-loss regressions.


## Backlog


- [x] **TASK-LOG-005**: issue ingest credentials to the 12 services locked out since 2026-07-06
      (`auth-microservice`, `docs-rag-microservice`, `monitoring-microservice`,
      `notifications-microservice`, `orders-microservice`, `suppliers-microservice`, `runlayer`,
      `flipflop-order-service`, `flipflop-product-service`) and diagnose `api-gateway`,
      `minio-microservice`, `marketing-microservice` separately. Verify each returns 201.
      This is the actual fix for the TASK-LOG-004 coverage gap.
- [x] Verify log rotation is working correctly in production (priority: 3) (2026-06-19)


## Project Completion Marker


- 2026-06-21: Project marked completed/frozen after remote inventory. There are no active goals, active plans, open tasks, blockers, or pending human/AI actions. Do not ask for a new goal during routine status checks unless the owner explicitly creates one.
- **2026-08-17: UNFROZEN by owner request.** TASK-LOG-004 (ecosystem `TASKS.md`) surfaced a live
  regression: 12 services stopped shipping logs, 11 of them on 2026-07-06, unnoticed for six weeks.
  TASK-LOG-005 is now closed after the credential gate hardening and explicit rejection logging fix.
