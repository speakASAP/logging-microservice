# Sensitive Data Policy

```yaml
id: SENSITIVE-DATA-POLICY
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
```

## Purpose

IPS artifacts, examples, tests, prompts, logs, screenshots, and reports must be safe to review and replay without exposing secrets or production data.

## Forbidden Content

Do not include passwords, API keys, access tokens, client secrets, private keys, session cookies, raw production records, raw customer messages, authorization headers, real identifiers, confidential URLs, or unmasked production screenshots.

## Allowed Test Material

Use synthetic names such as `SERVICE_SYNTHETIC_001`, `TASK_SYNTHETIC_001`, `TENANT_SYNTHETIC_001`, placeholder URLs under `https://example.invalid/`, and empty environment variable examples.

## Classification

- `none`: no data-bearing material.
- `synthetic`: artificial examples only.
- `masked`: real structure with identifiers removed.
- `sensitive`: confidential or production-derived material; do not include in AI-visible artifacts.

## Gate Behavior

Sensitive-data findings block pre-coding or deployment-readiness evidence until removed, masked, or approved by a security owner outside AI-generated artifacts.
