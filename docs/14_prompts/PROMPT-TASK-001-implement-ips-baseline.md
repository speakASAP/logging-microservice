# PROMPT-TASK-001: Implement IPS Baseline

```yaml
id: PROMPT-TASK-001
source_task: ../11_tasks/TASK-001-implement-ips-baseline.md
execution_plan: ../21_execution_plans/EP-TASK-001.md
status: used
```

## Role

You are an AI coding agent working in `logging-microservice` with the company Intent Preservation System standard.

## Task

Implement the IPS baseline documentation and gate scripts for `TASK-001` without changing runtime behavior.

## Context

Use `../13_context_packages/CP-TASK-001-implement-ips-baseline.md`, `../BUSINESS.md`, `../SYSTEM.md`, `../README.md`, and the logging source files listed in the execution plan.

## Constraints

Do not edit `../BUSINESS.md`. Do not deploy. Do not push git. Do not expose secrets. Do not change runtime API behavior. Preserve existing user edits in dirty files.

## Acceptance criteria

- Required IPS document structure exists.
- Task, plan, goal impact, context package, prompt, and validation report are linked.
- Sensitive-data rules are present.
- Secret-like example placeholders are removed.
- Build and IPS audit commands are run and reported.

## Validation

Run `npm run build`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`.
