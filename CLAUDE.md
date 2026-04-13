# CLAUDE.md (logging-microservice)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first.

---

## logging-microservice

**Purpose**: Centralized structured logging for every service in the ecosystem.  
**Port**: 3367  
**Domain**: https://logging.statex.cz  
**Stack**: NestJS · file-based log rotation

### Key constraints
- Every log entry MUST include `timestamp` (ISO 8601) and `duration_ms`
- Timeout errors must be logged at ERROR level
- Never delete log files — daily rotation is automatic
- This service is a dependency of all other services — be careful changing its API

### Log fields required by callers
```json
{ "service": "...", "level": "info|warn|error", "message": "...",
  "timestamp": "2026-01-01T00:00:00.000Z", "duration_ms": 42 }
```

### Quick ops
```bash
curl http://logging-microservice:3367/health
docker compose logs -f
./scripts/deploy.sh
```
