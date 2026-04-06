# System: logging-microservice

## Architecture

NestJS + Winston. File-based storage with daily rotation. Web admin panel.

- Log format: `{service, level, msg, timestamp, duration_ms, metadata}`
- Endpoints: `POST /log`, `GET /logs`, `GET /logs?service=X&level=ERROR`

## Integrations

| Dependency | URL |
|-----------|-----|
| database-server | db-server-postgres:5432 |

## Current State
<!-- AI-maintained -->
Stage: production

## Known Issues
<!-- AI-maintained -->
- None
