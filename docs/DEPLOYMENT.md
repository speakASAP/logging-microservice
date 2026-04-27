# Deployment Guide — logging-microservice

## Overview

`logging-microservice` runs as a Kubernetes Deployment in the `statex-apps` namespace.
Secrets are managed via HashiCorp Vault → External Secrets Operator → Kubernetes Secret.
TLS is handled automatically by cert-manager (Let's Encrypt).

## Architecture

| Component | Value |
|-----------|-------|
| Namespace | `statex-apps` |
| Deployment | `logging-microservice` (1 replica, RollingUpdate) |
| Image | `localhost:5000/logging-microservice:latest` |
| Service | ClusterIP :3367 |
| Ingress | logging.alfares.cz (TLS via cert-manager) |
| ConfigMap | `logging-microservice-config` |
| K8s Secret | `logging-microservice-secret` (synced from Vault) |

## Kubernetes Manifests

| File | Purpose |
|------|---------|
| `k8s/deployment.yaml` | Deployment spec (replicas, image, probes, resources) |
| `k8s/service.yaml` | ClusterIP Service :3367 |
| `k8s/ingress.yaml` | Ingress for logging.alfares.cz with TLS |
| `k8s/configmap.yaml` | Non-secret environment variables |
| `k8s/external-secret.yaml` | Vault → K8s Secret sync definition |

Apply all at once:
```bash
kubectl apply -f k8s/ -n statex-apps
```

## Secrets (Vault)

**Production secrets are never stored in `.env` files, ConfigMaps, or code.**
All secrets live at `secret/prod/logging-microservice` in Vault and are synced automatically.

| Variable | Purpose |
|----------|---------|
| PAYMENT_API_KEY | Payment provider authentication |
| PAYMENT_APPLICATION_ID | Payment provider app ID |
| PAYMENT_WEBHOOK_API_KEY | Webhook signature verification |

External Secrets Operator syncs every 5 minutes. To force immediate sync:
```bash
kubectl annotate externalsecret logging-microservice-secret -n statex-apps \
  force-sync=$(date +%s) --overwrite
```

Verify sync status:
```bash
kubectl describe externalsecret logging-microservice-secret -n statex-apps
kubectl get secret logging-microservice-secret -n statex-apps
```

## Non-secret Configuration

All non-secret config is in `k8s/configmap.yaml`. To update a config value:
```bash
# Edit k8s/configmap.yaml, then:
kubectl apply -f k8s/configmap.yaml
kubectl rollout restart deployment/logging-microservice -n statex-apps
kubectl rollout status deployment/logging-microservice -n statex-apps
```

## Deploying

```bash
# Full deploy: git pull → build → push to localhost:5000 → kubectl rollout
./scripts/deploy.sh

# Deploy a specific tag
./scripts/deploy.sh v1.2.3
```

The script handles: git sync (production), docker build, push to localhost:5000, kubectl set image, rollout wait, health check.

## Rollback

```bash
kubectl rollout undo deployment/logging-microservice -n statex-apps
kubectl rollout status deployment/logging-microservice -n statex-apps
```

## Monitoring & Logs

```bash
# Live pod logs
kubectl logs -f deploy/logging-microservice -n statex-apps

# Pod status and restarts
kubectl get pods -n statex-apps -l app=logging-microservice

# Pod details and events (useful for startup failures)
kubectl describe pod -n statex-apps -l app=logging-microservice

# External health check
curl https://logging.alfares.cz/health

# Resource usage
kubectl top pod -n statex-apps -l app=logging-microservice
```

Log files rotate daily on the pod filesystem (`/app/logs`). Retention: 10 files × 100 MB max each.

## Integration — Service URL

Other services call this service via:
```
# Within statex-apps namespace
http://logging-microservice:3367/api/logs

# Cross-namespace
http://logging-microservice.statex-apps.svc.cluster.local:3367/api/logs
```

Set `LOGGING_SERVICE_URL=http://logging-microservice:3367` in the calling service's ConfigMap.

## Local Development

Docker Compose is for local development only — not used in production.

```bash
cp .env.example .env
# Fill in dev values (get from Vault: secret/prod/logging-microservice)
docker compose up -d
docker compose logs -f logging-service
```

## Troubleshooting

| Problem | Command |
|---------|---------|
| Pod not starting | `kubectl describe pod -n statex-apps -l app=logging-microservice` |
| Secret not synced from Vault | `kubectl describe externalsecret logging-microservice-secret -n statex-apps` |
| Ingress not routing | `kubectl describe ingress logging-microservice -n statex-apps` |
| TLS cert not issued | `kubectl describe certificate logging-microservice-tls -n statex-apps` |
| Image pull error | Check `localhost:5000` registry; re-run `./scripts/deploy.sh` |
| Logs endpoint 500 | `kubectl logs deploy/logging-microservice -n statex-apps --previous` |

## Production Checklist

Before deploying:
- [ ] `k8s/configmap.yaml` updated with any new non-secret vars
- [ ] New secrets added to Vault at `secret/prod/logging-microservice`
- [ ] `k8s/external-secret.yaml` updated if new secret keys added
- [ ] Build succeeds locally: `docker build -t test .`
- [ ] `/health` returns 200 after rollout
