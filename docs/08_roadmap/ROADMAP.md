# Roadmap

```yaml
id: ROADMAP
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../01_vision/VISION.md
```

## Current Phase

Production service with IPS baseline adoption.

## Milestones

1. `../09_milestones/MS-001-ips-baseline.md`: Add IPS traceability, gates, and validation artifacts.
2. Verify production log rotation behavior.
3. Review and align API documentation with current DTO and runtime endpoints.
4. Evaluate durable log storage only through a new ADR and ecosystem review.

## Sequencing Rules

Documentation and execution plans must precede implementation. API changes must be reviewed against ecosystem dependency risk before deployment.
