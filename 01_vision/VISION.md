# Vision Document

```yaml
id: VISION
status: approved
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - ../BUSINESS.md
  - ../README.md
  - ../SYSTEM.md
```

## One-Sentence Vision

Provide centralized structured logging for all Statex services with reliable ingestion, query support, safe admin access, and explicit duration and timestamp traceability.

## Problem Statement

The ecosystem needs one logging service that every microservice can call without each service inventing its own log format, storage behavior, or operational lookup path. Fragmented logging would make incident review, timeout diagnosis, and cross-service behavior analysis slower and less reliable.

## Target Users

- Statex services that emit structured logs.
- Operators who inspect health, rollout, and service behavior.
- Authorized administrators who query stored logs.
- AI agents that need safe, traceable context for maintenance tasks.

## Core User Need

Callers need a stable logging API that records service name, log level, message, timestamp, and duration information while keeping read access protected and avoiding sensitive-data leakage.

## Key Outcomes

1. All services can send structured logs to `POST /api/logs`.
2. Health and service information endpoints remain lightweight and dependable.
3. Admin log query endpoints require approved authorization roles.
4. File-based logs rotate daily and are never manually deleted by AI agents.
5. Documentation and implementation changes remain traceable through IPS tasks and validation reports.

## Non-Goals

- This service is not a general analytics warehouse.
- This service is not the system of record for business entities.
- This service is not a place to store secrets, raw customer data, or authorization headers.
- This service does not guarantee durable long-term retention beyond its documented file rotation and pod filesystem constraints.

## Success Criteria

- Runtime health returns success on port `3367`.
- Structured log ingestion accepts supported log levels and required service identity.
- Query and service listing endpoints are protected by admin roles.
- Documentation identifies API, storage, sensitive-data, and deployment constraints.
- IPS gates can audit task traceability before coding work begins.

## Product Philosophy

Prefer stable contracts, operational clarity, and safe failure behavior over broad logging features. Callers should use short logging timeouts and local fallback behavior so this dependency never blocks their core request flow.
