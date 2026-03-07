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
#
# Note: deploy-smart checks container ports; logging frontend uses container port 80.
# If you see "[INFO] Port 80 is in use by healthy container nginx-microservice, skipping",
# that is from nginx-microservice and is harmless. To suppress it, nginx-microservice
# would need a small change (containers.sh: skip logging when port 80/443 and container is nginx-microservice).

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

# Pull from remote in production; preserve local changes (stash uncommitted if any, then reapply).
# Only sync if NODE_ENV is set to "production"
if [ -d ".git" ]; then
    if [ "$NODE_ENV" = "production" ]; then
        echo -e "${BLUE}Production environment detected (NODE_ENV=production)${NC}"
        echo -e "${BLUE}Pulling from remote (local changes preserved)...${NC}"
        git fetch origin
        BRANCH=$(git rev-parse --abbrev-ref HEAD)
        STASHED=0
        if [ -n "$(git status --porcelain)" ]; then
            git stash push -u -m "deploy.sh: stash before pull"
            STASHED=1
        fi
        git pull origin "$BRANCH"
        if [ "$STASHED" = "1" ]; then
            git stash pop
        fi
        echo -e "${GREEN}✓ Repository updated from origin/$BRANCH (local changes preserved)${NC}"
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

if [ -d "/home/statex/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="/home/statex/nginx-microservice"
elif [ -d "/home/alfares/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="/home/alfares/nginx-microservice"
elif [ -d "/home/belunga/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="/home/belunga/nginx-microservice"
elif [ -d "$HOME/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="$HOME/nginx-microservice"
elif [ -d "$(dirname "$PROJECT_ROOT")/nginx-microservice" ]; then
    NGINX_MICROSERVICE_PATH="$(dirname "$PROJECT_ROOT")/nginx-microservice"
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
    echo "  - /home/belunga/nginx-microservice"
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

# Load .env for domain and ports
if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    # shellcheck source=/dev/null
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    set +a
fi

# Ports used by blue/green (host ports; must match docker-compose.blue.yml / docker-compose.green.yml)
PORT_BACKEND="${PORT:-3367}"
PORT_FRONTEND="${FRONTEND_PORT:-3372}"

# Free ports if occupied by our own containers (e.g. after a failed deploy or leftover containers)
if command -v docker >/dev/null 2>&1; then
    for c in logging-microservice-backend-blue logging-microservice-backend-green \
             logging-microservice-frontend-blue logging-microservice-frontend-green; do
        if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${c}$"; then
            echo -e "${YELLOW}Stopping and removing existing container: $c (to free port)${NC}"
            docker stop "$c" 2>/dev/null || true
            docker rm "$c" 2>/dev/null || true
        fi
    done
fi

# Check if required host ports are still in use by something else
check_port() {
    local port=$1
    if command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep -q ":${port}[[:space:]]" && return 0
    fi
    if command -v lsof >/dev/null 2>&1; then
        lsof -i ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1 && return 0
    fi
    return 1
}
if check_port "$PORT_BACKEND"; then
    echo -e "${RED}❌ Error: port $PORT_BACKEND is still in use. Stop the process using it and retry.${NC}"
    echo "  Example: ss -tlnp | grep $PORT_BACKEND   or   lsof -i :$PORT_BACKEND"
    exit 1
fi
if check_port "$PORT_FRONTEND"; then
    echo -e "${RED}❌ Error: port $PORT_FRONTEND is still in use. Stop the process using it and retry.${NC}"
    echo "  Example: ss -tlnp | grep $PORT_FRONTEND   or   lsof -i :$PORT_FRONTEND"
    exit 1
fi

# Remove nginx blue/green configs for this domain so they are regenerated from the registry.
# Otherwise "configs already exist" skips regeneration and we keep default landing (no frontend/backend).
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
    echo -e "${GREEN}║      ✅ Logging microservice deployment completed successfully!      ║${NC}"
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
    echo -e "${RED}║             ❌ Logging microservice deployment failed!               ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please check the error messages above and:"
    echo "  1. If you see 'address already in use' or 'port is already allocated' for port $PORT_BACKEND or $PORT_FRONTEND: run ./scripts/deploy.sh again (it stops existing containers first), or free the port: ss -tlnp | grep $PORT_BACKEND  or  ss -tlnp | grep $PORT_FRONTEND"
    echo "  2. Verify nginx-microservice is properly configured"
    echo "  3. Check service registry: $NGINX_MICROSERVICE_PATH/service-registry/$SERVICE_NAME.json"
    echo "  4. Review deployment logs (and container logs if health check fails)"
    echo "  5. Check service health: cd $NGINX_MICROSERVICE_PATH && ./scripts/blue-green/health-check.sh $SERVICE_NAME"
    exit 1
fi

