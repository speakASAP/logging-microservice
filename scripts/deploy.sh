#!/bin/bash
# Logging Microservice Deployment Script
# Deploys the logging microservice to production using the
# nginx-microservice blue/green deployment system.
#
# - Uses: nginx-microservice/scripts/blue-green/deploy-smart.sh
# - SSL: Let's Encrypt (not self-signed). ensure-infrastructure.sh requests
#   a real certificate via certbot when a temporary cert is present. Set
#   CERTBOT_EMAIL in nginx-microservice/.env for Let's Encrypt contact.
#
# The script automatically detects the nginx-microservice location and
# calls the deploy-smart.sh script to perform the deployment.

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load NODE_ENV from .env file to determine environment
NODE_ENV=""
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    set +a
    NODE_ENV="${NODE_ENV:-}"
fi

# Deploy only code from repository: sync with remote (discard local changes on server)
# Only sync if NODE_ENV is set to "production"
if [ -d ".git" ]; then
    if [ "$NODE_ENV" = "production" ]; then
        echo -e "${BLUE}Production environment detected (NODE_ENV=production)${NC}"
        echo -e "${BLUE}Syncing with remote repository (discarding local changes)...${NC}"
        git fetch origin
        BRANCH=$(git rev-parse --abbrev-ref HEAD)
        git reset --hard "origin/$BRANCH"
        echo -e "${GREEN}✓ Repository synced to origin/$BRANCH${NC}"
        echo ""
    else
        echo -e "${YELLOW}Development environment detected (NODE_ENV=${NODE_ENV:-not set})${NC}"
        echo -e "${YELLOW}Skipping git sync - local changes will be preserved${NC}"
        echo ""
    fi
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Logging Microservice - Production Deployment       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Service name and display name (first letter uppercase for messages)
SERVICE_NAME="logging-microservice"
DISPLAY_NAME="$(echo "${SERVICE_NAME:0:1}" | tr 'a-z' 'A-Z')${SERVICE_NAME:1}"

# Detect nginx-microservice path
# Try common production paths first, then fallback to relative path
NGINX_MICROSERVICE_PATH=""

# Check common production paths
if [ -d "/home/statex/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="/home/statex/nginx-microservice"
elif [ -d "/home/alfares/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="/home/alfares/nginx-microservice"
elif [ -d "/home/belunga/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="/home/belunga/nginx-microservice"
elif [ -d "$HOME/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="$HOME/nginx-microservice"
# Check if nginx-microservice is a sibling directory (for local dev)
elif [ -d "$(dirname "$PROJECT_ROOT")/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="$(dirname "$PROJECT_ROOT")/nginx-microservice"
# Check if nginx-microservice is in the same directory
elif [ -d "$PROJECT_ROOT/../nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="$(cd "$PROJECT_ROOT/../nginx-microservice" && pwd)"
fi

# Validate nginx-microservice path
if [ -z "$NGINX_MICROSERVICE_PATH" ] || [ ! -d "$NGINX_MICROSERVICE_PATH" ]; then
    echo -e "${RED}❌ Error: nginx-microservice not found${NC}"
    echo ""
    echo "Please ensure nginx-microservice is installed in one of these locations:"
    echo "  - /home/statex/nginx-microservice"
    echo "  - /home/alfares/nginx-microservice"
    echo "  - $HOME/nginx-microservice"
    echo "  - $(dirname "$PROJECT_ROOT")/nginx-microservice (sibling directory)"
    echo ""
    echo "Or set NGINX_MICROSERVICE_PATH environment variable:"
    echo "  export NGINX_MICROSERVICE_PATH=/path/to/nginx-microservice"
    exit 1
fi

# Check if deploy-smart.sh exists
DEPLOY_SCRIPT="$NGINX_MICROSERVICE_PATH/scripts/blue-green/deploy-smart.sh"
if [ ! -f "$DEPLOY_SCRIPT" ]; then
    echo -e "${RED}❌ Error: deploy-smart.sh not found at $DEPLOY_SCRIPT${NC}"
    exit 1
fi

# Check if deploy-smart.sh is executable
if [ ! -x "$DEPLOY_SCRIPT" ]; then
    echo -e "${YELLOW}⚠️  Making deploy-smart.sh executable...${NC}"
    chmod +x "$DEPLOY_SCRIPT"
fi

echo -e "${GREEN}✅ Found nginx-microservice at: $NGINX_MICROSERVICE_PATH${NC}"
echo -e "${GREEN}✅ Deploying service: $SERVICE_NAME${NC}"
echo ""

# If registry has wrong shape (single service with container_name_base = service name),
# remove it so deploy-smart.sh will auto-create from docker-compose (any structure).
REGISTRY_FILE="$NGINX_MICROSERVICE_PATH/service-registry/$SERVICE_NAME.json"
if [ -f "$REGISTRY_FILE" ] && command -v jq >/dev/null 2>&1; then
    SERVICE_KEYS=$(jq -r '.services | keys[]' "$REGISTRY_FILE" 2>/dev/null | wc -l)
    SINGLE_BASE=$(jq -r '.services | to_entries | if length == 1 then .[0].value.container_name_base // empty else empty end' "$REGISTRY_FILE" 2>/dev/null || echo "")
    if [ "$SERVICE_KEYS" -eq 1 ] && [ -n "$SINGLE_BASE" ] && [ "$SINGLE_BASE" = "$SERVICE_NAME" ]; then
        echo -e "${YELLOW}Resetting outdated single-container registry; deploy-smart will recreate from docker-compose.${NC}"
        rm -f "$REGISTRY_FILE"
    fi
fi

# Remove nginx blue/green configs for this domain so they are regenerated from the registry.
# Otherwise "configs already exist" skips regeneration and we keep default landing (no frontend/backend).
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    set +a
fi
DEPLOY_DOMAIN="${DOMAIN:-logging.sgipreal.com}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN#https://}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN#http://}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN%%/*}"
NGINX_BLUE_GREEN_DIR="$NGINX_MICROSERVICE_PATH/nginx/conf.d/blue-green"
for f in "${NGINX_BLUE_GREEN_DIR}/${DEPLOY_DOMAIN}.blue.conf" "${NGINX_BLUE_GREEN_DIR}/${DEPLOY_DOMAIN}.green.conf"; do
    if [ -f "$f" ]; then
        echo -e "${YELLOW}Removing $f so it is regenerated with frontend/backend.${NC}"
        rm -f "$f"
    fi
done

# Change to nginx-microservice directory and run deployment
echo -e "${YELLOW}Starting blue/green deployment...${NC}"
echo ""

cd "$NGINX_MICROSERVICE_PATH"

# Execute the deployment script
if "$DEPLOY_SCRIPT" "$SERVICE_NAME"; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ ${DISPLAY_NAME} deployment completed successfully!               ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "The logging microservice has been deployed using blue/green deployment."
    echo "Check the status with:"
    echo "  cd $NGINX_MICROSERVICE_PATH"
    echo "  ./scripts/status-all-services.sh"
    exit 0
else
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ ${DISPLAY_NAME} deployment failed!                                ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please check the error messages above and:"
    echo "  1. Verify nginx-microservice is properly configured"
    echo "  2. Check service registry: $NGINX_MICROSERVICE_PATH/service-registry/$SERVICE_NAME.json"
    echo "  3. Review deployment logs (and container logs if health check fails)"
    echo "  4. Check service health: cd $NGINX_MICROSERVICE_PATH && ./scripts/blue-green/health-check.sh $SERVICE_NAME"
    exit 1
fi

