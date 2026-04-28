# Deploy logging-microservice

Full guide: [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)

```bash
# Deploy (git pull → build → push to localhost:5000 → kubectl rollout)
./scripts/deploy.sh

# Rollback
kubectl rollout undo deployment/logging-microservice -n statex-apps

# Force Vault secret sync (ESO normally syncs every 5 min)
kubectl annotate externalsecret logging-microservice-secret -n statex-apps \
  force-sync=$(date +%s) --overwrite

# ConfigMap-only update (no image rebuild)
kubectl apply -f k8s/configmap.yaml
kubectl rollout restart deployment/logging-microservice -n statex-apps
```
