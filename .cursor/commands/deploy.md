# Deploy logging-microservice to Production

## Prerequisites
- SSH access to the production server (k3s cluster)
- `kubectl` configured for the `statex-apps` namespace
- Docker daemon running with `localhost:5000` registry accessible

## Deployment

Run from the project root on the production server:

```bash
./scripts/deploy.sh
```

This script performs:
1. `git pull` (production only)
2. `docker build` multi-stage → tagged `localhost:5000/logging-microservice:latest`
3. `docker push localhost:5000/logging-microservice:latest`
4. `kubectl set image deployment/logging-microservice logging-microservice=localhost:5000/logging-microservice:latest -n statex-apps`
5. `kubectl rollout status deployment/logging-microservice -n statex-apps`
6. Health check: `curl /health`

## Secrets Management

All secrets are managed via **HashiCorp Vault** — never in `.env` files or source code.

- Vault path: `secret/prod/logging-microservice`
- External Secrets Operator syncs to K8s Secret `logging-microservice-secret` every 5 minutes
- To add/rotate a secret: update in Vault; ESO auto-syncs within 5 min
- Force immediate sync if needed:
  ```bash
  kubectl annotate externalsecret logging-microservice-secret -n statex-apps \
    force-sync=$(date +%s) --overwrite
  ```

## Non-secret Configuration

Lives in `k8s/configmap.yaml`. To update:

```bash
kubectl apply -f k8s/configmap.yaml
kubectl rollout restart deployment/logging-microservice -n statex-apps
```

## Monitoring

```bash
kubectl logs -f deploy/logging-microservice -n statex-apps
kubectl get pods -n statex-apps -l app=logging-microservice
curl https://logging.alfares.cz/health
```

## Rollback

```bash
kubectl rollout undo deployment/logging-microservice -n statex-apps
kubectl rollout status deployment/logging-microservice -n statex-apps
```
