# Repository Agent Instructions

Shared rules live here:

- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# AGENTS.md — logging-microservice

## Required Reading

Read `BUSINESS.md`, `SYSTEM.md`, `docs/00_constitution/CONSTITUTION.md`, `docs/01_vision/VISION.md`, `TASKS.md`, and `STATE.json` before any change.

## Authority

`BUSINESS.md` is human-owned and immutable to AI agents. `SYSTEM.md`, `CLAUDE.md`, and IPS planning documents may be proposed/updated by agents subject to review.

## Intent Preservation System

This repository follows `Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation` per `AGENT_OPERATIONS.md` and the central `intent-preservation-system` standard.

## Safety and Operations

Never delete log files, weaken retention/rotation, or expose secrets. Escalate to a human if `/health` fails or a rollout fails.

## Project-Specific Rules

This service is a shared dependency of every other ecosystem service; treat any endpoint or schema change as a breaking-change candidate requiring ecosystem-wide review before deployment.

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

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

## Required Final Report

Report files changed, validation evidence (adoption gate output), validation debt used or added, blockers as `[MISSING: ...]`/`[UNKNOWN: ...]`, and the next concrete action.
