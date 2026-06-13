# CP-TASK-001: IPS Baseline Context Package

```yaml
id: CP-TASK-001
status: used
source_task: ../11_tasks/TASK-001-implement-ips-baseline.md
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
```

## Target task

`TASK-001` in `../11_tasks/TASK-001-implement-ips-baseline.md`.

## Upstream traceability

- Vision: `../01_vision/VISION.md`
- Business source: `../BUSINESS.md`
- Feature: `../10_features/FEAT-001-centralized-structured-logging.md`
- Execution plan: `../21_execution_plans/EP-TASK-001.md`

## Included documents

- `../BUSINESS.md`
- `../SYSTEM.md`
- `../README.md`
- `../AGENTS.md`
- `../src/logs/logs.controller.ts`
- `../src/logs/logs.service.ts`
- `../src/logs/dto/log-entry.dto.ts`
- `../src/auth/admin-role.guard.ts`

## Excluded documents

- Raw production logs.
- Secrets or Vault values.
- Node modules and build output.

## Constraints

Do not edit `../BUSINESS.md`. Do not change runtime source files. Do not include sensitive data. Keep API changes out of this task.

## Agent prompt

Create a draft IPS baseline from approved service documentation, copy gate scripts, remediate secret-like placeholders in examples, and validate with build plus IPS gates.

## Validation instructions

Run `npm run build`, `python3 scripts/pre_coding_gate.py --root .`, and `python3 scripts/strict_doc_audit.py --root . --format markdown --fail-on-issues`.
