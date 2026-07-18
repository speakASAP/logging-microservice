# Local Workflow

```yaml
id: LOCAL-WORKFLOW
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../17_governance/AI_AGENT_RULES.md
```

## Daily Workflow

1. Read `../AGENTS.md`, `../BUSINESS.md`, `../SYSTEM.md`, and relevant IPS artifacts.
2. Select or create a task under `../11_tasks/`.
3. Create or update its execution plan under `../21_execution_plans/`.
4. Run `python3 scripts/pre_coding_gate.py --root .` before coding.
5. Implement only the plan scope.
6. Run build, tests, and validation gates.
7. Record validation under `../12_validation/`.

## Deployment Workflow

Use `./scripts/deploy.sh` only after validation evidence exists and human review approves deployment. Follow `../AGENTS.md` escalation rules if health checks or rollout fail.
