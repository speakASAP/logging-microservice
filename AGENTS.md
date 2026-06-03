# AGENTS.md — logging-microservice


## Knowledge Retrieval (query before reading files)
Query the RAG service first to reuse indexed ecosystem context before reading raw files:

```bash
curl -s -X POST http://docs-rag-microservice.statex-apps.svc.cluster.local:3397/retrieval/agent-context \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```

- Internal URL: `http://docs-rag-microservice.statex-apps.svc.cluster.local:3397`
- Public URL: `https://docs-rag.alfares.cz`
- Full guide: `docs-rag-microservice/docs/RAG_USAGE.md`

## Automation Status
No active AI orchestration agents for this service.
This service is a dependency of all other services in the ecosystem — changes to its API require ecosystem-wide review before deployment.

## What Agents May Do
- Read all files for context
- Update `TASKS.md` and `STATE.json`
- Propose edits to `SYSTEM.md` and `CLAUDE.md`
- Run read-only kubectl commands: `kubectl get`, `kubectl describe`, `kubectl logs`
- Run `scripts/deploy.sh` (triggers docker build + kubectl rollout)

## What Agents Must NOT Do
- Edit `BUSINESS.md` (human-owned)
- Push to remote git without human review

## Deployment
```bash
# Build image, push to localhost:5000, trigger kubectl rollout
./scripts/deploy.sh
```

## Operational Commands
```bash
# Live logs
kubectl logs -f deploy/logging-microservice -n statex-apps

# Pod status
kubectl get pods -n statex-apps -l app=logging-microservice

# ConfigMap contents
kubectl get configmap logging-microservice-config -n statex-apps -o yaml

# Verify Vault secret sync
kubectl get secret logging-microservice-secret -n statex-apps

# Health check
curl https://logging.alfares.cz/health
```

## Escalation
If `/health` returns non-200 or a rollout fails, escalate to a human before retrying.
