# CLAUDE.md (logging-microservice)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
kubectl -n statex-apps exec deployment/logging-microservice -- curl -s -X POST http://docs-rag-microservice:3397/retrieval/agent-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.claude/rag-token)" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```


---

## logging-microservice

**Purpose**: Centralized structured logging for every service in the ecosystem.  
**Port**: 3367  
**Domain**: https://logging.alfares.cz  
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

**Ops**: `curl http://logging-microservice:3367/health` · `kubectl logs -f deploy/logging-microservice -n statex-apps` · `./scripts/deploy.sh`
