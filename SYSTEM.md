# SYSTEM.md — logging-microservice

## Stack
- Runtime: NestJS (Node 24-slim)
- Log rotation: Winston daily-rotate-file (file-based)
- Stage: production

## Port & Domain
- Port: `3367`
- Domain: https://logging.alfares.cz

## Kubernetes
- Namespace: `statex-apps`
- Deployment: `logging-microservice` (1 replica, RollingUpdate)
- Image: `localhost:5000/logging-microservice:latest`
- ConfigMap: `logging-microservice-config`
- ExternalSecret: `logging-microservice-secret` → Vault `secret/prod/logging-microservice` (sync every 5 min)
- Service: ClusterIP :3367
- Ingress: logging.alfares.cz — TLS via cert-manager (letsencrypt-prod), secret `logging-microservice-tls`

## Environment Variables (ConfigMap — non-secret)
| Variable | Value |
|----------|-------|
| NODE_ENV | production |
| SERVICE_NAME | logging-microservice |
| PORT | 3367 |
| LOG_LEVEL | info |
| LOG_STORAGE_PATH | ./logs |
| LOG_ROTATION_MAX_SIZE | 100m |
| LOG_ROTATION_MAX_FILES | 10 |
| LOG_TIMESTAMP_FORMAT | YYYY-MM-DD HH:mm:ss |
| CORS_ORIGIN | * |
| AUTH_SERVICE_URL | http://host.k3s.internal:3370 (transitional until auth migrates to K8s) |
| PAYMENT_SERVICE_URL | http://host.k3s.internal:3468 (transitional) |

## Secrets (Vault → ExternalSecret → K8s Secret)
| Variable | Vault path |
|----------|-----------|
| PAYMENT_API_KEY | secret/prod/logging-microservice |
| PAYMENT_APPLICATION_ID | secret/prod/logging-microservice |
| PAYMENT_WEBHOOK_API_KEY | secret/prod/logging-microservice |

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/logs | Write a structured log entry |
| GET | /api/logs/query | Query logs with filters |
| GET | /api/logs/services | List known services |
| GET | /health | Health check |

## Internal Service URL
Within `statex-apps` namespace: `http://logging-microservice:3367`
Cross-namespace: `http://logging-microservice.statex-apps.svc.cluster.local:3367`

## Integrations
- Depended on by all ecosystem services via `LOGGING_SERVICE_URL`
- Auth service: `http://host.k3s.internal:3370` (transitional, uses host.k3s.internal until migrated)
- Payment service: `http://host.k3s.internal:3468` (transitional)
