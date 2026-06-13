# AI Agent Rules

```yaml
id: AI-AGENT-RULES
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../AGENTS.md
  - ../00_constitution/CONSTITUTION.md
```

## Required Work Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Context Package -> Code -> Validation.

## Allowed Actions

Agents may create mutable IPS artifacts, update task and validation documents, run read-only inspection commands, run local validation, and propose code changes scoped by an execution plan.

## Forbidden Actions

Agents must not edit `../BUSINESS.md`, invent approvals, push git without human review, delete log files, expose secrets, change APIs without ecosystem review, or deploy after a failed health check.

## Before Coding

Verify that a task, execution plan, goal-impact record, validation criteria, invariant impact, sensitive-data classification, contract impact, and required gates are present.

## Final Report

Report files changed, documents created, missing sections filled, remaining review requirements, validation evidence, and deviations from the execution plan.
