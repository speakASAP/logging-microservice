#!/bin/bash

# Logging Microservice Update Script
# Updates the service from git repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "Logging Microservice Update"
echo "=========================================="

cd "$PROJECT_DIR"

# Pull latest changes
echo "Pulling latest changes from git..."
git pull origin main || {
  echo "⚠️  Git pull failed or not a git repository"
  echo "Continuing with local update..."
}

# Rebuild if needed
echo "Rebuilding Docker image..."
docker compose build

# Restart service
echo "Restarting service..."
docker compose up -d

# Wait for service to be healthy
echo "Waiting for service to be healthy..."
sleep 5

# Load PORT from .env if available
if [ -f .env ]; then
  source .env
fi
PORT=${PORT:-3367}

# Check health
if docker compose exec -T logging-service wget --quiet --tries=1 --spider "http://localhost:${PORT}/health" 2>/dev/null; then
  echo "✅ Update complete - service is healthy"
else
  echo "⚠️  Health check failed, but service may still be starting..."
  echo "Check logs with: docker compose logs -f logging-service"
fi

echo "=========================================="

