# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 (Phase C) for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.

SERVICE_NAME="logging-microservice"
PORT="3367"

IMAGES=(
  "logging-microservice|.||"
)

DEPLOYMENTS=(
  "logging-microservice|app|logging-microservice"
)

# Real script's order is pvc -> configmap -> external-secret -> service ->
# ingress -> deployment (deployment last, unlike the usual convention) —
# preserved exactly rather than reordered to the common case.
MANIFESTS=(pvc.yaml configmap.yaml external-secret.yaml service.yaml ingress.yaml deployment.yaml)
