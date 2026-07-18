#!/bin/bash
# deploy.sh — Kubernetes deployment for logging-microservice
# Usage: ./scripts/deploy.sh [image-tag]
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# shellcheck disable=SC1091
source "$(dirname "$PROJECT_ROOT")/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" 2>/dev/null \
  || source "$HOME/Documents/Github/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" \
  || { echo "Error: deploy timing library not found" >&2; exit 1; }
deploy_timing_init "logging-microservice"

SERVICE_NAME="logging-microservice"
NAMESPACE="statex-apps"
REGISTRY="localhost:5000"
HEALTH_PORT="${HEALTH_PORT:-3367}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
HEALTH_MAX_ATTEMPTS="${HEALTH_MAX_ATTEMPTS:-30}"
HEALTH_INTERVAL_SEC="${HEALTH_INTERVAL_SEC:-2}"
# Tag describes the WORKING TREE that is actually built, not just git HEAD:
# a tag derived from HEAD alone repeats itself when files changed without a
# commit, which makes `kubectl set image` a no-op and silently keeps the old
# image running.
compute_default_tag() {
  local head dirty root
  root="${PROJECT_ROOT:-$(pwd)}"
  head="$(git -C "$root" rev-parse --short HEAD 2>/dev/null || true)"
  if [ -z "$head" ]; then
    echo "build-$(date -u +%Y%m%d%H%M%S)"
    return
  fi
  dirty="$(git -C "$root" status --porcelain 2>/dev/null || true)"
  if [ -n "$dirty" ]; then
    echo "${head}-wt$(date -u +%Y%m%d%H%M%S)"
  else
    echo "$head"
  fi
}

DEFAULT_TAG=$(compute_default_tag)
IMAGE_TAG="${1:-$DEFAULT_TAG}"
IMAGE="${REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
IMAGE_LATEST="${REGISTRY}/${SERVICE_NAME}:latest"

# ═══════════════════════════════════════════════════════════
#  logging-microservice - Kubernetes Deployment
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════╗"
echo "║      Logging Microservice - Kubernetes Deployment      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# No git fetch/pull/stash here on purpose: the deploy ships exactly the code
# in $PROJECT_ROOT. Pulling would replace the tree being tested with origin.

deploy_timing_phase_start "Build image"
echo -e "${YELLOW}Building image: ${IMAGE}...${NC}"
docker build -t "$IMAGE" -t "$IMAGE_LATEST" "$PROJECT_ROOT"
echo -e "${GREEN}✅ Image built${NC}"
deploy_timing_phase_end "Build image"

deploy_timing_phase_start "Push image"
echo -e "${YELLOW}Pushing to registry...${NC}"
docker push "$IMAGE"
docker push "$IMAGE_LATEST"
echo -e "${GREEN}✅ Image pushed: ${IMAGE}${NC}"
deploy_timing_phase_end "Push image"

deploy_timing_phase_start "Apply K8s manifests"
echo -e "${YELLOW}Applying K8s manifests...${NC}"
kubectl apply -f "$PROJECT_ROOT/k8s/pvc.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/configmap.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/external-secret.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/service.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/ingress.yaml"
kubectl apply -f "$PROJECT_ROOT/k8s/deployment.yaml"
deploy_timing_phase_end "Apply K8s manifests"

deploy_timing_phase_start "Update K8s deployment"
echo -e "${YELLOW}Updating K8s deployment...${NC}"
kubectl set image deployment/${SERVICE_NAME} \
  app="${IMAGE}" \
  -n "${NAMESPACE}"
deploy_timing_phase_end "Update K8s deployment"

deploy_timing_phase_start "Wait for rollout"
deploy_timing_k8s_rollout_wait kubectl "$SERVICE_NAME" "$NAMESPACE"
echo -e "${GREEN}✅ Rollout complete${NC}"
deploy_timing_phase_end "Wait for rollout"

deploy_timing_phase_start "Health check"
echo -e "${YELLOW}Verifying health (http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH})...${NC}"
attempt=1
while [ "${attempt}" -le "${HEALTH_MAX_ATTEMPTS}" ]; do
  POD=$(kubectl get pod -n "${NAMESPACE}" \
    -l "app=${SERVICE_NAME}" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [ -z "${POD}" ]; then
    echo -e "${RED}❌ No pod found for ${SERVICE_NAME}${NC}"
    exit 1
  fi
  if kubectl exec -n "${NAMESPACE}" "${POD}" -- node -e \
    "fetch('http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
    2>/dev/null; then
    echo -e "${GREEN}✅ Health check OK${NC}"
    break
  fi
  if [ "${attempt}" -eq "${HEALTH_MAX_ATTEMPTS}" ]; then
    echo -e "${RED}❌ Health check failed after ${HEALTH_MAX_ATTEMPTS} attempts (~$((HEALTH_MAX_ATTEMPTS * HEALTH_INTERVAL_SEC))s)${NC}"
    echo -e "${YELLOW}Last exec error:${NC}"
    kubectl exec -n "${NAMESPACE}" "${POD}" -- node -e \
      "fetch('http://127.0.0.1:${HEALTH_PORT}${HEALTH_PATH}').then(r=>{console.log('HTTP',r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e);process.exit(1)})" \
      || true
    exit 1
  fi
  echo -e "${YELLOW}   attempt ${attempt}/${HEALTH_MAX_ATTEMPTS}, retry in ${HEALTH_INTERVAL_SEC}s...${NC}"
  sleep "${HEALTH_INTERVAL_SEC}"
  attempt=$((attempt + 1))
done
echo -e ""
deploy_timing_phase_end "Health check"

deploy_timing_finish_success "Logging Microservice"
echo "Image:    ${IMAGE}"
echo "Namespace: ${NAMESPACE}"
echo "Pods:     $(kubectl get pods -n ${NAMESPACE} -l app=${SERVICE_NAME} --no-headers | wc -l) running"
DEPLOY_TIMING_FINISHED=1
exit 0
