#!/bin/bash

# Logging Microservice Status Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=========================================="
echo "Logging Microservice Status"
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
  source .env
fi
SERVICE_NAME=${SERVICE_NAME:-logging-microservice}
PORT=${PORT:-3367}
NGINX_NETWORK_NAME=${NGINX_NETWORK_NAME:-nginx-network}

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^${SERVICE_NAME}$"; then
  echo "✅ Container is running"
  
  # Check health
  if docker compose exec -T logging-service wget --quiet --tries=1 --spider "http://localhost:${PORT}/health" 2>/dev/null; then
    echo "✅ Health check passed"
  else
    echo "⚠️  Health check failed"
  fi
  
  # Show container info
  echo ""
  echo "Container Information:"
  docker ps --filter "name=${SERVICE_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  
  # Check network
  if docker network inspect ${NGINX_NETWORK_NAME} >/dev/null 2>&1; then
    if docker network inspect ${NGINX_NETWORK_NAME} | grep -q "${SERVICE_NAME}"; then
      echo "✅ Connected to ${NGINX_NETWORK_NAME}"
    else
      echo "⚠️  Not connected to ${NGINX_NETWORK_NAME}"
    fi
  else
    echo "⚠️  ${NGINX_NETWORK_NAME} not found"
  fi
  
else
  echo "❌ Container is not running"
  echo "Start with: docker compose up -d"
fi

echo ""
echo "Recent logs (last 20 lines):"
docker compose logs --tail=20 logging-service

echo ""
echo "=========================================="

