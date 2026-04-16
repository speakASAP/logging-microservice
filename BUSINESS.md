# Business: logging-microservice
>
> ⚠️ IMMUTABLE BY AI.

## Goal

Centralized structured logging for all Statex services. Every service logs here with timestamp + duration_ms.

## Constraints

- All logs must include `timestamp` (ISO 8601) and `duration_ms`
- Log retention: daily rotation
- AI must never delete log files

## Consumers

All services in the ecosystem.

## SLA

- Port: 3367 (<http://logging-microservice:3367>)
- Production: <https://logging.alfares.cz>
