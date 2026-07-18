# Documentation Completeness Standard

```yaml
id: DOCUMENTATION-COMPLETENESS-STANDARD
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
```

## Purpose

Documents must make scope, traceability, validation, and incomplete information explicit so AI-assisted work does not proceed from vague intent.

## Completeness Levels

`missing`, `skeletal`, `partial`, `complete`, and `validated` describe whether a document exists, has useful content, includes required sections, and has been reviewed.

## Required Metadata

Major documents should include id, status, owner, created, last_updated, completeness_level, upstream links, downstream links where useful, and related ADRs where applicable.

## Missing Information Marker

Use a bracketed missing-information marker only when a required fact cannot be derived from approved sources. Resolve those markers before deployment-readiness evidence is accepted.

## Agent Fill-In Rule

AI agents may fill mutable documents only from approved upstream sources and must not change immutable or human-owned documents.

## Required Sections

Task, execution plan, goal-impact, context package, prompt, and validation documents must include scope, traceability, constraints, validation, and evidence sections matching the installed IPS gate scripts.

## Audit Output Requirements

Audit tools should report missing documents, missing sections, placeholder sections, unknown traceability, missing goal impact, and suggested remediation.
