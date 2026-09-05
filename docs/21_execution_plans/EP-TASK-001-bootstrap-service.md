# EP-TASK-001-bootstrap-service: Bootstrap logging-microservice

```yaml
id: EP-TASK-001-bootstrap-service
status: closed
source_task: ../11_tasks/TASK-001-bootstrap-service.md
goal_impact:
  - ../22_goal_impact/GOAL-IMPACT-TASK-001.md
validation:
  - ../12_validation/VAL-TASK-001-bootstrap-service.md
owner: project owner
created: 2026-08-30
last_updated: 2026-08-30
completeness_level: complete
parallelization_strategy: single_agent
required_gates:
  - adoption
  - pre-coding
```

## Upstream traceability

`../../BUSINESS.md` (approved business intent), `../01_vision/VISION.md` (approved vision), `../../SYSTEM.md` (approved system spec), `../11_tasks/TASK-001-bootstrap-service.md`, `../22_goal_impact/GOAL-IMPACT-TASK-001.md`.

## Scope

Create the missing IPS artifacts and reformat existing root/`docs/` documents into the required section structure and `ips-adoption.json` capability matrix, for this repository only.

## Non-goals

No runtime code, API, deployment manifest, or business-intent changes beyond accurate documentation.

## Project invariants

All invariants in `../17_governance/PROJECT_INVARIANTS.md` are preserved unchanged; this plan does not modify runtime behavior.

## Sensitive-data handling

No secrets, tokens, or production log samples are referenced anywhere in the created documents.

## Contract validation plan

Not applicable — no API/event/persistence contract is created or changed by this plan.

## Replay and determinism plan

Not applicable — no runtime code changed.

## Files to inspect

`README.md`, `BUSINESS.md`, `SYSTEM.md`, `AGENTS.md`, `AGENT_OPERATIONS.md`, `TASKS.md`, `STATE.json`, existing `docs/00_constitution/CONSTITUTION.md` and `docs/01_vision/VISION.md`, `docs/17_governance/PROJECT_INVARIANTS.md`.

## Files to create

`ips-adoption.json`, `docs/06_architecture/INTEGRATION_CONTRACT.md`, `docs/11_tasks/TASK-001-bootstrap-service.md`, `docs/21_execution_plans/EP-TASK-001-bootstrap-service.md`, `docs/12_validation/VAL-TASK-001-bootstrap-service.md`.

## Files to modify

`README.md`, `BUSINESS.md`, `AGENTS.md`, `AGENT_OPERATIONS.md`, `TASKS.md`, `STATE.json`, `docs/17_governance/PROJECT_INVARIANTS.md`, `docs/orchestrator/VALIDATION_DEBT.md`, `docs/22_goal_impact/GOAL-IMPACT-TASK-001.md` (fix broken traceability links from an earlier partial draft).

## Files that must not be modified

- `docs/00_constitution/CONSTITUTION.md` (already approved; content unchanged)
- `docs/01_vision/VISION.md` (already approved; content unchanged)
- Any k8s manifests, `scripts/deploy.sh`, or application source code

## Implementation steps

1. Run `scaffold_project_adoption.py` to create missing skeleton files non-destructively.
2. Reformat `README.md`, `BUSINESS.md`, `AGENTS.md`, `AGENT_OPERATIONS.md`, `TASKS.md` with the required section headings, preserving all real existing content.
3. Rewrite `STATE.json` to the required schema (`schemaVersion`, `project`, `lifecycle`, `health`, `activeTask`, `lastUpdated`, `deployment`, `blockers`, `followUps`).
4. Set `docs/17_governance/PROJECT_INVARIANTS.md` status to `reviewed`.
5. Fill `docs/06_architecture/INTEGRATION_CONTRACT.md` and `ips-adoption.json` with a truthful `required`/`not-applicable` decision and full contract fields for every capability, based on real dependencies documented in `SYSTEM.md`.
6. Add the missing `Update Format` section to `docs/orchestrator/VALIDATION_DEBT.md`.
7. Fix broken traceability links in the pre-existing `GOAL-IMPACT-TASK-001.md` draft and complete this execution plan and the validation report.
8. Run the adoption gate and fix any remaining reported errors.
9. Commit to `main`.

## Parallel execution

| Workstream | Status | Owner role | Allowed files | Dependencies | Validation | Merge order |
| --- | --- | --- | --- | --- | --- | --- |
| Documentation and contracts | complete | Worker agent | root docs + `docs/` tree | None | Adoption gate passes | n/a (single workstream) |

This task ran as a single, non-parallel workstream; no other agent touched this repository concurrently.

## Blockers

No blockers were identified for this documentation-only onboarding task.

## Test plan

Not applicable — no code changes. The functional test is the adoption gate itself.

## Validation plan

Run `python3 ../intent-preservation-system/scripts/validate_adoption_profile.py --root . --phase planning` and confirm exit code 0 with no `ERROR:` lines; record the output in `../12_validation/VAL-TASK-001-bootstrap-service.md`.

## Gate commands

Run the adoption gate from the repository root to confirm every artifact is complete before merging:

```bash
python3 ../intent-preservation-system/scripts/validate_adoption_profile.py --root . --phase planning
```

## Documentation updates

`README.md`, `BUSINESS.md`, `SYSTEM.md` (unchanged), `AGENTS.md`, `AGENT_OPERATIONS.md`, `TASKS.md`, `STATE.json`, `docs/17_governance/PROJECT_INVARIANTS.md`, `docs/06_architecture/INTEGRATION_CONTRACT.md`, `docs/orchestrator/VALIDATION_DEBT.md`, and this bootstrap chain.

## Rollback plan

Revert the commit (`git revert`) if the adoption profile is later found to misrepresent a real integration; no runtime or deployment rollback is needed since no runtime artifact changed.

## Handoff

Complete. Final integration owner: project owner. No further action required for this task; TASK-LOG-005 (unrelated ingest-credential work) remains open and tracked separately in `TASKS.md`.

## Completion checklist

- [x] Protected intent approved
- [x] Adoption profile valid
- [x] Integration decisions complete
- [x] Implementation and tests complete (documentation-only; not applicable)
- [x] Required integrations exercised (auth, payments, docs-rag, monitoring decisions documented with real evidence pointers)
- [x] Deployment dry run passes (no deployment required for a docs-only change)
- [x] Validation report complete
