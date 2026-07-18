# Agent Gap Filling Rules

```yaml
id: AGENT-GAP-FILLING-RULES
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../23_documentation_contracts/DOCUMENTATION_COMPLETENESS_STANDARD.md
```

## Purpose

Agents must not silently proceed through incomplete documentation.

## Allowed Actions

Agents may add missing sections to mutable documents, create draft task-supporting artifacts, and add explicit review markers when information cannot be derived from approved sources.

## Forbidden Actions

Agents must not modify `../BUSINESS.md`, invent business goals, invent approvals, remove traceability, skip execution plans, skip validation, or expose sensitive data.

## Remediation Process

Identify document type, compare required headings, fill derivable content from approved sources, leave unresolved facts explicit, update completeness metadata, and report the change.
