# Project Graph Schema

## Purpose

The project graph records the minimum IPS traceability path for logging-microservice artifacts.

## Node Fields

- `id`: stable artifact identifier.
- `type`: artifact category.
- `path`: repository-relative path to the artifact.

## Edge Fields

- `from`: source node id.
- `type`: relationship type.
- `to`: target node id.

## Required Edge Types

- `implements`: task to feature or milestone.
- `impacts_goal`: task to vision or goal-impact node.
- `derives_from`: execution plan or prompt to upstream artifact.
- `generates`: execution plan to coding prompt.
- `constrained_by`: execution plan to ADR or architecture document.
- `included_in_context`: prompt to context package.
- `validates`: validation report to validated artifact.
