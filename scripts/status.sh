#!/bin/bash

# Logging Microservice Status Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "=========================================="
echo "Logging Microservice Status"
echo "=========================================="

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^logging-microservice$"; then
  echo "✅ Container is running"
  
  # Check health
  if docker compose exec -T logging-service wget --quiet --tries=1 --spider http://localhost:3009/health 2>/dev/null; then
    echo "✅ Health check passed"
  else
    echo "⚠️  Health check failed"
  fi
  
  # Show container info
  echo ""
  echo "Container Information:"
  docker ps --filter "name=logging-microservice" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  
  # Check network
  if docker network inspect nginx-network >/dev/null 2>&1; then
    if docker network inspect nginx-network | grep -q "logging-microservice"; then
      echo "✅ Connected to nginx-network"
    else
      echo "⚠️  Not connected to nginx-network"
    fi
  else
    echo "⚠️  nginx-network not found"
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

